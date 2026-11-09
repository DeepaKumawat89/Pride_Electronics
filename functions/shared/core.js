const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore')
const { defineSecret } = require('firebase-functions/params')
const { HttpsError, onCall, onRequest } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
const { isAdmin, requireAdmin, requireUser } = require('../authz')
const {
  calculateOrderQuote,
  itemSignature,
  normalizePaymentConfiguration,
  normalizeRequestedItems,
  payableAmountPaiseForQuote,
  razorpayEnvironmentForKey,
  roundMoney,
  validateMinimumOrderQuantities,
} = require('../checkout')
const {
  removePurchasedCartItems,
  sanitizeAccountState,
} = require('../account-state')
const {
  createInvoiceSnapshot,
  normalizeInvoiceSettings,
  validateInvoiceSettings,
  validateInvoiceSnapshot,
} = require('../invoice')
const { normalizeGstProfile, stateCodeFor } = require('../gst')

initializeApp()

const db = getFirestore()
const adminAuth = getAuth()
const supplyTypeFor = (taxSettings = {}, shippingAddress = {}) => {
  const sellerGstin = String(taxSettings.gstin || '').trim().toUpperCase()
  const sellerStateCode = String(taxSettings.stateCode || sellerGstin.slice(0, 2)).trim()
  const placeOfSupplyStateCode = stateCodeFor(shippingAddress.state)
  if (!placeOfSupplyStateCode || !/^\d{2}$/.test(sellerStateCode) || sellerStateCode === '00') {
    throw new Error('A valid seller state and delivery state are required for GST calculation.')
  }
  return placeOfSupplyStateCode === sellerStateCode ? 'intra-state' : 'inter-state'
}

const requireActiveCustomer = async (request, { includeAuthUser = false } = {}) => {
  const uid = requireUser(request)
  const [authUser, profileDocument] = await Promise.all([
    adminAuth.getUser(uid),
    db.doc(`users/${uid}`).get(),
  ])
  const status = String(profileDocument.data()?.status || 'Active')
  if (
    authUser.disabled ||
    ['disabled', 'suspended'].includes(status.trim().toLowerCase())
  ) {
    throw new HttpsError(
      'permission-denied',
      'This customer account is disabled. Contact support for assistance.',
    )
  }
  return includeAuthUser ? { uid, authUser } : uid
}

const region = 'asia-south1'
const callableOptions = { region, invoker: 'public' }
const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID')
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET')
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET')
const razorpayCallableOptions = {
  ...callableOptions,
  secrets: [razorpayKeyId, razorpayKeySecret],
}
const PHONE_PATTERN = /^[6-9]\d{9}$/
const PIN_CODE_PATTERN = /^[1-9]\d{5}$/
const ORDER_REQUEST_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/
const RAZORPAY_ORDER_PATTERN = /^order_[a-zA-Z0-9]{6,100}$/
const RAZORPAY_PAYMENT_PATTERN = /^pay_[a-zA-Z0-9]{6,100}$/
const RAZORPAY_SIGNATURE_PATTERN = /^[a-fA-F0-9]{64}$/
const STOCK_RESERVATION_TTL_MS = 15 * 60 * 1000
const STOCK_RESERVATION_CLEANUP_LIMIT = 100
const STOCK_RESERVATION_CLEANUP_BATCHES = 10

const cleanObject = (value) => JSON.parse(JSON.stringify(value || {}))

const indiaCalendarParts = (dateValue = new Date()) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(dateValue))
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]),
)

const indiaOrderMoment = (dateValue = new Date()) => {
  const date = new Date(dateValue)
  const parts = indiaCalendarParts(date)
  return {
    timestamp: date.toISOString(),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
    }),
  }
}

const numberingPeriodsFor = (dateValue = new Date()) => {
  const parts = indiaCalendarParts(dateValue)
  const year = Number(parts.year)
  const month = Number(parts.month)
  const financialYearStart = month >= 4 ? year : year - 1
  const financialYear = `${String(financialYearStart).slice(-2)}-${String(financialYearStart + 1).slice(-2)}`
  return {
    calendarYear: String(year),
    financialYear,
  }
}

async function prepareNumberAllocation({
  transaction,
  type,
  period,
  prefix,
  orderField,
  now,
}) {
  const counterId = `${type}_${String(period).replace(/[^0-9A-Za-z_-]/g, '_')}`
  const counterReference = db.doc(`numberCounters/${counterId}`)
  const existingNumberQuery = db.collection('orders')
    .where(orderField, '>=', prefix)
    .where(orderField, '<=', `${prefix}\uf8ff`)
    .orderBy(orderField, 'desc')
    .limit(1)
  const [counterDocument, existingNumberDocuments] = await Promise.all([
    transaction.get(counterReference),
    transaction.get(existingNumberQuery),
  ])
  const existingValue = String(
    existingNumberDocuments.docs[0]?.data()?.[orderField] || '',
  )
  const existingSequence = existingValue.startsWith(prefix)
    ? Number(existingValue.slice(prefix.length))
    : 0
  const counterData = counterDocument.data() || {}
  const counterSequence = counterData.type === type && counterData.period === period
    ? Number(counterData.lastIssued || 0)
    : 0
  const sequence = Math.max(
    Number.isInteger(existingSequence) ? existingSequence : 0,
    Number.isInteger(counterSequence) ? counterSequence : 0,
  ) + 1
  if (sequence < 1 || sequence > 999999) {
    throw new HttpsError('resource-exhausted', `${type === 'order' ? 'Order' : 'Invoice'} number sequence is exhausted for ${period}.`)
  }
  return {
    reference: counterReference,
    value: `${prefix}${String(sequence).padStart(6, '0')}`,
    counter: {
      type,
      period,
      prefix,
      lastIssued: sequence,
      updatedAt: now,
      ...(counterDocument.exists ? {} : { createdAt: now }),
    },
  }
}

const razorpayAuthorization = () =>
  `Basic ${Buffer.from(`${razorpayKeyId.value()}:${razorpayKeySecret.value()}`).toString('base64')}`

const secureCompare = (received, expected) => {
  const receivedBuffer = Buffer.from(String(received || ''), 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

const normalizeOrderItems = (items) => {
  try {
    return normalizeRequestedItems(items)
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message)
  }
}

const variantForItem = (product, item) =>
  (Array.isArray(product?.variants) ? product.variants : []).find(
    (variant) => String(variant.id) === String(item?.variantId || ''),
  ) || null

const inventoryForItem = (product, item) =>
  item?.variantId ? variantForItem(product, item) : product

const syncVariantReservedStock = (product) => {
  if (!Array.isArray(product?.variants) || !product.variants.length) return product
  product.reservedStock = product.variants.reduce(
    (total, variant) => total + Number(variant.reservedStock || 0),
    0,
  )
  return product
}

const inventoryUpdateFor = (product, updatedAt) => (
  Array.isArray(product.variants) && product.variants.length
    ? { variants: product.variants, reservedStock: product.reservedStock, updatedAt }
    : { reservedStock: product.reservedStock, updatedAt }
)

const timestampMillis = (value) => {
  if (value && typeof value.toMillis === 'function') return value.toMillis()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

const reservationReferenceFor = (uid, requestId) =>
  db.doc(`stockReservations/${uid}_${requestId}`)

const checkoutError = (error) => {
  if (error?.code === 'product-unavailable') {
    return new HttpsError('failed-precondition', error.message)
  }
  if (error?.code === 'insufficient-stock') {
    return new HttpsError('resource-exhausted', error.message)
  }
  if (String(error?.code || '').startsWith('coupon-')) {
    return new HttpsError('failed-precondition', error.message)
  }
  if (error?.code === 'minimum-order-not-met') {
    return new HttpsError('failed-precondition', error.message)
  }
  if (error?.code === 'minimum-order-quantity-not-met') {
    return new HttpsError('failed-precondition', error.message)
  }
  return new HttpsError('invalid-argument', 'The checkout details are invalid.')
}

const validateShippingAddress = (value = {}) => {
  const address = cleanObject(value)
  const allowedTypes = ['Shipping', 'Billing']
  const normalized = {
    id: String(address.id || '').slice(0, 100),
    type: allowedTypes.includes(address.type) ? address.type : 'Shipping',
    label: String(address.label || 'Home').slice(0, 30),
    fullName: String(address.fullName || '').trim().slice(0, 100),
    phone: normalizePhone(address.phone),
    houseFlat: String(address.houseFlat || '').trim().slice(0, 150),
    street: String(address.street || '').trim().slice(0, 200),
    area: String(address.area || '').trim().slice(0, 150),
    line1: String(address.line1 || '').trim().slice(0, 500),
    landmark: String(address.landmark || '').trim().slice(0, 150),
    city: String(address.city || '').trim().slice(0, 100),
    state: String(address.state || '').trim().slice(0, 100),
    pincode: String(address.pincode || '').trim(),
  }
  if (
    !normalized.fullName ||
    !PHONE_PATTERN.test(normalized.phone) ||
    !normalized.line1 ||
    !normalized.city ||
    !normalized.state ||
    !PIN_CODE_PATTERN.test(normalized.pincode)
  ) {
    throw new HttpsError('invalid-argument', 'Select a valid delivery address.')
  }
  return normalized
}

const validateActiveCoupon = (coupon, usageCount = 0) => {
  if (!coupon || coupon.enabled === false) {
    throw new HttpsError('failed-precondition', 'The selected coupon is no longer valid.')
  }
  const currentTime = Date.now()
  if (
    (coupon.startDate && currentTime < new Date(`${coupon.startDate}T00:00:00`).getTime()) ||
    (coupon.endDate && currentTime > new Date(`${coupon.endDate}T23:59:59`).getTime())
  ) {
    throw new HttpsError('failed-precondition', 'The selected coupon is not active.')
  }
  if (
    Number(coupon.usageLimit) > 0 &&
    Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)
  ) {
    throw new HttpsError('failed-precondition', 'The selected coupon has reached its usage limit.')
  }
  if (
    Number(coupon.perUserLimit) > 0 &&
    Number(usageCount) >= Number(coupon.perUserLimit)
  ) {
    throw new HttpsError('failed-precondition', 'You have reached this coupon usage limit.')
  }
}

const formatOrderTotal = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)

const assertOwnedOrder = (snapshot, uid) => {
  if (!snapshot.exists) throw new HttpsError('not-found', 'Order not found.')
  if (snapshot.data().userId !== uid) {
    throw new HttpsError('permission-denied', 'This order belongs to another account.')
  }
  return snapshot.data()
}

const normalizePhone = (value) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(-10)

const validateProfile = (data = {}) => {
  const name = String(data.name || '').trim()
  const phone = normalizePhone(data.phone)
  if (name.length < 2 || name.length > 80) {
    throw new HttpsError('invalid-argument', 'Enter a valid full name.')
  }
  if (!PHONE_PATTERN.test(phone)) {
    throw new HttpsError('invalid-argument', 'Enter a valid mobile number.')
  }
  return {
    name,
    phone,
    dob: String(data.dob || '').slice(0, 10),
    gender: String(data.gender || '').slice(0, 30),
    photo: String(data.photo || '').slice(0, 2000),
  }
}


module.exports = {
  createHmac,
  randomUUID,
  FieldValue,
  Timestamp,
  db,
  adminAuth,
  HttpsError,
  onCall,
  onRequest,
  onSchedule,
  isAdmin,
  requireAdmin,
  requireUser,
  calculateOrderQuote,
  itemSignature,
  normalizePaymentConfiguration,
  normalizeRequestedItems,
  payableAmountPaiseForQuote,
  razorpayEnvironmentForKey,
  roundMoney,
  validateMinimumOrderQuantities,
  removePurchasedCartItems,
  sanitizeAccountState,
  createInvoiceSnapshot,
  normalizeInvoiceSettings,
  validateInvoiceSettings,
  validateInvoiceSnapshot,
  normalizeGstProfile,
  stateCodeFor,
  supplyTypeFor,
  requireActiveCustomer,
  region,
  callableOptions,
  razorpayKeyId,
  razorpayKeySecret,
  razorpayWebhookSecret,
  razorpayCallableOptions,
  PHONE_PATTERN,
  PIN_CODE_PATTERN,
  ORDER_REQUEST_PATTERN,
  RAZORPAY_ORDER_PATTERN,
  RAZORPAY_PAYMENT_PATTERN,
  RAZORPAY_SIGNATURE_PATTERN,
  STOCK_RESERVATION_TTL_MS,
  STOCK_RESERVATION_CLEANUP_LIMIT,
  STOCK_RESERVATION_CLEANUP_BATCHES,
  cleanObject,
  indiaCalendarParts,
  indiaOrderMoment,
  numberingPeriodsFor,
  prepareNumberAllocation,
  razorpayAuthorization,
  secureCompare,
  normalizeOrderItems,
  variantForItem,
  inventoryForItem,
  syncVariantReservedStock,
  inventoryUpdateFor,
  timestampMillis,
  reservationReferenceFor,
  checkoutError,
  validateShippingAddress,
  validateActiveCoupon,
  formatOrderTotal,
  assertOwnedOrder,
  normalizePhone,
  validateProfile,
}


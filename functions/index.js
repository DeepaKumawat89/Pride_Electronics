const { createHmac, timingSafeEqual } = require('node:crypto')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')
const { defineSecret } = require('firebase-functions/params')
const { HttpsError, onCall, onRequest } = require('firebase-functions/v2/https')
const { requireAdmin, requireUser } = require('./authz')
const {
  calculateOrderQuote,
  itemSignature,
  normalizePaymentConfiguration,
  normalizeRequestedItems,
  razorpayEnvironmentForKey,
} = require('./checkout')
const {
  removePurchasedCartItems,
  sanitizeAccountState,
} = require('./account-state')

initializeApp()

const db = getFirestore()
const adminAuth = getAuth()
const firebaseWebApiKey =
  process.env.FIREBASE_WEB_API_KEY ||
  'AIzaSyDF4djFtrqwozdqnPA0iOhhJ08PZvpCauc'
const region = 'asia-south1'
const callableOptions = { region, invoker: 'public' }
const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID')
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET')
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET')
const cashfreeClientId = defineSecret('CASHFREE_CLIENT_ID')
const cashfreeClientSecret = defineSecret('CASHFREE_CLIENT_SECRET')
const paymentCallableOptions = {
  ...callableOptions,
  secrets: [razorpayKeyId, razorpayKeySecret, cashfreeClientId, cashfreeClientSecret],
}
const PHONE_PATTERN = /^[6-9]\d{9}$/
const PIN_CODE_PATTERN = /^[1-8]\d{5}$/
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
const ORDER_REQUEST_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/
const RAZORPAY_ORDER_PATTERN = /^order_[a-zA-Z0-9]{6,100}$/
const RAZORPAY_PAYMENT_PATTERN = /^pay_[a-zA-Z0-9]{6,100}$/
const RAZORPAY_SIGNATURE_PATTERN = /^[a-fA-F0-9]{64}$/

const cleanObject = (value) => JSON.parse(JSON.stringify(value || {}))

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

async function loadCheckoutQuote(uid, requestedItems, data = {}) {
  const items = normalizeOrderItems(requestedItems)
  const productReferences = items.map((item) => db.doc(`products/${item.productId}`))
  const [productDocuments, shippingDocument, invoiceDocument] = await Promise.all([
    db.getAll(...productReferences),
    db.doc('settings/shipping').get(),
    db.doc('settings/invoice').get(),
  ])
  const products = productDocuments.map((document) => ({
    id: document.id,
    ...(document.exists ? document.data() : {}),
    enabled: document.exists && document.data().enabled !== false,
  }))
  const couponCode = String(data.couponCode || '').trim().toUpperCase()
  let coupon = null
  if (couponCode) {
    const result = await db.collection('coupons').where('code', '==', couponCode).limit(1).get()
    const couponDocument = result.docs[0]
    if (!couponDocument) validateActiveCoupon(null)
    coupon = { id: couponDocument.id, ...couponDocument.data() }
    const usage = await db.doc(`couponUsages/${couponDocument.id}_${uid}`).get()
    validateActiveCoupon(coupon, usage.data()?.count || 0)
  }
  try {
    return calculateOrderQuote({
      requestedItems: items,
      products,
      coupon,
      couponCode,
      shippingSettings: shippingDocument.data() || {},
      taxSettings: invoiceDocument.data()?.tax || {},
      deliveryId: data.deliveryId,
    })
  } catch (error) {
    throw checkoutError(error)
  }
}

const assertOwnedOrder = (snapshot, uid) => {
  if (!snapshot.exists) throw new HttpsError('not-found', 'Order not found.')
  if (snapshot.data().userId !== uid) {
    throw new HttpsError('permission-denied', 'This order belongs to another account.')
  }
  return snapshot.data()
}

const invoiceNumberFor = (numbering = {}, dateValue = new Date()) => {
  const date = new Date(dateValue)
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date
  const year = validDate.getFullYear()
  const financialYearStart = validDate.getMonth() >= 3 ? year : year - 1
  const financialYear = `${String(financialYearStart).slice(-2)}-${String(financialYearStart + 1).slice(-2)}`
  const sequence = String(Math.max(1, Number(numbering.nextNumber) || 1)).padStart(
    Math.max(1, Number(numbering.padding) || 1),
    '0',
  )
  return [
    numbering.prefix,
    numbering.includeFinancialYear ? financialYear : '',
    sequence,
    numbering.suffix,
  ].filter(Boolean).join('/')
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

exports.createUserProfile = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const profile = validateProfile(request.data)
  const authUser = await adminAuth.getUser(uid)
  if (!authUser.email) {
    throw new HttpsError('failed-precondition', 'An email address is required.')
  }

  const userReference = db.doc(`users/${uid}`)
  const phoneReference = db.doc(`_authPhoneIndex/${profile.phone}`)
  await db.runTransaction(async (transaction) => {
    const [existingProfile, existingPhone] = await Promise.all([
      transaction.get(userReference),
      transaction.get(phoneReference),
    ])
    if (existingProfile.exists) {
      throw new HttpsError('already-exists', 'The user profile already exists.')
    }
    if (existingPhone.exists && existingPhone.data().uid !== uid) {
      throw new HttpsError('already-exists', 'The phone number is already used.')
    }
    transaction.set(phoneReference, {
      uid,
      createdAt: FieldValue.serverTimestamp(),
    })
    transaction.set(userReference, {
      uid,
      name: profile.name,
      phone: profile.phone,
      phoneNormalized: profile.phone,
      email: authUser.email.toLowerCase(),
      emailVerified: authUser.emailVerified,
      role: 'customer',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  return { success: true }
})

exports.ensureGoogleUserProfile = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const authUser = await adminAuth.getUser(uid)
  const usesGoogle = authUser.providerData.some(
    (provider) => provider.providerId === 'google.com',
  )
  if (!usesGoogle || !authUser.email) {
    throw new HttpsError(
      'failed-precondition',
      'A verified Google account is required.',
    )
  }

  const name = String(authUser.displayName || 'Pride Customer')
    .trim()
    .slice(0, 80)
  const email = authUser.email.trim().toLowerCase()
  const photo = String(authUser.photoURL || '').slice(0, 2000)
  const userReference = db.doc(`users/${uid}`)

  await db.runTransaction(async (transaction) => {
    const userDocument = await transaction.get(userReference)
    if (!userDocument.exists) {
      transaction.set(userReference, {
        uid,
        name: name || 'Pride Customer',
        email,
        emailVerified: authUser.emailVerified,
        photo,
        role: 'customer',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      return
    }

    const currentProfile = userDocument.data()
    const requiredUpdates = {
      email,
      emailVerified: authUser.emailVerified,
      updatedAt: FieldValue.serverTimestamp(),
    }
    if (!currentProfile.name && name) requiredUpdates.name = name
    if (!currentProfile.photo && photo) requiredUpdates.photo = photo
    transaction.set(userReference, requiredUpdates, { merge: true })
  })

  return { success: true }
})

exports.getUserProfile = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const authUser = await adminAuth.getUser(uid)
  if (authUser.disabled) {
    throw new HttpsError('permission-denied', 'This customer account is suspended.')
  }
  const userReference = db.doc(`users/${uid}`)
  const userDocument = await userReference.get()
  if (!userDocument.exists) {
    throw new HttpsError('not-found', 'The user profile was not found.')
  }
  const profile = userDocument.data()
  await userReference.set(
    {
      email: String(authUser.email || '').toLowerCase(),
      emailVerified: authUser.emailVerified,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  return {
    uid,
    name: profile.name || authUser.displayName || 'Pride Customer',
    phone: profile.phone || '',
    email: String(authUser.email || '').toLowerCase(),
    emailVerified: authUser.emailVerified,
    dob: profile.dob || '',
    gender: profile.gender || '',
    gstDetails: profile.gstDetails || null,
    role: 'customer',
  }
})

// GSTIN Verification Cache & Handlers
const recentGstinCache = new Map()
const GSTIN_CACHE_TTL_MS = 10 * 60 * 1000

async function verifyGstinHandler(request) {
  const uid = requireUser(request)
  const gstin = String(request.data?.gstin || request.data?.payload?.gstin || '').trim().toUpperCase()

  if (!gstin || !GSTIN_PATTERN.test(gstin)) {
    throw new HttpsError(
      'invalid-argument',
      'Please enter a valid 15-character Indian GSTIN number.',
    )
  }

  const now = Date.now()
  const cached = recentGstinCache.get(gstin)
  if (cached && now - cached.timestamp < GSTIN_CACHE_TTL_MS) {
    return cached.data
  }

  let clientId = ''
  let clientSecret = ''
  try {
    clientId = cashfreeClientId.value() || ''
    clientSecret = cashfreeClientSecret.value() || ''
  } catch {
    clientId = process.env.CASHFREE_CLIENT_ID || ''
    clientSecret = process.env.CASHFREE_CLIENT_SECRET || ''
  }

  if (clientId && clientSecret && clientId !== 'placeholder' && clientSecret !== 'placeholder') {
    try {
      const endpoint = process.env.CASHFREE_ENV === 'sandbox' || clientId.startsWith('TEST')
        ? 'https://sandbox.cashfree.com/verification/gstin'
        : 'https://api.cashfree.com/verification/gstin'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
        },
        body: JSON.stringify({ gstin }),
      })

      const result = await response.json()

      if (!response.ok || result.status === 'ERROR' || result.valid === false) {
        const errorMsg = result.message || result.user_message || 'GSTIN verification failed.'
        if (response.status === 404 || result.subCode === 'GSTIN_NOT_FOUND') {
          throw new HttpsError('not-found', 'The entered GSTIN could not be found on the GST portal.')
        }
        if (response.status === 429) {
          throw new HttpsError('resource-exhausted', 'GST verification rate limit exceeded. Try again in a moment.')
        }
        throw new HttpsError('invalid-argument', errorMsg)
      }

      const details = {
        valid: true,
        gstin,
        legalName: result.legal_name || result.registered_name || result.name || 'GST Registered Entity',
        tradeName: result.trade_name || '',
        status: result.gstin_status || result.status || 'Active',
        taxpayerType: result.taxpayer_type || 'Regular',
        registrationDate: result.registration_date || '',
        address: typeof result.principal_place_address === 'string'
          ? result.principal_place_address
          : result.principal_place_address?.address || result.address || '',
        verifiedAt: new Date().toISOString(),
        verificationSource: 'Cashfree API',
      }

      recentGstinCache.set(gstin, { timestamp: now, data: details })
      return details
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error('Cashfree GSTIN API error:', error)
      throw new HttpsError('unavailable', 'Unable to reach Cashfree GST verification service. Please try again.')
    }
  }

  // Safe fallback / mock mode when Cashfree secrets are not configured or in dev
  const pan = gstin.slice(2, 12)
  const isIndividual = pan[3] === 'P'
  
  const mockDetails = {
    valid: true,
    gstin,
    legalName: isIndividual ? 'PRIDE ELECTRONICS STORE' : 'PRIDE ELECTRONICS PRIVATE LIMITED',
    tradeName: 'PRIDE ELECTRONICS',
    status: 'Active',
    taxpayerType: 'Regular',
    registrationDate: '2021-04-01',
    address: 'Plot No. 42, Industrial Area Phase II, Commercial Hub, India',
    verifiedAt: new Date().toISOString(),
    verificationSource: 'Cashfree (Demo Mode)',
  }

  recentGstinCache.set(gstin, { timestamp: now, data: mockDetails })
  return mockDetails
}

async function saveVerifiedGstDetailsHandler(request) {
  const uid = requireUser(request)
  const gstDetails = request.data?.gstDetails || request.data?.payload?.gstDetails
  if (!gstDetails || !gstDetails.gstin || !GSTIN_PATTERN.test(gstDetails.gstin)) {
    throw new HttpsError('invalid-argument', 'Valid GST details are required.')
  }

  const cleanDetails = {
    gstin: String(gstDetails.gstin).trim().toUpperCase(),
    legalName: String(gstDetails.legalName || gstDetails.businessName || '').trim().slice(0, 150),
    tradeName: String(gstDetails.tradeName || '').trim().slice(0, 150),
    status: String(gstDetails.status || 'Active').trim().slice(0, 30),
    taxpayerType: String(gstDetails.taxpayerType || 'Regular').trim().slice(0, 50),
    registrationDate: String(gstDetails.registrationDate || '').trim().slice(0, 30),
    address: String(gstDetails.address || '').trim().slice(0, 300),
    verifiedAt: gstDetails.verifiedAt || new Date().toISOString(),
    verificationSource: gstDetails.verificationSource || 'Cashfree',
  }

  const userReference = db.doc(`users/${uid}`)
  await userReference.set(
    {
      gstDetails: cleanDetails,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  return { success: true, gstDetails: cleanDetails }
}

exports.verifyGstin = onCall(paymentCallableOptions, verifyGstinHandler)
exports.saveVerifiedGstDetails = onCall(callableOptions, saveVerifiedGstDetailsHandler)

exports.updateUserProfile = onCall(paymentCallableOptions, async (request) => {
  const operation = String(request.data?.operation || '')
  const operationRequest = operation
    ? { ...request, data: request.data?.payload || {} }
    : request
  if (operation === 'verifyGstin') return verifyGstinHandler(operationRequest)
  if (operation === 'saveVerifiedGstDetails') {
    return saveVerifiedGstDetailsHandler(operationRequest)
  }
  if (operation === 'placeOrder') return placeOrderHandler(operationRequest)
  if (operation === 'getCouponUsage') return getMyCouponUsageHandler(operationRequest)
  if (operation === 'saveAccountState') {
    return saveAccountStateHandler(operationRequest)
  }
  if (operation === 'removeCartItems') {
    return removeCartItemsHandler(operationRequest)
  }
  if (operation === 'createReturn') return createReturnHandler(operationRequest)
  if (operation === 'cancelOrder') return cancelOrderHandler(operationRequest)
  if (operation === 'submitOrderFeedback') {
    return submitOrderFeedbackHandler(operationRequest)
  }
  if (operation === 'updateCustomerStatus') {
    return updateCustomerStatusHandler(operationRequest)
  }
  if (operation === 'createRazorpayOrder') {
    return createRazorpayOrderHandler(operationRequest)
  }
  if (operation === 'verifyRazorpayPayment') {
    return verifyRazorpayPaymentHandler(operationRequest)
  }
  if (operation) {
    throw new HttpsError('invalid-argument', 'Unsupported account operation.')
  }
  const uid = requireUser(request)
  const profile = validateProfile(request.data)
  const authUser = await adminAuth.getUser(uid)
  const userReference = db.doc(`users/${uid}`)
  const nextPhoneReference = db.doc(`_authPhoneIndex/${profile.phone}`)

  await db.runTransaction(async (transaction) => {
    const [currentProfile, nextPhone] = await Promise.all([
      transaction.get(userReference),
      transaction.get(nextPhoneReference),
    ])
    if (!currentProfile.exists) {
      throw new HttpsError('not-found', 'The user profile was not found.')
    }
    if (nextPhone.exists && nextPhone.data().uid !== uid) {
      throw new HttpsError('already-exists', 'The phone number is already used.')
    }

    const previousPhone = currentProfile.data().phoneNormalized
    let previousPhoneReference = null
    let previousPhoneDocument = null
    if (previousPhone && previousPhone !== profile.phone) {
      previousPhoneReference = db.doc(`_authPhoneIndex/${previousPhone}`)
      previousPhoneDocument = await transaction.get(previousPhoneReference)
    }

    transaction.set(
      nextPhoneReference,
      { uid, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    if (
      previousPhoneReference &&
      previousPhoneDocument?.exists &&
      previousPhoneDocument.data().uid === uid
    ) {
      transaction.delete(previousPhoneReference)
    }
    transaction.set(
      userReference,
      {
        name: profile.name,
        phone: profile.phone,
        phoneNormalized: profile.phone,
        dob: profile.dob,
        gender: profile.gender,
        photo: profile.photo,
        email: String(authUser.email || '').toLowerCase(),
        emailVerified: authUser.emailVerified,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })
  if (profile.name !== authUser.displayName) {
    await adminAuth.updateUser(uid, { displayName: profile.name })
  }
  return { success: true }
})

exports.signInUserWithPhone = onCall(callableOptions, async (request) => {
  if (request.auth) {
    throw new HttpsError('failed-precondition', 'Sign out before signing in.')
  }
  const phone = normalizePhone(request.data?.phone)
  const password = String(request.data?.password || '')
  if (!PHONE_PATTERN.test(phone) || !password || password.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid login details.')
  }

  const phoneDocument = await db.doc(`_authPhoneIndex/${phone}`).get()
  if (!phoneDocument.exists) {
    throw new HttpsError('unauthenticated', 'Invalid login details.')
  }
  const uid = phoneDocument.data().uid
  const authUser = await adminAuth.getUser(uid)
  if (!authUser.email || !authUser.emailVerified || authUser.disabled) {
    throw new HttpsError(
      authUser.emailVerified ? 'unauthenticated' : 'failed-precondition',
      'Invalid login details.',
    )
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: authUser.email,
        password,
        returnSecureToken: true,
      }),
    },
  )
  const result = await response.json()
  if (!response.ok || result.localId !== uid) {
    const tooManyAttempts = String(result?.error?.message || '').includes(
      'TOO_MANY_ATTEMPTS',
    )
    throw new HttpsError(
      tooManyAttempts ? 'resource-exhausted' : 'unauthenticated',
      'Invalid login details.',
    )
  }
  // The client completes a normal Firebase email/password sign-in with this
  // verified address. This avoids requiring the runtime service account to
  // sign a custom token while keeping phone-to-email lookup protected by the
  // user's password.
  return { email: authUser.email }
})

async function createRazorpayOrderHandler(request) {
  const uid = requireUser(request)
  const requestId = String(request.data?.requestId || '').trim()
  if (!ORDER_REQUEST_PATTERN.test(requestId)) {
    throw new HttpsError('invalid-argument', 'Restart checkout and try again.')
  }
  const shippingAddress = validateShippingAddress(request.data?.shippingAddress)
  const billingAddress = request.data?.billingAddress
    ? validateShippingAddress(request.data.billingAddress)
    : shippingAddress
  const [quote, storefrontSettingsDocument] = await Promise.all([
    loadCheckoutQuote(uid, request.data?.items, request.data),
    db.doc('settings/storefront').get(),
  ])
  const paymentConfiguration = normalizePaymentConfiguration(
    storefrontSettingsDocument.data()?.payment,
  )
  if (!paymentConfiguration.razorpayEnabled) {
    throw new HttpsError('failed-precondition', 'Online payment is not available.')
  }
  if (![
    paymentConfiguration.cardsEnabled,
    paymentConfiguration.upiEnabled,
    paymentConfiguration.netBankingEnabled,
    paymentConfiguration.walletsEnabled,
  ].some(Boolean)) {
    throw new HttpsError(
      'failed-precondition',
      'No Razorpay payment method is currently available.',
    )
  }
  const amount = quote.totalPaise
  if (!Number.isInteger(amount) || amount < 100 || amount > 50_000_000) {
    throw new HttpsError('invalid-argument', 'Enter a valid payment amount.')
  }
  const keyId = razorpayKeyId.value()
  const environment = razorpayEnvironmentForKey(keyId)
  if (!environment || !razorpayKeySecret.value()) {
    throw new HttpsError(
      'failed-precondition',
      'Razorpay credentials are not configured correctly.',
    )
  }
  const configuredEnvironment = paymentConfiguration.testMode ? 'test' : 'live'
  if (environment !== configuredEnvironment) {
    throw new HttpsError(
      'failed-precondition',
      `Razorpay ${configuredEnvironment === 'test' ? 'Test' : 'Live'} Mode credentials are required.`,
    )
  }
  const receipt = String(request.data?.receipt || `pride_${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 40)
  let response
  let order
  try {
    response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: razorpayAuthorization(),
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt,
        notes: {
          source: `Pride Electronics ${environment === 'test' ? 'Test ' : ''}Checkout`,
          uid,
        },
      }),
    })
    order = await response.json()
  } catch {
    throw new HttpsError('unavailable', 'Unable to reach Razorpay. Please try again.')
  }
  if (
    !response.ok ||
    !RAZORPAY_ORDER_PATTERN.test(String(order?.id || '')) ||
    Number(order?.amount) !== amount ||
    String(order?.currency) !== 'INR'
  ) {
    throw new HttpsError(
      'internal',
      order?.error?.description || 'Unable to create Razorpay order.',
    )
  }
  const createdAt = new Date().toISOString()
  await db.doc(`paymentIntents/${order.id}`).set({
    id: order.id,
    userId: uid,
    amount: Number(order.amount),
    currency: String(order.currency || 'INR'),
    receipt,
    requestId,
    quote,
    checkoutOrder: {
      clientRequestId: requestId,
      expectedTotalPaise: quote.totalPaise,
      shippingAddress,
      billingAddress,
      deliveryId: quote.deliveryId,
      deliveryDate: String(request.data?.deliveryDate || 'Being scheduled').slice(0, 100),
      paymentMethod: 'Online payment',
      items: quote.items.map((item) => ({
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        quantity: item.qty,
      })),
    },
    status: String(order.status || 'created'),
    verified: false,
    consumed: false,
    autoCapture: paymentConfiguration.autoCapture,
    environment,
    createdAt,
    updatedAt: createdAt,
  })
  return {
    environment,
    keyId,
    quote,
    order: {
      id: order.id,
      amount: Number(order.amount),
      currency: String(order.currency || 'INR'),
      status: String(order.status || 'created'),
      receipt: String(order.receipt || receipt),
    },
  }
}

async function verifyRazorpayPaymentHandler(request) {
  const uid = requireUser(request)
  const allowConsumed = request.allowConsumed === true
  const orderId = String(request.data?.razorpay_order_id || '').trim()
  const paymentId = String(request.data?.razorpay_payment_id || '').trim()
  const signature = String(request.data?.razorpay_signature || '').trim()
  if (
    !RAZORPAY_ORDER_PATTERN.test(orderId) ||
    !RAZORPAY_PAYMENT_PATTERN.test(paymentId) ||
    !RAZORPAY_SIGNATURE_PATTERN.test(signature)
  ) {
    throw new HttpsError('invalid-argument', 'Incomplete Razorpay payment response.')
  }
  const intentReference = db.doc(`paymentIntents/${orderId}`)
  const intentDocument = await intentReference.get()
  if (!intentDocument.exists || intentDocument.data().userId !== uid) {
    throw new HttpsError('permission-denied', 'This payment does not belong to your account.')
  }
  const intent = intentDocument.data()
  if (intent.consumed && !allowConsumed) {
    throw new HttpsError('already-exists', 'This payment has already been used for an order.')
  }
  const expectedSignature = createHmac('sha256', razorpayKeySecret.value())
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  if (!secureCompare(signature, expectedSignature)) {
    throw new HttpsError('permission-denied', 'Payment signature verification failed.')
  }
  let response
  let payment
  try {
    response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: razorpayAuthorization() } },
    )
    payment = await response.json()
  } catch {
    throw new HttpsError('unavailable', 'Unable to verify the payment with Razorpay.')
  }
  if (!response.ok) {
    throw new HttpsError(
      'internal',
      payment?.error?.description || 'Unable to verify the Razorpay payment.',
    )
  }
  if (
    payment.order_id !== orderId ||
    Number(payment.amount) !== Number(intent.amount) ||
    String(payment.currency) !== String(intent.currency)
  ) {
    throw new HttpsError('data-loss', 'Razorpay returned mismatched payment details.')
  }
  if (String(payment.status) === 'authorized' && intent.autoCapture !== false) {
    let captureResponse
    let capturedPayment
    try {
      captureResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/capture`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: razorpayAuthorization(),
          },
          body: JSON.stringify({
            amount: Number(intent.amount),
            currency: String(intent.currency),
          }),
        },
      )
      capturedPayment = await captureResponse.json()
    } catch {
      throw new HttpsError('unavailable', 'Unable to capture the Razorpay payment.')
    }
    if (captureResponse.ok) {
      payment = capturedPayment
    } else {
      try {
        const refreshedResponse = await fetch(
          `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
          { headers: { Authorization: razorpayAuthorization() } },
        )
        const refreshedPayment = await refreshedResponse.json()
        if (refreshedResponse.ok && refreshedPayment.status === 'captured') {
          payment = refreshedPayment
        } else {
          throw new Error('Payment is not captured.')
        }
      } catch {
        throw new HttpsError(
          'failed-precondition',
          capturedPayment?.error?.description || 'The payment could not be captured.',
        )
      }
    }
  }
  if (!['authorized', 'captured'].includes(String(payment.status))) {
    throw new HttpsError(
      'failed-precondition',
      'The payment was not completed. Your order was not placed.',
    )
  }
  const savedPayment = {
    id: payment.id,
    orderId: payment.order_id,
    amount: Number(payment.amount),
    currency: String(payment.currency),
    status: String(payment.status),
    method: String(payment.method || ''),
    bank: String(payment.bank || ''),
    wallet: String(payment.wallet || ''),
    createdAt: payment.created_at || null,
  }
  await intentReference.update({
    paymentId,
    paymentStatus: savedPayment.status,
    payment: savedPayment,
    verified: true,
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return { verified: true, payment: savedPayment }
}

exports.razorpayWebhook = onRequest(
  {
    region,
    invoker: 'public',
    secrets: [razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret],
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.status(405).send('Method not allowed')
      return
    }
    const signature = String(request.get('x-razorpay-signature') || '')
    const expectedSignature = createHmac('sha256', razorpayWebhookSecret.value())
      .update(request.rawBody)
      .digest('hex')
    if (!secureCompare(signature, expectedSignature)) {
      response.status(401).send('Invalid signature')
      return
    }
    const event = String(request.body?.event || '')
    if (!['payment.authorized', 'payment.captured'].includes(event)) {
      response.status(200).json({ accepted: true })
      return
    }
    const payment = request.body?.payload?.payment?.entity || {}
    const orderId = String(payment.order_id || '').trim()
    const paymentId = String(payment.id || '').trim()
    try {
      const intentReference = db.doc(`paymentIntents/${orderId}`)
      const intentDocument = await intentReference.get()
      const intent = intentDocument.data()
      if (!intentDocument.exists || !intent?.userId || !intent?.checkoutOrder) {
        throw new Error('Payment intent not found.')
      }
      const verified = await verifyRazorpayPaymentHandler({
        auth: { uid: intent.userId },
        allowConsumed: true,
        data: {
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: createHmac('sha256', razorpayKeySecret.value())
            .update(`${orderId}|${paymentId}`)
            .digest('hex'),
        },
      })
      const placed = await placeOrderHandler({
        auth: { uid: intent.userId },
        data: {
          order: {
            ...intent.checkoutOrder,
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
          },
        },
      })
      if (verified.payment?.status === 'captured') {
        await db.doc(`orders/${placed.order.id}`).set(
          {
            paymentStatus: 'Paid',
            paymentDate: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        )
      }
      response.status(200).json({ accepted: true })
    } catch (error) {
      console.error('Razorpay webhook processing failed', {
        orderId,
        paymentId,
        code: error?.code || 'unknown',
      })
      response.status(500).json({ accepted: false })
    }
  },
)

async function placeOrderHandler(request) {
  const uid = requireUser(request)
  const authUser = await adminAuth.getUser(uid)
  if (authUser.disabled) {
    throw new HttpsError('permission-denied', 'This customer account is suspended.')
  }
  const submittedOrder = cleanObject(request.data?.order)
  const items = normalizeOrderItems(submittedOrder.items)
  const requestId = String(submittedOrder.clientRequestId || '').trim()
  if (!ORDER_REQUEST_PATTERN.test(requestId)) {
    throw new HttpsError('invalid-argument', 'Restart checkout and try again.')
  }
  let shippingAddress = validateShippingAddress(submittedOrder.shippingAddress)
  let billingAddress = submittedOrder.billingAddress
    ? validateShippingAddress(submittedOrder.billingAddress)
    : shippingAddress
  const orderReference = db.doc(`orders/${uid}_${requestId}`)
  const now = new Date().toISOString()

  const savedOrder = await db.runTransaction(async (transaction) => {
    const existingOrder = await transaction.get(orderReference)
    if (existingOrder.exists) {
      const existing = existingOrder.data()
      if (existing.userId === uid && existing.clientRequestId === requestId) {
        return { ...existing, id: orderReference.id }
      }
      throw new HttpsError('already-exists', 'This order has already been placed.')
    }

    const productReferences = items.map((item) => db.doc(`products/${item.productId}`))
    const productDocuments = []
    for (const productReference of productReferences) {
      productDocuments.push(await transaction.get(productReference))
    }
    const invoiceSettingsReference = db.doc('settings/invoice')
    const shippingSettingsReference = db.doc('settings/shipping')
    const storefrontSettingsReference = db.doc('settings/storefront')
    const userReference = db.doc(`users/${uid}`)
    const [
      invoiceSettingsDocument,
      shippingSettingsDocument,
      storefrontSettingsDocument,
      userDocument,
    ] =
      await Promise.all([
        transaction.get(invoiceSettingsReference),
        transaction.get(shippingSettingsReference),
        transaction.get(storefrontSettingsReference),
        transaction.get(userReference),
      ])
    const paymentConfiguration = normalizePaymentConfiguration(
      storefrontSettingsDocument.data()?.payment,
    )
    const isCashOnDelivery = /cash|cod/i.test(submittedOrder.paymentMethod || '')
    if (isCashOnDelivery && paymentConfiguration.codEnabled !== true) {
      throw new HttpsError('failed-precondition', 'Cash on Delivery is not available.')
    }
    if (!isCashOnDelivery && paymentConfiguration.razorpayEnabled !== true) {
      throw new HttpsError('failed-precondition', 'Online payment is not available.')
    }
    let paymentIntentReference = null
    let paymentIntent = null
    if (!isCashOnDelivery) {
      const razorpayOrderId = String(submittedOrder.razorpayOrderId || '').trim()
      const razorpayPaymentId = String(submittedOrder.razorpayPaymentId || '').trim()
      if (!razorpayOrderId || !razorpayPaymentId) {
        throw new HttpsError('failed-precondition', 'A verified payment is required.')
      }
      paymentIntentReference = db.doc(`paymentIntents/${razorpayOrderId}`)
      const paymentIntentDocument = await transaction.get(paymentIntentReference)
      paymentIntent = paymentIntentDocument.data()
      if (
        !paymentIntentDocument.exists ||
        paymentIntent.userId !== uid ||
        paymentIntent.requestId !== requestId ||
        paymentIntent.paymentId !== razorpayPaymentId ||
        paymentIntent.verified !== true ||
        paymentIntent.consumed === true ||
        !['authorized', 'captured'].includes(paymentIntent.paymentStatus)
      ) {
        throw new HttpsError('failed-precondition', 'The payment could not be verified for this order.')
      }
      if (paymentIntent.checkoutOrder) {
        shippingAddress = validateShippingAddress(
          paymentIntent.checkoutOrder.shippingAddress,
        )
        billingAddress = paymentIntent.checkoutOrder.billingAddress
          ? validateShippingAddress(paymentIntent.checkoutOrder.billingAddress)
          : shippingAddress
      }
    }

    let inventoryNeedsAttention = false
    productDocuments.forEach((productDocument, index) => {
      const product = productDocument.data()
      const variants = Array.isArray(product?.variants) ? product.variants : []
      const variant = variantForItem(product, items[index])
      const inventory = inventoryForItem(product, items[index])
      const available = productDocument.exists
        ? Math.max(
            0,
            Number(inventory?.stock || 0) - Number(inventory?.reservedStock || 0),
          )
        : 0
      const unavailable =
        !productDocument.exists ||
        product.enabled === false ||
        (variants.length > 0 && !variant) ||
        (variants.length === 0 && items[index].variantId) ||
        available < items[index].qty
      if (!unavailable) return
      if (!isCashOnDelivery) {
        inventoryNeedsAttention = true
        return
      }
      if (!productDocument.exists || product.enabled === false) {
        throw new HttpsError('failed-precondition', 'A product is no longer available.')
      }
      throw new HttpsError('resource-exhausted', 'A product has insufficient stock.')
    })

    let couponDocument = null
    let couponUsageReference = null
    let couponUsage = 0
    const couponCode = String(
      isCashOnDelivery
        ? submittedOrder.couponCode || ''
        : paymentIntent?.quote?.couponCode || '',
    ).trim().toUpperCase()
    if (couponCode) {
      if (isCashOnDelivery) {
        const couponQuery = db.collection('coupons').where('code', '==', couponCode).limit(1)
        const couponResult = await transaction.get(couponQuery)
        couponDocument = couponResult.docs[0] || null
      } else if (paymentIntent?.quote?.couponId) {
        const couponReference = db.doc(`coupons/${paymentIntent.quote.couponId}`)
        const couponSnapshot = await transaction.get(couponReference)
        couponDocument = couponSnapshot.exists ? couponSnapshot : null
      }
      if (isCashOnDelivery && !couponDocument) validateActiveCoupon(null)
      if (couponDocument) {
        couponUsageReference = db.doc(`couponUsages/${couponDocument.id}_${uid}`)
        const couponUsageDocument = await transaction.get(couponUsageReference)
        couponUsage = Number(couponUsageDocument.data()?.count || 0)
        if (isCashOnDelivery) {
          validateActiveCoupon(couponDocument.data(), couponUsage)
        }
      }
    }

    const products = productDocuments.map((document) => ({
      id: document.id,
      ...(document.exists ? document.data() : {}),
      enabled: document.exists && document.data().enabled !== false,
    }))
    let quote
    if (isCashOnDelivery) {
      try {
        quote = calculateOrderQuote({
          requestedItems: items,
          products,
          coupon: couponDocument
            ? { id: couponDocument.id, ...couponDocument.data() }
            : null,
          couponCode,
          shippingSettings: shippingSettingsDocument.data() || {},
          taxSettings: invoiceSettingsDocument.data()?.tax || {},
          deliveryId: submittedOrder.deliveryId,
        })
      } catch (error) {
        throw checkoutError(error)
      }
      if (Number(submittedOrder.expectedTotalPaise) !== Number(quote.totalPaise)) {
        throw new HttpsError(
          'failed-precondition',
          'Your cart total changed while checking out. Review the updated cart and try again.',
        )
      }
    } else {
      quote = cleanObject(paymentIntent.quote)
      if (
        !Array.isArray(quote.items) ||
        quote.itemSignature !== itemSignature(items) ||
        Number(quote.totalPaise) !== Number(paymentIntent.amount)
      ) {
        throw new HttpsError('failed-precondition', 'The paid checkout details do not match this order.')
      }
    }

    const inventoryUpdates = new Map()
    quote.items.forEach((quotedItem, index) => {
      const productDocument = productDocuments[index]
      const product = inventoryUpdates.get(productDocument.id) || cleanObject(productDocument.data())
      const quantity = quotedItem.qty
      const inventory = inventoryForItem(product, quotedItem) || product
      const reservedBefore = Number(inventory.reservedStock || 0)
      const stock = Number(inventory.stock || 0)
      if (!inventoryNeedsAttention) inventory.reservedStock = reservedBefore + quantity
      if (quotedItem.variantId) {
        product.reservedStock = (product.variants || []).reduce(
          (total, variant) => total + Number(variant.reservedStock || 0),
          0,
        )
      }
      inventoryUpdates.set(productDocument.id, product)
      const historyReference = db.collection('inventoryHistory').doc()
      transaction.create(historyReference, {
        productId: productDocument.id,
        productName: product.name || quotedItem.productName || '',
        variantId: quotedItem.variantId || '',
        variantName: quotedItem.variant || '',
        sku: quotedItem.sku || product.sku || '',
        action: inventoryNeedsAttention
          ? 'Reservation attention required'
          : 'Order reserved',
        quantity,
        stockBefore: stock,
        stockAfter: stock,
        reservedBefore,
        reservedAfter: inventoryNeedsAttention
          ? reservedBefore
          : reservedBefore + quantity,
        availableBefore: Math.max(0, stock - reservedBefore),
        availableAfter: inventoryNeedsAttention
          ? Math.max(0, stock - reservedBefore)
          : Math.max(0, stock - reservedBefore - quantity),
        reference: orderReference.id,
        note: inventoryNeedsAttention
          ? 'Product availability changed after verified payment; manual inventory review required'
          : 'Stock reserved during Firebase order placement',
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      })
    })
    if (!inventoryNeedsAttention) {
      inventoryUpdates.forEach((product, productId) => {
        transaction.update(db.doc(`products/${productId}`), {
          ...(Array.isArray(product.variants) && product.variants.length
            ? { variants: product.variants, reservedStock: product.reservedStock }
            : { reservedStock: product.reservedStock }),
          updatedAt: now,
        })
      })
    }

    if (couponDocument) {
      transaction.update(couponDocument.ref, {
        usageCount: FieldValue.increment(1),
        updatedAt: now,
      })
      transaction.set(
        couponUsageReference,
        {
          couponId: couponDocument.id,
          code: couponCode,
          userId: uid,
          count: couponUsage + 1,
          updatedAt: now,
        },
        { merge: true },
      )
    }

    if (paymentIntentReference) {
      transaction.update(paymentIntentReference, {
        consumed: true,
        consumedByOrderId: orderReference.id,
        consumedAt: now,
        updatedAt: now,
      })
    }

    const verifiedPayment = paymentIntent?.payment || {}
    const paymentStatus = isCashOnDelivery
      ? 'Pending'
      : verifiedPayment.status === 'captured'
        ? 'Paid'
        : 'Authorized'
    const paymentEnvironment = paymentIntent?.environment === 'live'
      ? 'Razorpay'
      : 'Razorpay Test Mode'
    const paymentMethod = isCashOnDelivery
      ? 'Cash on Delivery'
      : `${String(verifiedPayment.method || 'Online payment').toUpperCase()} via ${paymentEnvironment}`
    const order = {
      id: orderReference.id,
      clientRequestId: requestId,
      userId: uid,
      customer: authUser.displayName || 'Pride customer',
      email: String(authUser.email || '').toLowerCase(),
      date: now.slice(0, 10),
      total: formatOrderTotal(quote.total),
      totalValue: quote.total,
      subtotal: quote.sellingSubtotal,
      productDiscount: quote.productDiscount,
      discount: quote.couponDiscount,
      deliveryCharges: quote.shipping,
      taxAmount: quote.tax,
      couponCode: quote.couponCode,
      deliveryId: quote.deliveryId,
      items: quote.items,
      itemsCount: quote.items.reduce((sum, item) => sum + item.qty, 0),
      status: 'Pending',
      invoiceNumber: invoiceSettingsDocument.exists
        ? invoiceNumberFor(
            invoiceSettingsDocument.data().numbering,
            now,
          )
        : '',
      inventoryState: inventoryNeedsAttention ? 'none' : 'reserved',
      inventoryIssue: inventoryNeedsAttention
        ? 'Product availability changed after verified payment.'
        : '',
      orderTime: new Date().toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      deliveryDate: String(submittedOrder.deliveryDate || 'Being scheduled').slice(0, 100),
      deliveryOption: quote.deliveryId === 'express' ? 'Express delivery' : 'Standard delivery',
      shippingAddress,
      billingAddress,
      gstDetails: submittedOrder.gstDetails ? {
        gstin: String(submittedOrder.gstDetails.gstin || '').trim().toUpperCase(),
        legalName: String(submittedOrder.gstDetails.legalName || submittedOrder.gstDetails.businessName || '').trim().slice(0, 150),
        tradeName: String(submittedOrder.gstDetails.tradeName || '').trim().slice(0, 150),
        status: String(submittedOrder.gstDetails.status || 'Active').trim().slice(0, 30),
        address: String(submittedOrder.gstDetails.address || '').trim().slice(0, 300),
        verifiedAt: String(submittedOrder.gstDetails.verifiedAt || now),
        verificationSource: String(submittedOrder.gstDetails.verificationSource || 'Cashfree'),
      } : null,
      paymentStatus,
      paymentDate: isCashOnDelivery ? null : now,
      paymentMethod,
      paymentEnvironment: isCashOnDelivery ? 'Cash on Delivery' : paymentEnvironment,
      razorpayPaymentId: isCashOnDelivery ? '' : String(paymentIntent.paymentId),
      razorpayOrderId: isCashOnDelivery ? '' : String(paymentIntent.id),
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: 'Pending',
          timestamp: now,
          date: now.slice(0, 10),
          time: '',
        },
      ],
    }
    transaction.create(orderReference, cleanObject(order))
    if (invoiceSettingsDocument.exists) {
      transaction.update(invoiceSettingsReference, {
        'numbering.nextNumber': Math.max(
          1,
          Number(invoiceSettingsDocument.data().numbering?.nextNumber) || 1,
        ) + 1,
        updatedAt: now,
      })
    }
    const remainingCartItems = removePurchasedCartItems(
      userDocument.data()?.cartItems,
      quote.items,
    )
    transaction.set(
      userReference,
      {
        cartItems: remainingCartItems,
        ordersCount: FieldValue.increment(1),
        totalSpentValue: FieldValue.increment(quote.total),
        lastOrderAt: now,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return order
  })

  return { order: savedOrder }
}

exports.placeOrder = onCall(callableOptions, placeOrderHandler)

async function saveAccountStateHandler(request) {
  const uid = requireUser(request)
  let account
  try {
    account = sanitizeAccountState(request.data)
  } catch {
    throw new HttpsError('invalid-argument', 'The account changes are invalid.')
  }
  const userReference = db.doc(`users/${uid}`)
  await db.runTransaction(async (transaction) => {
    const userDocument = await transaction.get(userReference)
    const userData = userDocument.data()
    if (!userDocument.exists || userData?.uid !== uid || userData?.role !== 'customer') {
      throw new HttpsError('failed-precondition', 'Your customer profile is unavailable.')
    }
    if (userData.status === 'Suspended') {
      throw new HttpsError('permission-denied', 'This customer account is suspended.')
    }
    transaction.set(
      userReference,
      {
        ...account,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })
  return { success: true }
}

exports.saveAccountState = onCall(callableOptions, saveAccountStateHandler)

async function removeCartItemsHandler(request) {
  const uid = requireUser(request)
  const requestedItems = Array.isArray(request.data?.items)
    ? request.data.items.map((item) => ({
        productId: String(item?.productId || '').trim(),
        variantId: String(item?.variantId || '').trim(),
      }))
    : Array.isArray(request.data?.productIds)
      ? request.data.productIds.map((productId) => ({
          productId: String(productId || '').trim(),
          variantId: '',
        }))
    : []
  if (
    !requestedItems.length ||
    requestedItems.length > 50 ||
    requestedItems.some(({ productId, variantId }) =>
      !/^[a-zA-Z0-9_-]{1,100}$/.test(productId) ||
      (variantId && !/^[a-zA-Z0-9_-]{1,100}$/.test(variantId)),
    )
  ) {
    throw new HttpsError('invalid-argument', 'Select valid cart products.')
  }
  const userReference = db.doc(`users/${uid}`)
  const cartItems = await db.runTransaction(async (transaction) => {
    const userDocument = await transaction.get(userReference)
    const userData = userDocument.data()
    if (!userDocument.exists || userData?.uid !== uid || userData?.role !== 'customer') {
      throw new HttpsError('failed-precondition', 'Your customer profile is unavailable.')
    }
    if (userData.status === 'Suspended') {
      throw new HttpsError('permission-denied', 'This customer account is suspended.')
    }
    const remainingCartItems = removePurchasedCartItems(
      userData.cartItems,
      requestedItems,
    )
    transaction.update(userReference, {
      cartItems: remainingCartItems,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return remainingCartItems
  })
  return { cartItems }
}

exports.removeCartItems = onCall(callableOptions, removeCartItemsHandler)

async function getMyCouponUsageHandler(request) {
  const uid = requireUser(request)
  const usageDocuments = await db.collection('couponUsages').where('userId', '==', uid).get()
  return {
    usage: Object.fromEntries(
      usageDocuments.docs.map((usageDocument) => {
        const usage = usageDocument.data()
        return [String(usage.code || usage.couponId), Number(usage.count || 0)]
      }),
    ),
  }
}

exports.getMyCouponUsage = onCall(callableOptions, getMyCouponUsageHandler)

async function createReturnHandler(request) {
  const uid = requireUser(request)
  const orderId = String(request.data?.orderId || '').trim()
  if (!orderId) throw new HttpsError('invalid-argument', 'An order is required.')
  const details = cleanObject(request.data?.details)
  const orderReference = db.doc(`orders/${orderId}`)
  const returnReference = db.collection('returns').doc()
  const now = new Date().toISOString()

  const returnRequest = await db.runTransaction(async (transaction) => {
    const orderDocument = await transaction.get(orderReference)
    const order = assertOwnedOrder(orderDocument, uid)
    if (!['Delivered', 'Returned'].includes(order.status)) {
      throw new HttpsError('failed-precondition', 'This order is not eligible for return.')
    }
    const existing = await transaction.get(
      db.collection('returns').where('orderId', '==', orderId).where('userId', '==', uid),
    )
    if (existing.docs.some((item) => !['Completed', 'Rejected'].includes(item.data().status))) {
      throw new HttpsError('already-exists', 'A return is already open for this order.')
    }
    const value = {
      id: returnReference.id,
      orderId,
      userId: uid,
      customer: order.customer,
      email: order.email,
      amount: order.total,
      items: order.items || [],
      reason: String(details.reason || '').slice(0, 200),
      images: Array.isArray(details.images) ? details.images.slice(0, 3) : [],
      status: 'Requested',
      resolution: '',
      refundStatus: 'Not Requested',
      inspectionResult: '',
      requestedAt: now,
      updatedAt: now,
      history: [
        { status: 'Requested', timestamp: now, note: 'Return request submitted' },
      ],
    }
    transaction.create(returnReference, cleanObject(value))
    return value
  })
  return { returnRequest }
}

exports.createReturn = onCall(callableOptions, createReturnHandler)

async function cancelOrderHandler(request) {
  const uid = requireUser(request)
  const orderId = String(request.data?.orderId || '').trim()
  const orderReference = db.doc(`orders/${orderId}`)
  const now = new Date().toISOString()
  const savedOrder = await db.runTransaction(async (transaction) => {
    const orderDocument = await transaction.get(orderReference)
    const order = assertOwnedOrder(orderDocument, uid)
    if (!['Pending', 'Confirmed', 'Processing'].includes(order.status)) {
      throw new HttpsError('failed-precondition', 'This order can no longer be cancelled.')
    }
    const items = normalizeOrderItems(order.items)
    const productReferences = items.map((item) => db.doc(`products/${item.productId}`))
    const productDocuments = []
    for (const productReference of productReferences) {
      productDocuments.push(await transaction.get(productReference))
    }
    const inventoryUpdates = new Map()
    items.forEach((item, index) => {
      const productDocument = productDocuments[index]
      if (productDocument.exists && order.inventoryState === 'reserved') {
        const product = inventoryUpdates.get(productDocument.id) || cleanObject(productDocument.data())
        const inventory = inventoryForItem(product, item)
        if (!inventory) return
        const reservedBefore = Number(inventory.reservedStock || 0)
        const reservedAfter = Math.max(0, reservedBefore - item.qty)
        inventory.reservedStock = reservedAfter
        if (Array.isArray(product.variants) && product.variants.length) {
          product.reservedStock = product.variants.reduce(
            (total, variant) => total + Number(variant.reservedStock || 0),
            0,
          )
        }
        inventoryUpdates.set(productDocument.id, product)
        const historyReference = db.collection('inventoryHistory').doc()
        transaction.create(historyReference, {
          productId: productDocument.id,
          variantId: item.variantId || '',
          variantName: item.variant || '',
          productName: product.name || item.productName || '',
          sku: item.sku || product.sku || '',
          action: 'Reservation released',
          quantity: item.qty,
          stockBefore: Number(inventory.stock || 0),
          stockAfter: Number(inventory.stock || 0),
          reservedBefore,
          reservedAfter,
          availableBefore: Math.max(0, Number(inventory.stock || 0) - reservedBefore),
          availableAfter: Math.max(0, Number(inventory.stock || 0) - reservedAfter),
          reference: orderId,
          note: 'Reservation released after customer cancellation',
          timestamp: now,
          createdAt: now,
          updatedAt: now,
        })
      }
    })
    inventoryUpdates.forEach((product, productId) => {
      transaction.update(db.doc(`products/${productId}`), {
        ...(Array.isArray(product.variants) && product.variants.length
          ? { variants: product.variants, reservedStock: product.reservedStock }
          : { reservedStock: product.reservedStock }),
        updatedAt: now,
      })
    })
    const paymentStatus = /cash|cod/i.test(order.paymentMethod || '')
      ? 'Cancelled'
      : 'Refund Pending'
    const next = {
      ...order,
      status: 'Cancelled',
      paymentStatus,
      inventoryState: 'released',
      updatedAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        { status: 'Cancelled', timestamp: now, date: now.slice(0, 10), time: '' },
      ],
    }
    transaction.update(orderReference, cleanObject(next))
    return { ...next, id: orderId }
  })
  return { order: savedOrder }
}

exports.cancelOrder = onCall(callableOptions, cancelOrderHandler)

async function recalculateProductRatingStats(productId) {
  if (!productId) return { rating: 0, reviewsCount: 0 }
  const productReference = db.doc(`products/${productId}`)
  const publishedReviewsSnapshot = await db
    .collection('reviews')
    .where('productId', '==', productId)
    .where('status', '==', 'Published')
    .get()

  const reviews = publishedReviewsSnapshot.docs.map((doc) => doc.data())
  const count = reviews.length
  const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0)
  const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0

  await productReference.set(
    {
      rating: average,
      reviewsCount: count,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )

  return { rating: average, reviewsCount: count }
}

async function submitOrderFeedbackHandler(request) {
  const uid = requireUser(request)
  const orderId = String(request.data?.orderId || '').trim()
  const explicitProductId = String(request.data?.productId || '').trim()
  const feedback = cleanObject(request.data?.feedback)
  const rating = Math.max(1, Math.min(5, Math.round(Number(feedback.rating))))
  const reviewText = String(feedback.review || feedback.text || '').trim().slice(0, 2000)
  if (!rating || !reviewText) {
    throw new HttpsError('invalid-argument', 'A rating and review are required.')
  }

  let orderData = null
  let orderReference = null
  if (orderId) {
    orderReference = db.doc(`orders/${orderId}`)
    const orderDoc = await orderReference.get()
    if (orderDoc.exists) {
      orderData = assertOwnedOrder(orderDoc, uid)
    }
  }

  const productId = explicitProductId || orderData?.items?.[0]?.productId || ''
  if (!productId) {
    throw new HttpsError('invalid-argument', 'A product ID is required to submit a review.')
  }

  const productName =
    orderData?.items?.find((item) => String(item.productId) === String(productId))?.productName ||
    orderData?.items?.[0]?.productName ||
    'Pride product'

  const name = orderData?.customer || request.auth.token.name || 'Pride customer'
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const reviewDocId = `${uid}_${productId}`
  const reviewReference = db.doc(`reviews/${reviewDocId}`)
  const now = new Date().toISOString()

  const review = await db.runTransaction(async (transaction) => {
    const existingReviewDoc = await transaction.get(reviewReference)
    const isEdit = existingReviewDoc.exists

    const value = {
      id: reviewDocId,
      orderId: orderId || (isEdit ? existingReviewDoc.data().orderId || '' : ''),
      userId: uid,
      productId,
      productName,
      name,
      initials,
      rating,
      date: now.slice(0, 10),
      title: `Review for ${productName}`,
      text: reviewText,
      status: 'Published',
      tone: 'bg-[#dcebdd] text-[#366643]',
      createdAt: isEdit ? existingReviewDoc.data().createdAt || now : now,
      updatedAt: now,
    }

    transaction.set(reviewReference, cleanObject(value), { merge: true })

    if (orderReference && orderData) {
      transaction.update(orderReference, {
        feedback: { rating, review: reviewText, productId },
        updatedAt: now,
      })
    }

    return value
  })

  // Recalculate product average rating and reviews count
  await recalculateProductRatingStats(productId)

  return { review }
}

exports.submitOrderFeedback = onCall(
  callableOptions,
  submitOrderFeedbackHandler,
)

async function updateCustomerStatusHandler(request) {
  await requireAdmin(request)
  const userId = String(request.data?.userId || '').trim()
  const status = String(request.data?.status || '').trim()
  if (!userId || !['Active', 'Suspended'].includes(status)) {
    throw new HttpsError('invalid-argument', 'A valid customer status is required.')
  }
  await Promise.all([
    adminAuth.updateUser(userId, { disabled: status === 'Suspended' }),
    db.doc(`users/${userId}`).set(
      { status, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    ),
  ])
  return { success: true, status }
}

exports.updateCustomerStatus = onCall(
  callableOptions,
  updateCustomerStatusHandler,
)

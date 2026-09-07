const { createHmac, randomUUID, timingSafeEqual } = require('node:crypto')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore')
const { defineSecret } = require('firebase-functions/params')
const { HttpsError, onCall, onRequest } = require('firebase-functions/v2/https')
const { onSchedule } = require('firebase-functions/v2/scheduler')
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
const {
  findReusableGstProfile,
  isValidGstin,
  normalizeCashfreeGstinResponse,
  normalizeGstin,
  upsertGstProfiles,
} = require('./gst')
const {
  createInvoiceSnapshot,
  normalizeInvoiceSettings,
} = require('./invoice')

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
  secrets: [
    razorpayKeyId,
    razorpayKeySecret,
    cashfreeClientId,
    cashfreeClientSecret,
  ],
}
const gstCallableOptions = {
  ...callableOptions,
  secrets: [cashfreeClientId, cashfreeClientSecret],
}
const razorpayCallableOptions = {
  ...callableOptions,
  secrets: [razorpayKeyId, razorpayKeySecret],
}
const PHONE_PATTERN = /^[6-9]\d{9}$/
const PIN_CODE_PATTERN = /^[1-8]\d{5}$/
const ORDER_REQUEST_PATTERN = /^[a-zA-Z0-9_-]{8,100}$/
const RAZORPAY_ORDER_PATTERN = /^order_[a-zA-Z0-9]{6,100}$/
const RAZORPAY_PAYMENT_PATTERN = /^pay_[a-zA-Z0-9]{6,100}$/
const RAZORPAY_SIGNATURE_PATTERN = /^[a-fA-F0-9]{64}$/
const STOCK_RESERVATION_TTL_MS = 15 * 60 * 1000
const STOCK_RESERVATION_CLEANUP_LIMIT = 100

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

const syncVariantReservedStock = (product) => {
  if (!Array.isArray(product?.variants) || !product.variants.length) return product
  product.reservedStock = product.variants.reduce(
    (total, variant) => total + Number(variant.reservedStock || 0),
    0,
  )
  return product
}

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
    gstProfiles: Array.isArray(profile.gstProfiles) ? profile.gstProfiles : [],
    role: 'customer',
  }
})

// GSTIN Verification Cache & Handlers
const recentGstinCache = new Map()
const GSTIN_CACHE_TTL_MS = 10 * 60 * 1000

async function verifyGstinHandler(request) {
  const uid = requireUser(request)
  const gstin = normalizeGstin(
    request.data?.gstin ||
      request.data?.gstDetails?.gstin ||
      request.data?.payload?.gstin ||
      request.data?.payload?.gstDetails?.gstin,
  )

  if (!isValidGstin(gstin)) {
    throw new HttpsError(
      'invalid-argument',
      'Please enter a valid 15-character Indian GSTIN number.',
    )
  }

  const now = Date.now()
  const cached = recentGstinCache.get(gstin)
  let details = cached && now - cached.timestamp < GSTIN_CACHE_TTL_MS
    ? cached.data
    : null

  if (!details) {
    const clientId = cashfreeClientId.value()
    const clientSecret = cashfreeClientSecret.value()
    if (!clientId || !clientSecret) {
      throw new HttpsError(
        'failed-precondition',
        'GST verification is not configured. Contact support before requesting a GST invoice.',
      )
    }
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
        body: JSON.stringify({ GSTIN: gstin, business_name: '' }),
        signal: AbortSignal.timeout(10000),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok || result.status === 'ERROR' || result.status === 'FAILED' || result.valid === false) {
        const errorMsg = String(
          result.message || result.user_message || 'GSTIN verification failed.',
        ).slice(0, 200)
        if (
          response.status === 404 ||
          ['GSTIN_NOT_FOUND', 'INVALID_GSTIN'].includes(result.error_code || result.subCode)
        ) {
          throw new HttpsError('not-found', 'The entered GSTIN could not be found on the GST portal.')
        }
        if (response.status === 429) {
          throw new HttpsError('resource-exhausted', 'GST verification rate limit exceeded. Try again in a moment.')
        }
        throw new HttpsError('invalid-argument', errorMsg)
      }
      details = normalizeCashfreeGstinResponse(result, gstin, now)
      recentGstinCache.set(gstin, { timestamp: now, data: details })
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error('Cashfree GSTIN API error:', error)
      if (['invalid-gstin', 'inactive-gstin', 'incomplete-gstin'].includes(error?.code)) {
        throw new HttpsError('failed-precondition', error.message)
      }
      throw new HttpsError('unavailable', 'Unable to reach Cashfree GST verification service. Please try again.')
    }
  }

  const userReference = db.doc(`users/${uid}`)
  await db.runTransaction(async (transaction) => {
    const userDocument = await transaction.get(userReference)
    if (!userDocument.exists) {
      throw new HttpsError('failed-precondition', 'Your customer profile is unavailable.')
    }
    const gstProfiles = upsertGstProfiles(userDocument.data().gstProfiles, details)
    transaction.set(userReference, {
      gstDetails: details,
      gstProfiles,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })
  })
  return { valid: true, ...details }
}

async function saveVerifiedGstDetailsHandler(request) {
  const verified = await verifyGstinHandler(request)
  return { success: true, gstDetails: verified }
}

exports.verifyGstin = onCall(gstCallableOptions, verifyGstinHandler)
exports.saveVerifiedGstDetails = onCall(gstCallableOptions, saveVerifiedGstDetailsHandler)

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
  if (operation === 'releaseRazorpayReservation') {
    return releaseRazorpayReservationHandler(operationRequest)
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

async function reserveCheckoutStock({
  uid,
  requestId,
  checkoutMode,
  requestedItems,
  requestData,
  shippingAddress,
  billingAddress,
}) {
  const items = normalizeOrderItems(requestedItems)
  const reservationReference = reservationReferenceFor(uid, requestId)
  const creationToken = randomUUID()
  const nowMillis = Date.now()
  const now = new Date(nowMillis).toISOString()
  const expiresAt = Timestamp.fromMillis(nowMillis + STOCK_RESERVATION_TTL_MS)

  return db.runTransaction(async (transaction) => {
    const existingReservationDocument = await transaction.get(reservationReference)
    if (existingReservationDocument.exists) {
      const existing = existingReservationDocument.data()
      if (
        existing.userId !== uid ||
        existing.requestId !== requestId ||
        existing.itemSignature !== itemSignature(items)
      ) {
        throw new HttpsError(
          'already-exists',
          'This checkout request is already associated with different items.',
        )
      }
      if (existing.status !== 'active' || timestampMillis(existing.expiresAt) <= nowMillis) {
        throw new HttpsError(
          'failed-precondition',
          'This stock reservation has expired. Restart checkout and try again.',
        )
      }
      if (existing.gatewayState === 'ready' && existing.gatewayOrder) {
        return {
          id: existingReservationDocument.id,
          ...existing,
          reused: true,
        }
      }
      throw new HttpsError(
        'aborted',
        'Payment setup for this checkout is already in progress. Please wait a moment.',
      )
    }

    const productReferences = [
      ...new Map(
        items.map((item) => [
          item.productId,
          db.doc(`products/${item.productId}`),
        ]),
      ).values(),
    ]
    const invoiceSettingsReference = db.doc('settings/invoice')
    const shippingSettingsReference = db.doc('settings/shipping')
    const userReference = db.doc(`users/${uid}`)
    const [productDocuments, invoiceSettingsDocument, shippingSettingsDocument, userDocument] =
      await Promise.all([
        Promise.all(productReferences.map((reference) => transaction.get(reference))),
        transaction.get(invoiceSettingsReference),
        transaction.get(shippingSettingsReference),
        transaction.get(userReference),
      ])
    const requestedGstin = normalizeGstin(
      requestData.gstin || requestData.gstDetails?.gstin,
    )
    try {
      findReusableGstProfile(userDocument.data(), requestedGstin)
    } catch (error) {
      throw new HttpsError('failed-precondition', error.message)
    }

    const couponCode = String(requestData.couponCode || '').trim().toUpperCase()
    let couponDocument = null
    if (couponCode) {
      const couponQuery = db.collection('coupons').where('code', '==', couponCode).limit(1)
      const couponResult = await transaction.get(couponQuery)
      couponDocument = couponResult.docs[0] || null
      if (!couponDocument) validateActiveCoupon(null)
      const couponUsageDocument = await transaction.get(
        db.doc(`couponUsages/${couponDocument.id}_${uid}`),
      )
      validateActiveCoupon(
        { id: couponDocument.id, ...couponDocument.data() },
        couponUsageDocument.data()?.count || 0,
      )
    }

    const products = productDocuments.map((document) => ({
      id: document.id,
      ...(document.exists ? document.data() : {}),
      enabled: document.exists && document.data().enabled !== false,
    }))
    let quote
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
        deliveryId: requestData.deliveryId,
      })
    } catch (error) {
      throw checkoutError(error)
    }

    const productDocumentsById = new Map(
      productDocuments.map((document) => [document.id, document]),
    )
    const inventoryUpdates = new Map()
    quote.items.forEach((quotedItem) => {
      const productDocument = productDocumentsById.get(quotedItem.productId)
      const product = inventoryUpdates.get(quotedItem.productId) ||
        cleanObject(productDocument?.data())
      const inventory = inventoryForItem(product, quotedItem)
      const reservedBefore = Number(inventory?.reservedStock || 0)
      const stock = Number(inventory?.stock || 0)
      if (!inventory || stock - reservedBefore < quotedItem.qty) {
        throw new HttpsError(
          'resource-exhausted',
          'A product has insufficient stock.',
        )
      }
      inventory.reservedStock = reservedBefore + quotedItem.qty
      syncVariantReservedStock(product)
      inventoryUpdates.set(quotedItem.productId, product)

      const historyReference = db.collection('inventoryHistory').doc()
      transaction.create(historyReference, {
        productId: quotedItem.productId,
        productName: product.name || quotedItem.productName || '',
        variantId: quotedItem.variantId || '',
        variantName: quotedItem.variant || '',
        sku: quotedItem.sku || product.sku || '',
        action: 'Checkout reserved',
        quantity: quotedItem.qty,
        stockBefore: stock,
        stockAfter: stock,
        reservedBefore,
        reservedAfter: reservedBefore + quotedItem.qty,
        availableBefore: Math.max(0, stock - reservedBefore),
        availableAfter: Math.max(0, stock - reservedBefore - quotedItem.qty),
        reference: reservationReference.id,
        note: 'Atomic stock reservation before Razorpay checkout',
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    inventoryUpdates.forEach((product, productId) => {
      transaction.update(db.doc(`products/${productId}`), {
        ...(Array.isArray(product.variants) && product.variants.length
          ? { variants: product.variants, reservedStock: product.reservedStock }
          : { reservedStock: product.reservedStock }),
        updatedAt: now,
      })
    })

    const checkoutOrder = {
      clientRequestId: requestId,
      checkoutMode,
      expectedTotalPaise: quote.totalPaise,
      shippingAddress,
      billingAddress,
      gstin: requestedGstin,
      deliveryId: quote.deliveryId,
      deliveryDate: String(requestData.deliveryDate || 'Being scheduled').slice(0, 100),
      paymentMethod: 'Online payment',
      items: quote.items.map((item) => ({
        productId: item.productId,
        ...(item.variantId ? { variantId: item.variantId } : {}),
        quantity: item.qty,
      })),
    }
    const reservation = {
      id: reservationReference.id,
      userId: uid,
      requestId,
      itemSignature: quote.itemSignature,
      items: checkoutOrder.items,
      quote: cleanObject(quote),
      checkoutOrder: cleanObject(checkoutOrder),
      status: 'active',
      gatewayState: 'creating',
      creationToken,
      expiresAt,
      createdAt: Timestamp.fromMillis(nowMillis),
      updatedAt: Timestamp.fromMillis(nowMillis),
    }
    transaction.create(reservationReference, reservation)
    return { ...reservation, reused: false }
  })
}

async function releaseStockReservation({
  uid = '',
  reservationId = '',
  requestId = '',
  reason = 'Checkout ended before payment confirmation',
  expired = false,
}) {
  const reservationReference = reservationId
    ? db.doc(`stockReservations/${reservationId}`)
    : reservationReferenceFor(uid, requestId)
  const now = new Date().toISOString()

  return db.runTransaction(async (transaction) => {
    const reservationDocument = await transaction.get(reservationReference)
    if (!reservationDocument.exists) return { released: false, state: 'missing' }
    const reservation = reservationDocument.data()
    if (uid && reservation.userId !== uid) {
      throw new HttpsError('permission-denied', 'This reservation belongs to another account.')
    }
    if (reservation.status !== 'active') {
      return { released: false, state: reservation.status }
    }

    let paymentIntentDocument = null
    if (reservation.paymentIntentId) {
      paymentIntentDocument = await transaction.get(
        db.doc(`paymentIntents/${reservation.paymentIntentId}`),
      )
      const intent = paymentIntentDocument.data()
      if (intent?.verified === true || intent?.consumed === true) {
        return { released: false, state: 'payment-verified' }
      }
    }

    const items = normalizeOrderItems(reservation.items)
    const productReferences = [
      ...new Map(
        items.map((item) => [item.productId, db.doc(`products/${item.productId}`)]),
      ).values(),
    ]
    const productDocuments = await Promise.all(
      productReferences.map((reference) => transaction.get(reference)),
    )
    const productDocumentsById = new Map(
      productDocuments.map((document) => [document.id, document]),
    )
    const inventoryUpdates = new Map()

    items.forEach((item) => {
      const productDocument = productDocumentsById.get(item.productId)
      if (!productDocument?.exists) return
      const product = inventoryUpdates.get(item.productId) || cleanObject(productDocument.data())
      const inventory = inventoryForItem(product, item)
      if (!inventory) return
      const stock = Number(inventory.stock || 0)
      const reservedBefore = Number(inventory.reservedStock || 0)
      const reservedAfter = Math.max(0, reservedBefore - item.qty)
      inventory.reservedStock = reservedAfter
      syncVariantReservedStock(product)
      inventoryUpdates.set(item.productId, product)

      transaction.create(db.collection('inventoryHistory').doc(), {
        productId: item.productId,
        productName: product.name || '',
        variantId: item.variantId || '',
        variantName: variantForItem(product, item)?.name || '',
        sku: inventory.sku || product.sku || '',
        action: expired ? 'Checkout reservation expired' : 'Checkout reservation released',
        quantity: item.qty,
        stockBefore: stock,
        stockAfter: stock,
        reservedBefore,
        reservedAfter,
        availableBefore: Math.max(0, stock - reservedBefore),
        availableAfter: Math.max(0, stock - reservedAfter),
        reference: reservationReference.id,
        note: String(reason).slice(0, 300),
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    inventoryUpdates.forEach((product, productId) => {
      transaction.update(db.doc(`products/${productId}`), {
        ...(Array.isArray(product.variants) && product.variants.length
          ? { variants: product.variants, reservedStock: product.reservedStock }
          : { reservedStock: product.reservedStock }),
        updatedAt: now,
      })
    })
    transaction.update(reservationReference, {
      status: expired ? 'expired' : 'released',
      releaseReason: String(reason).slice(0, 300),
      releasedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    if (paymentIntentDocument?.exists) {
      transaction.update(paymentIntentDocument.ref, {
        reservationStatus: expired ? 'expired' : 'released',
        updatedAt: now,
      })
    }
    return { released: true, state: expired ? 'expired' : 'released' }
  })
}

async function releaseRazorpayReservationHandler(request) {
  const uid = requireUser(request)
  const requestId = String(request.data?.requestId || '').trim()
  if (!ORDER_REQUEST_PATTERN.test(requestId)) {
    throw new HttpsError('invalid-argument', 'A valid checkout request is required.')
  }
  return releaseStockReservation({
    uid,
    requestId,
    reason: String(
      request.data?.reason || 'Customer ended checkout before payment confirmation',
    ).slice(0, 300),
  })
}

async function createRazorpayOrderHandler(request) {
  const uid = requireUser(request)
  const authUser = await adminAuth.getUser(uid)
  if (authUser.disabled) {
    throw new HttpsError('permission-denied', 'This customer account is suspended.')
  }
  const requestId = String(request.data?.requestId || '').trim()
  const checkoutMode = request.data?.checkoutMode === 'buy-now'
    ? 'buy-now'
    : 'cart'
  if (!ORDER_REQUEST_PATTERN.test(requestId)) {
    throw new HttpsError('invalid-argument', 'Restart checkout and try again.')
  }
  const shippingAddress = validateShippingAddress(request.data?.shippingAddress)
  const billingAddress = request.data?.billingAddress
    ? validateShippingAddress(request.data.billingAddress)
    : shippingAddress
  const storefrontSettingsDocument = await db.doc('settings/storefront').get()
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
  const reservation = await reserveCheckoutStock({
    uid,
    requestId,
    checkoutMode,
    requestedItems: request.data?.items,
    requestData: request.data || {},
    shippingAddress,
    billingAddress,
  })
  const quote = reservation.quote
  if (reservation.reused && reservation.gatewayOrder) {
    return {
      environment,
      keyId,
      quote,
      reservation: {
        id: reservation.id,
        expiresAt: new Date(timestampMillis(reservation.expiresAt)).toISOString(),
      },
      order: reservation.gatewayOrder,
    }
  }
  const amount = quote.totalPaise
  if (!Number.isInteger(amount) || amount < 100 || amount > 50_000_000) {
    await releaseStockReservation({
      uid,
      reservationId: reservation.id,
      reason: 'Invalid payable amount',
    })
    throw new HttpsError('invalid-argument', 'Enter a valid payment amount.')
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
          reservation_id: reservation.id,
        },
      }),
    })
    order = await response.json()
  } catch {
    await releaseStockReservation({
      uid,
      reservationId: reservation.id,
      reason: 'Razorpay order creation failed',
    })
    throw new HttpsError('unavailable', 'Unable to reach Razorpay. Please try again.')
  }
  if (
    !response.ok ||
    !RAZORPAY_ORDER_PATTERN.test(String(order?.id || '')) ||
    Number(order?.amount) !== amount ||
    String(order?.currency) !== 'INR'
  ) {
    await releaseStockReservation({
      uid,
      reservationId: reservation.id,
      reason: 'Razorpay rejected the payment order',
    })
    throw new HttpsError(
      'internal',
      order?.error?.description || 'Unable to create Razorpay order.',
    )
  }
  const createdAt = new Date().toISOString()
  const gatewayOrder = {
    id: order.id,
    amount: Number(order.amount),
    currency: String(order.currency || 'INR'),
    status: String(order.status || 'created'),
    receipt: String(order.receipt || receipt),
  }
  const paymentIntentReference = db.doc(`paymentIntents/${order.id}`)
  try {
    await db.runTransaction(async (transaction) => {
      const reservationReference = db.doc(`stockReservations/${reservation.id}`)
      const reservationDocument = await transaction.get(reservationReference)
      const currentReservation = reservationDocument.data()
      if (
        !reservationDocument.exists ||
        currentReservation.userId !== uid ||
        currentReservation.status !== 'active' ||
        currentReservation.creationToken !== reservation.creationToken ||
        timestampMillis(currentReservation.expiresAt) <= Date.now()
      ) {
        throw new HttpsError(
          'failed-precondition',
          'The stock reservation expired before payment could begin.',
        )
      }
      transaction.create(paymentIntentReference, {
        id: order.id,
        userId: uid,
        amount: Number(order.amount),
        currency: String(order.currency || 'INR'),
        receipt,
        requestId,
        reservationId: reservation.id,
        reservationStatus: 'active',
        quote,
        checkoutOrder: reservation.checkoutOrder,
        status: String(order.status || 'created'),
        verified: false,
        consumed: false,
        autoCapture: paymentConfiguration.autoCapture,
        environment,
        createdAt,
        updatedAt: createdAt,
      })
      transaction.update(reservationReference, {
        paymentIntentId: order.id,
        gatewayState: 'ready',
        gatewayOrder,
        updatedAt: Timestamp.now(),
      })
    })
  } catch (error) {
    await releaseStockReservation({
      uid,
      reservationId: reservation.id,
      reason: 'Payment order could not be attached to the stock reservation',
    })
    throw error
  }
  return {
    environment,
    keyId,
    quote,
    reservation: {
      id: reservation.id,
      expiresAt: new Date(timestampMillis(reservation.expiresAt)).toISOString(),
    },
    order: gatewayOrder,
  }
}

async function refundCapturedRazorpayPayment(payment, intent, reason) {
  if (
    String(payment?.status) === 'refunded' ||
    Number(payment?.amount_refunded || 0) >= Number(intent.amount)
  ) {
    return {
      id: '',
      amount: Number(intent.amount),
      status: 'processed',
      createdAt: null,
    }
  }
  if (String(payment?.status) !== 'captured') return null
  let response
  let refund
  try {
    response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.id)}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: razorpayAuthorization(),
        },
        body: JSON.stringify({
          amount: Number(intent.amount),
          notes: {
            reason: String(reason).slice(0, 200),
            reservation_id: String(intent.reservationId || '').slice(0, 200),
          },
        }),
      },
    )
    refund = await response.json()
  } catch (error) {
    throw new Error('Unable to reach Razorpay while refunding the late payment.', {
      cause: error,
    })
  }
  if (!response.ok) {
    try {
      const paymentResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.id)}`,
        { headers: { Authorization: razorpayAuthorization() } },
      )
      const refreshedPayment = await paymentResponse.json()
      if (
        paymentResponse.ok &&
        (
          refreshedPayment.status === 'refunded' ||
          Number(refreshedPayment.amount_refunded || 0) >= Number(intent.amount)
        )
      ) {
        return {
          id: '',
          amount: Number(intent.amount),
          status: 'processed',
          createdAt: null,
        }
      }
    } catch {
      // Preserve the original refund error below; a webhook retry will
      // reconcile the payment again.
    }
    throw new Error(refund?.error?.description || 'Razorpay rejected the refund.')
  }
  return {
    id: String(refund.id || ''),
    amount: Number(refund.amount || intent.amount),
    status: String(refund.status || 'processed'),
    createdAt: refund.created_at || null,
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
  const expectedSignature = createHmac('sha256', razorpayKeySecret.value())
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  if (!secureCompare(signature, expectedSignature)) {
    throw new HttpsError('permission-denied', 'Payment signature verification failed.')
  }
  if (intent.verified === true) {
    if (intent.paymentId !== paymentId || !intent.payment) {
      throw new HttpsError('failed-precondition', 'A different payment is already verified.')
    }
    return { verified: true, payment: intent.payment }
  }
  if (intent.consumed && !allowConsumed) {
    throw new HttpsError('already-exists', 'This payment has already been used for an order.')
  }
  if (!intent.reservationId) {
    throw new HttpsError('failed-precondition', 'This payment has no stock reservation.')
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

  const reservationReference = db.doc(`stockReservations/${intent.reservationId}`)
  const reservationDocument = await reservationReference.get()
  const reservation = reservationDocument.data()
  const paymentCreatedAt = Number(payment.created_at || 0) * 1000
  const paymentWasInReservationWindow =
    paymentCreatedAt > 0 && paymentCreatedAt <= timestampMillis(reservation?.expiresAt)
  if (
    !reservationDocument.exists ||
    reservation.userId !== uid ||
    reservation.status !== 'active' ||
    !paymentWasInReservationWindow
  ) {
    let refund = null
    let refundError = null
    try {
      refund = await refundCapturedRazorpayPayment(
        payment,
        intent,
        'Payment completed after the stock reservation was unavailable',
      )
    } catch (error) {
      refundError = error
      console.error('Late Razorpay payment requires refund attention', {
        orderId,
        paymentId,
        message: error.message,
      })
    }
    await intentReference.set({
      paymentId,
      paymentStatus: String(payment.status || ''),
      reservationStatus: reservation?.status || 'missing',
      refundStatus: refund ? 'processed' : refundError ? 'attention-required' : 'not-captured',
      ...(refund ? { refund } : {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    throw new HttpsError(
      'failed-precondition',
      refund
        ? 'The stock reservation expired, so the payment was refunded and no order was placed.'
        : 'The stock reservation expired before payment confirmation. No order was placed.',
    )
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

  try {
    await db.runTransaction(async (transaction) => {
      const [currentIntentDocument, currentReservationDocument] = await Promise.all([
        transaction.get(intentReference),
        transaction.get(reservationReference),
      ])
      const currentIntent = currentIntentDocument.data()
      const currentReservation = currentReservationDocument.data()
      if (
        currentIntentDocument.exists &&
        currentIntent.verified === true &&
        currentIntent.paymentId === paymentId
      ) {
        return
      }
      if (
        !currentIntentDocument.exists ||
        currentIntent.userId !== uid ||
        currentIntent.verified === true ||
        !currentReservationDocument.exists ||
        currentReservation.userId !== uid ||
        currentReservation.status !== 'active' ||
        paymentCreatedAt > timestampMillis(currentReservation.expiresAt)
      ) {
        throw new HttpsError(
          'failed-precondition',
          'The stock reservation is no longer available for this payment.',
        )
      }
      const verifiedAt = new Date().toISOString()
      transaction.update(intentReference, {
        paymentId,
        paymentStatus: savedPayment.status,
        payment: savedPayment,
        verified: true,
        verifiedAt,
        updatedAt: verifiedAt,
      })
      transaction.update(reservationReference, {
        status: 'payment-verified',
        paymentStatus: savedPayment.status,
        paymentId,
        verifiedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    })
  } catch (error) {
    let refund = null
    try {
      refund = await refundCapturedRazorpayPayment(
        payment,
        intent,
        'Stock reservation was released during payment verification',
      )
    } catch (refundError) {
      console.error('Captured Razorpay payment requires refund attention', {
        orderId,
        paymentId,
        message: refundError.message,
      })
    }
    await intentReference.set({
      paymentId,
      paymentStatus: savedPayment.status,
      refundStatus: refund
        ? 'processed'
        : savedPayment.status === 'captured'
          ? 'attention-required'
          : 'not-captured',
      ...(refund ? { refund } : {}),
      updatedAt: new Date().toISOString(),
    }, { merge: true })
    throw error
  }
  return { verified: true, payment: savedPayment }
}

exports.createRazorpayOrder = onCall(
  razorpayCallableOptions,
  createRazorpayOrderHandler,
)
exports.verifyRazorpayPayment = onCall(
  razorpayCallableOptions,
  verifyRazorpayPaymentHandler,
)
exports.releaseRazorpayReservation = onCall(
  callableOptions,
  releaseRazorpayReservationHandler,
)

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
    if (!['payment.authorized', 'payment.captured', 'payment.failed'].includes(event)) {
      response.status(200).json({ accepted: true })
      return
    }
    const payment = request.body?.payload?.payment?.entity || {}
    const orderId = String(payment.order_id || '').trim()
    const paymentId = String(payment.id || '').trim()
    const intentReference = db.doc(`paymentIntents/${orderId}`)
    try {
      const intentDocument = await intentReference.get()
      const intent = intentDocument.data()
      if (!intentDocument.exists || !intent?.userId || !intent?.checkoutOrder) {
        throw new Error('Payment intent not found.')
      }
      if (event === 'payment.failed') {
        let releaseResult = { released: false }
        if (intent.reservationId) {
          releaseResult = await releaseStockReservation({
            uid: intent.userId,
            reservationId: intent.reservationId,
            reason: 'Razorpay reported payment failure',
          })
        }
        if (releaseResult.released) {
          await intentReference.set({
            paymentId,
            paymentStatus: 'failed',
            failedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true })
        }
        response.status(200).json({ accepted: true })
        return
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
      let latestIntent = null
      if (RAZORPAY_ORDER_PATTERN.test(orderId)) {
        try {
          latestIntent = (await intentReference.get()).data()
        } catch {
          latestIntent = null
        }
      }
      if (
        ['released', 'expired'].includes(latestIntent?.reservationStatus) &&
        ['processed', 'not-captured'].includes(latestIntent?.refundStatus)
      ) {
        response.status(200).json({ accepted: true, orderPlaced: false })
        return
      }
      response.status(500).json({ accepted: false })
    }
  },
)

exports.releaseExpiredStockReservations = onSchedule(
  {
    schedule: 'every 10 minutes',
    region,
    timeZone: 'Asia/Kolkata',
    retryCount: 3,
  },
  async () => {
    const expiredReservations = await db
      .collection('stockReservations')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', Timestamp.now())
      .limit(STOCK_RESERVATION_CLEANUP_LIMIT)
      .get()
    const results = await Promise.allSettled(
      expiredReservations.docs.map((document) =>
        releaseStockReservation({
          reservationId: document.id,
          reason: 'Payment was not verified before the reservation timeout',
          expired: true,
        }),
      ),
    )
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length) {
      console.error('Some expired stock reservations could not be released', {
        attempted: results.length,
        failed: failures.length,
      })
      throw new Error('Expired reservation cleanup was only partially successful.')
    }
  },
)

async function placeOrderHandler(request) {
  const uid = requireUser(request)
  const authUser = await adminAuth.getUser(uid)
  const submittedOrder = cleanObject(request.data?.order)
  if (
    authUser.disabled &&
    /cash|cod/i.test(submittedOrder.paymentMethod || '')
  ) {
    throw new HttpsError('permission-denied', 'This customer account is suspended.')
  }
  const items = normalizeOrderItems(submittedOrder.items)
  const requestId = String(submittedOrder.clientRequestId || '').trim()
  if (!ORDER_REQUEST_PATTERN.test(requestId)) {
    throw new HttpsError('invalid-argument', 'Restart checkout and try again.')
  }
  let shippingAddress = validateShippingAddress(submittedOrder.shippingAddress)
  let billingAddress = submittedOrder.billingAddress
    ? validateShippingAddress(submittedOrder.billingAddress)
    : shippingAddress
  let checkoutMode = submittedOrder.checkoutMode === 'buy-now'
    ? 'buy-now'
    : 'cart'
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
    let stockReservationReference = null
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
      if (!paymentIntent.reservationId) {
        throw new HttpsError('failed-precondition', 'The payment has no stock reservation.')
      }
      stockReservationReference = db.doc(
        `stockReservations/${paymentIntent.reservationId}`,
      )
      const stockReservationDocument = await transaction.get(stockReservationReference)
      const stockReservation = stockReservationDocument.data()
      const paymentCreatedAt = Number(paymentIntent.payment?.createdAt || 0) * 1000
      if (
        !stockReservationDocument.exists ||
        stockReservation.userId !== uid ||
        stockReservation.requestId !== requestId ||
        stockReservation.status !== 'payment-verified' ||
        stockReservation.itemSignature !== itemSignature(items) ||
        paymentCreatedAt <= 0 ||
        paymentCreatedAt > timestampMillis(stockReservation.expiresAt)
      ) {
        throw new HttpsError(
          'failed-precondition',
          'The verified payment does not have an active stock reservation.',
        )
      }
      if (paymentIntent.checkoutOrder) {
        checkoutMode = paymentIntent.checkoutOrder.checkoutMode === 'buy-now'
          ? 'buy-now'
          : 'cart'
        shippingAddress = validateShippingAddress(
          paymentIntent.checkoutOrder.shippingAddress,
        )
        billingAddress = paymentIntent.checkoutOrder.billingAddress
          ? validateShippingAddress(paymentIntent.checkoutOrder.billingAddress)
          : shippingAddress
      }
    }

    productDocuments.forEach((productDocument, index) => {
      if (!isCashOnDelivery) return
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
    if (isCashOnDelivery) {
      quote.items.forEach((quotedItem, index) => {
        const productDocument = productDocuments[index]
        const product = inventoryUpdates.get(productDocument.id) || cleanObject(productDocument.data())
        const quantity = quotedItem.qty
        const inventory = inventoryForItem(product, quotedItem) || product
        const reservedBefore = Number(inventory.reservedStock || 0)
        const stock = Number(inventory.stock || 0)
        inventory.reservedStock = reservedBefore + quantity
        syncVariantReservedStock(product)
        inventoryUpdates.set(productDocument.id, product)
        const historyReference = db.collection('inventoryHistory').doc()
        transaction.create(historyReference, {
          productId: productDocument.id,
          productName: product.name || quotedItem.productName || '',
          variantId: quotedItem.variantId || '',
          variantName: quotedItem.variant || '',
          sku: quotedItem.sku || product.sku || '',
          action: 'Order reserved',
          quantity,
          stockBefore: stock,
          stockAfter: stock,
          reservedBefore,
          reservedAfter: reservedBefore + quantity,
          availableBefore: Math.max(0, stock - reservedBefore),
          availableAfter: Math.max(0, stock - reservedBefore - quantity),
          reference: orderReference.id,
          note: 'Stock reserved during Cash on Delivery order placement',
          timestamp: now,
          createdAt: now,
          updatedAt: now,
        })
      })
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
    if (stockReservationReference) {
      transaction.update(stockReservationReference, {
        status: 'consumed',
        orderId: orderReference.id,
        consumedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
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
    const requestedGstin = normalizeGstin(
      isCashOnDelivery
        ? submittedOrder.gstin || submittedOrder.gstDetails?.gstin
        : paymentIntent?.checkoutOrder?.gstin,
    )
    let gstProfile
    try {
      gstProfile = findReusableGstProfile(userDocument.data(), requestedGstin)
    } catch (error) {
      throw new HttpsError('failed-precondition', error.message)
    }
    const invoiceSettings = normalizeInvoiceSettings(
      invoiceSettingsDocument.exists ? invoiceSettingsDocument.data() : {},
    )
    let invoice
    try {
      invoice = createInvoiceSnapshot({
        orderId: orderReference.id,
        invoiceSettings,
        invoiceDate: now,
        quote,
        customer: {
          name: authUser.displayName || userDocument.data()?.name || 'Pride customer',
          email: String(authUser.email || '').toLowerCase(),
          phone: userDocument.data()?.phone || '',
        },
        shippingAddress,
        billingAddress,
        gstProfile,
      })
    } catch (error) {
      throw new HttpsError('failed-precondition', error.message)
    }
    const order = {
      id: orderReference.id,
      clientRequestId: requestId,
      checkoutMode,
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
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      inventoryState: 'reserved',
      inventoryIssue: '',
      orderTime: new Date().toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      deliveryDate: String(submittedOrder.deliveryDate || 'Being scheduled').slice(0, 100),
      deliveryOption: quote.deliveryId === 'express' ? 'Express delivery' : 'Standard delivery',
      shippingAddress,
      billingAddress,
      gstDetails: gstProfile,
      gstBreakdown: invoice.tax,
      invoice,
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
          Number(invoiceSettings.numbering?.nextNumber) || 1,
        ) + 1,
        updatedAt: now,
      })
    }
    const remainingCartItems = removePurchasedCartItems(
      userDocument.data()?.cartItems,
      quote.items,
      checkoutMode,
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

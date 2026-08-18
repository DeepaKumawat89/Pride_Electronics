const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')
const { HttpsError, onCall } = require('firebase-functions/v2/https')

initializeApp()

const db = getFirestore()
const adminAuth = getAuth()
const firebaseWebApiKey =
  process.env.FIREBASE_WEB_API_KEY ||
  'AIzaSyDF4djFtrqwozdqnPA0iOhhJ08PZvpCauc'
const region = 'asia-south1'
const callableOptions = { region, invoker: 'public' }
const PHONE_PATTERN = /^[6-9]\d{9}$/

const cleanObject = (value) => JSON.parse(JSON.stringify(value || {}))

const parseMoney = (value) => {
  const parsed = Number(String(value || '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeOrderItems = (items) => {
  if (!Array.isArray(items) || !items.length || items.length > 50) {
    throw new HttpsError('invalid-argument', 'The order must contain products.')
  }
  return items.map((item) => {
    const productId = String(item?.productId || '').trim()
    const qty = Math.floor(Number(item?.qty || item?.quantity))
    if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 100) {
      throw new HttpsError('invalid-argument', 'The order contains an invalid product.')
    }
    return { ...cleanObject(item), productId, qty }
  })
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

const requireUser = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.')
  }
  return request.auth.uid
}

const requireAdmin = async (request) => {
  const uid = requireUser(request)
  if (request.auth.token.admin === true) return uid
  const adminDocument = await db.doc(`admins/${uid}`).get()
  if (!adminDocument.exists) {
    throw new HttpsError('permission-denied', 'Administrator access is required.')
  }
  return uid
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
    role: 'customer',
  }
})

exports.updateUserProfile = onCall(callableOptions, async (request) => {
  const operation = String(request.data?.operation || '')
  const operationRequest = operation
    ? { ...request, data: request.data?.payload || {} }
    : request
  if (operation === 'placeOrder') return placeOrderHandler(operationRequest)
  if (operation === 'getCouponUsage') return getMyCouponUsageHandler(operationRequest)
  if (operation === 'createReturn') return createReturnHandler(operationRequest)
  if (operation === 'cancelOrder') return cancelOrderHandler(operationRequest)
  if (operation === 'submitOrderFeedback') {
    return submitOrderFeedbackHandler(operationRequest)
  }
  if (operation === 'updateCustomerStatus') {
    return updateCustomerStatusHandler(operationRequest)
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

async function placeOrderHandler(request) {
  const uid = requireUser(request)
  const authUser = await adminAuth.getUser(uid)
  if (authUser.disabled) {
    throw new HttpsError('permission-denied', 'This customer account is suspended.')
  }
  const submittedOrder = cleanObject(request.data?.order)
  const items = normalizeOrderItems(submittedOrder.items)
  const orderReference = submittedOrder.id
    ? db.doc(`orders/${String(submittedOrder.id).slice(0, 80)}`)
    : db.collection('orders').doc()
  const now = new Date().toISOString()

  const savedOrder = await db.runTransaction(async (transaction) => {
    const existingOrder = await transaction.get(orderReference)
    if (existingOrder.exists) {
      throw new HttpsError('already-exists', 'This order has already been placed.')
    }

    const productReferences = items.map((item) => db.doc(`products/${item.productId}`))
    const productDocuments = []
    for (const productReference of productReferences) {
      productDocuments.push(await transaction.get(productReference))
    }
    const invoiceSettingsReference = db.doc('settings/invoice')
    const invoiceSettingsDocument = await transaction.get(invoiceSettingsReference)

    productDocuments.forEach((productDocument, index) => {
      if (!productDocument.exists || productDocument.data().enabled === false) {
        throw new HttpsError('failed-precondition', 'A product is no longer available.')
      }
      const product = productDocument.data()
      const available = Math.max(
        0,
        Number(product.stock || 0) - Number(product.reservedStock || 0),
      )
      if (available < items[index].qty) {
        throw new HttpsError('resource-exhausted', 'A product has insufficient stock.')
      }
    })

    let couponDocument = null
    let couponUsageReference = null
    let couponUsage = 0
    const couponCode = String(submittedOrder.couponCode || '').trim().toUpperCase()
    if (couponCode) {
      const couponQuery = db.collection('coupons').where('code', '==', couponCode).limit(1)
      const couponResult = await transaction.get(couponQuery)
      couponDocument = couponResult.docs[0] || null
      if (!couponDocument || couponDocument.data().enabled === false) {
        throw new HttpsError('failed-precondition', 'The selected coupon is no longer valid.')
      }
      const coupon = couponDocument.data()
      const currentTime = Date.now()
      if (
        (coupon.startDate && currentTime < new Date(`${coupon.startDate}T00:00:00`).getTime()) ||
        (coupon.endDate && currentTime > new Date(`${coupon.endDate}T23:59:59`).getTime())
      ) {
        throw new HttpsError('failed-precondition', 'The selected coupon is not active.')
      }
      if (Number(coupon.usageLimit) > 0 && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) {
        throw new HttpsError('failed-precondition', 'The selected coupon has reached its usage limit.')
      }
      couponUsageReference = db.doc(`couponUsages/${couponDocument.id}_${uid}`)
      const couponUsageDocument = await transaction.get(couponUsageReference)
      couponUsage = Number(couponUsageDocument.data()?.count || 0)
      if (Number(coupon.perUserLimit) > 0 && couponUsage >= Number(coupon.perUserLimit)) {
        throw new HttpsError('failed-precondition', 'You have reached this coupon usage limit.')
      }
    }

    productDocuments.forEach((productDocument, index) => {
      const product = productDocument.data()
      const quantity = items[index].qty
      const reservedBefore = Number(product.reservedStock || 0)
      transaction.update(productReferences[index], {
        reservedStock: FieldValue.increment(quantity),
        updatedAt: now,
      })
      const historyReference = db.collection('inventoryHistory').doc()
      transaction.create(historyReference, {
        productId: productDocument.id,
        productName: product.name || items[index].productName || '',
        sku: product.sku || items[index].sku || '',
        action: 'Order reserved',
        quantity,
        stockBefore: Number(product.stock || 0),
        stockAfter: Number(product.stock || 0),
        reservedBefore,
        reservedAfter: reservedBefore + quantity,
        availableBefore: Math.max(0, Number(product.stock || 0) - reservedBefore),
        availableAfter: Math.max(0, Number(product.stock || 0) - reservedBefore - quantity),
        reference: orderReference.id,
        note: 'Stock reserved during Firebase order placement',
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      })
    })

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

    const order = {
      ...submittedOrder,
      id: orderReference.id,
      userId: uid,
      customer: submittedOrder.customer || authUser.displayName || 'Pride customer',
      email: String(authUser.email || '').toLowerCase(),
      items,
      itemsCount: items.reduce((sum, item) => sum + item.qty, 0),
      status: 'Pending',
      invoiceNumber: invoiceSettingsDocument.exists
        ? invoiceNumberFor(
            invoiceSettingsDocument.data().numbering,
            submittedOrder.date || now,
          )
        : submittedOrder.invoiceNumber || '',
      inventoryState: 'reserved',
      createdAt: now,
      updatedAt: now,
      statusHistory: submittedOrder.statusHistory || [
        {
          status: 'Pending',
          timestamp: now,
          date: submittedOrder.date || now.slice(0, 10),
          time: submittedOrder.orderTime || '',
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
    transaction.set(
      db.doc(`users/${uid}`),
      {
        ordersCount: FieldValue.increment(1),
        totalSpentValue: FieldValue.increment(parseMoney(order.total)),
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
    items.forEach((item, index) => {
      const productReference = productReferences[index]
      const productDocument = productDocuments[index]
      if (productDocument.exists && order.inventoryState === 'reserved') {
        const product = productDocument.data()
        const reservedBefore = Number(product.reservedStock || 0)
        const reservedAfter = Math.max(0, reservedBefore - item.qty)
        transaction.update(productReference, {
          reservedStock: reservedAfter,
          updatedAt: now,
        })
        const historyReference = db.collection('inventoryHistory').doc()
        transaction.create(historyReference, {
          productId: productDocument.id,
          productName: product.name || item.productName || '',
          sku: product.sku || item.sku || '',
          action: 'Reservation released',
          quantity: item.qty,
          stockBefore: Number(product.stock || 0),
          stockAfter: Number(product.stock || 0),
          reservedBefore,
          reservedAfter,
          availableBefore: Math.max(0, Number(product.stock || 0) - reservedBefore),
          availableAfter: Math.max(0, Number(product.stock || 0) - reservedAfter),
          reference: orderId,
          note: 'Reservation released after customer cancellation',
          timestamp: now,
          createdAt: now,
          updatedAt: now,
        })
      }
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

async function submitOrderFeedbackHandler(request) {
  const uid = requireUser(request)
  const orderId = String(request.data?.orderId || '').trim()
  const feedback = cleanObject(request.data?.feedback)
  const rating = Math.max(1, Math.min(5, Math.round(Number(feedback.rating))))
  const reviewText = String(feedback.review || '').trim().slice(0, 2000)
  if (!rating || !reviewText) {
    throw new HttpsError('invalid-argument', 'A rating and review are required.')
  }
  const orderReference = db.doc(`orders/${orderId}`)
  const reviewReference = db.doc(`reviews/${orderId}`)
  const now = new Date().toISOString()
  const review = await db.runTransaction(async (transaction) => {
    const orderDocument = await transaction.get(orderReference)
    const order = assertOwnedOrder(orderDocument, uid)
    const existingReview = await transaction.get(reviewReference)
    if (existingReview.exists) {
      throw new HttpsError('already-exists', 'Feedback has already been submitted.')
    }
    const productName = order.items?.[0]?.productName || 'Order purchase'
    const name = order.customer || 'Pride customer'
    const value = {
      id: reviewReference.id,
      orderId,
      userId: uid,
      productId: order.items?.[0]?.productId || '',
      productName,
      name,
      initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
      rating,
      date: now.slice(0, 10),
      title: `Review for ${productName}`,
      text: reviewText,
      status: 'Pending',
      tone: 'bg-[#dcebdd] text-[#366643]',
      createdAt: now,
      updatedAt: now,
    }
    transaction.create(reviewReference, cleanObject(value))
    transaction.update(orderReference, { feedback: { rating, review: reviewText }, updatedAt: now })
    return value
  })
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

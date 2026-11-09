const {
  createHmac,
  randomUUID,
  Timestamp,
  db,
  HttpsError,
  requireUser,
  calculateOrderQuote,
  itemSignature,
  normalizePaymentConfiguration,
  payableAmountPaiseForQuote,
  razorpayEnvironmentForKey,
  validateMinimumOrderQuantities,
  normalizeInvoiceSettings,
  normalizeGstProfile,
  supplyTypeFor,
  requireActiveCustomer,
  razorpayKeyId,
  razorpayKeySecret,
  razorpayWebhookSecret,
  ORDER_REQUEST_PATTERN,
  RAZORPAY_ORDER_PATTERN,
  RAZORPAY_PAYMENT_PATTERN,
  RAZORPAY_SIGNATURE_PATTERN,
  STOCK_RESERVATION_TTL_MS,
  STOCK_RESERVATION_CLEANUP_LIMIT,
  STOCK_RESERVATION_CLEANUP_BATCHES,
  cleanObject,
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
} = require('../shared/core')
const { placeOrderHandler } = require('../orders/place-order-handler')

async function reserveCheckoutStock({
  uid,
  requestId,
  checkoutMode,
  requestedItems,
  requestData,
  shippingAddress,
  billingAddress,
  gstProfile,
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
    const [productDocuments, invoiceSettingsDocument, shippingSettingsDocument] =
      await Promise.all([
        Promise.all(productReferences.map((reference) => transaction.get(reference))),
        transaction.get(invoiceSettingsReference),
        transaction.get(shippingSettingsReference),
      ])
    if (!invoiceSettingsDocument.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Invoice settings must be configured before accepting orders.',
      )
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
    try {
      validateMinimumOrderQuantities(items, products)
    } catch (error) {
      throw checkoutError(error)
    }
    let quote
    try {
      const taxSettings = normalizeInvoiceSettings(invoiceSettingsDocument.data() || {}).tax
      quote = calculateOrderQuote({
        requestedItems: items,
        products,
        coupon: couponDocument
          ? { id: couponDocument.id, ...couponDocument.data() }
          : null,
        couponCode,
        shippingSettings: shippingSettingsDocument.data() || {},
        taxSettings,
        deliveryId: requestData.deliveryId,
        supplyType: supplyTypeFor(taxSettings, shippingAddress),
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
      transaction.update(
        db.doc(`products/${productId}`),
        inventoryUpdateFor(product, now),
      )
    })

    const checkoutOrder = {
      clientRequestId: requestId,
      checkoutMode,
      expectedTotalPaise: quote.totalPaise,
      shippingAddress,
      billingAddress,
      gstProfile,
      deliveryId: quote.deliveryId,
      deliveryMethod: quote.deliveryMethod,
      deliveryDetails: cleanObject(quote.deliveryDetails),
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
    }
    const orderReference = db.doc(
      `orders/${String(reservation.orderId || reservationReference.id)}`,
    )
    const orderDocument = await transaction.get(orderReference)
    const intent = paymentIntentDocument?.data()
    if (intent?.consumed === true || orderDocument.exists) {
      transaction.update(reservationReference, {
        status: 'consumed',
        orderId: String(intent?.consumedByOrderId || orderDocument.id),
        updatedAt: Timestamp.now(),
      })
      if (paymentIntentDocument?.exists) {
        transaction.update(paymentIntentDocument.ref, {
          reservationStatus: 'consumed',
          updatedAt: now,
        })
      }
      return { released: false, state: 'consumed' }
    }
    if (intent?.verified === true) {
      transaction.update(reservationReference, {
        status: 'payment-verified',
        updatedAt: Timestamp.now(),
      })
      transaction.update(paymentIntentDocument.ref, {
        reservationStatus: 'payment-verified',
        updatedAt: now,
      })
      return { released: false, state: 'payment-verified' }
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
      transaction.update(
        db.doc(`products/${productId}`),
        inventoryUpdateFor(product, now),
      )
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
  const uid = await requireActiveCustomer(request)
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
  const uid = await requireActiveCustomer(request)
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
  let gstProfile
  try {
    gstProfile = normalizeGstProfile(request.data?.gstProfile, billingAddress)
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message)
  }
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
    gstProfile,
  })
  const quote = reservation.quote
  let amount
  try {
    amount = payableAmountPaiseForQuote(quote)
  } catch {
    await releaseStockReservation({
      uid,
      reservationId: reservation.id,
      reason: 'Inconsistent authoritative payable amount',
    })
    throw new HttpsError(
      'data-loss',
      'The checkout total could not be verified. Restart checkout and try again.',
    )
  }
  if (reservation.reused && reservation.gatewayOrder) {
    if (
      Number(reservation.gatewayOrder.amount) !== amount ||
      String(reservation.gatewayOrder.currency) !== 'INR'
    ) {
      await releaseStockReservation({
        uid,
        reservationId: reservation.id,
        reason: 'Stored Razorpay order amount did not match the authoritative quote',
      })
      throw new HttpsError(
        'data-loss',
        'The existing payment amount no longer matches checkout. Restart checkout and try again.',
      )
    }
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
  const uid = request.allowDisabledCustomer === true
    ? requireUser(request)
    : await requireActiveCustomer(request)
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
  let authoritativeAmount
  try {
    authoritativeAmount = payableAmountPaiseForQuote(intent.quote)
  } catch {
    throw new HttpsError('data-loss', 'The stored payment total is inconsistent.')
  }
  if (
    authoritativeAmount !== Number(intent.amount) ||
    String(intent.currency) !== 'INR'
  ) {
    throw new HttpsError('data-loss', 'The stored payment amount does not match checkout.')
  }
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
        reservationStatus: 'payment-verified',
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

async function razorpayWebhookHandler(request, response) {
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
        allowDisabledCustomer: true,
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
        allowDisabledCustomer: true,
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
}

async function releaseExpiredStockReservationsHandler() {
    const cleanupStartedAt = Timestamp.now()
    let cursor = null
    let attempted = 0
    const failures = []
    for (let batch = 0; batch < STOCK_RESERVATION_CLEANUP_BATCHES; batch += 1) {
      let expiredQuery = db
        .collection('stockReservations')
        .where('status', '==', 'active')
        .where('expiresAt', '<=', cleanupStartedAt)
        .orderBy('expiresAt')
        .limit(STOCK_RESERVATION_CLEANUP_LIMIT)
      if (cursor) expiredQuery = expiredQuery.startAfter(cursor)
      const expiredReservations = await expiredQuery.get()
      if (expiredReservations.empty) break
      attempted += expiredReservations.size
      const results = await Promise.allSettled(
        expiredReservations.docs.map((document) =>
          releaseStockReservation({
            reservationId: document.id,
            reason: 'Payment was not verified before the reservation timeout',
            expired: true,
          }),
        ),
      )
      failures.push(...results.filter((result) => result.status === 'rejected'))
      cursor = expiredReservations.docs[expiredReservations.docs.length - 1]
      if (expiredReservations.size < STOCK_RESERVATION_CLEANUP_LIMIT) break
    }
    if (failures.length) {
      console.error('Some expired stock reservations could not be released', {
        attempted,
        failed: failures.length,
      })
      throw new Error('Expired reservation cleanup was only partially successful.')
    }
}


module.exports = {
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
  releaseRazorpayReservationHandler,
  razorpayWebhookHandler,
  releaseExpiredStockReservationsHandler,
}


const {
  FieldValue,
  Timestamp,
  db,
  adminAuth,
  HttpsError,
  requireUser,
  requireActiveCustomer,
  normalizeOrderItems,
  cleanObject,
  validateShippingAddress,
  normalizeGstProfile,
  normalizeInvoiceSettings,
  normalizePaymentConfiguration,
  calculateOrderQuote,
  checkoutError,
  supplyTypeFor,
  validateMinimumOrderQuantities,
  validateActiveCoupon,
  payableAmountPaiseForQuote,
  roundMoney,
  prepareNumberAllocation,
  numberingPeriodsFor,
  createInvoiceSnapshot,
  inventoryForItem,
  variantForItem,
  syncVariantReservedStock,
  itemSignature,
  formatOrderTotal,
  indiaOrderMoment,
  timestampMillis,
  ORDER_REQUEST_PATTERN,
  removePurchasedCartItems,
} = require('../shared/core')

async function placeOrderHandler(request) {
  const allowDisabledCustomer = request.allowDisabledCustomer === true
  const activeCustomer = allowDisabledCustomer
    ? null
    : await requireActiveCustomer(request, { includeAuthUser: true })
  const uid = activeCustomer?.uid || requireUser(request)
  const authUser = activeCustomer?.authUser || await adminAuth.getUser(uid)
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
  let gstProfile
  try {
    gstProfile = normalizeGstProfile(submittedOrder.gstProfile, billingAddress)
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message)
  }
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
    if (!invoiceSettingsDocument.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Invoice settings must be configured before accepting orders.',
      )
    }
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
        try {
          gstProfile = normalizeGstProfile(
            paymentIntent.checkoutOrder.gstProfile,
            billingAddress,
          )
        } catch (error) {
          throw new HttpsError('failed-precondition', error.message)
        }
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
    try {
      validateMinimumOrderQuantities(items, products)
    } catch (error) {
      throw checkoutError(error)
    }
    let quote
    if (isCashOnDelivery) {
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
          deliveryId: submittedOrder.deliveryId,
          supplyType: supplyTypeFor(taxSettings, shippingAddress),
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
      let authoritativeAmount
      try {
        authoritativeAmount = payableAmountPaiseForQuote(quote)
      } catch {
        throw new HttpsError('data-loss', 'The stored checkout total is inconsistent.')
      }
      if (
        !Array.isArray(quote.items) ||
        quote.itemSignature !== itemSignature(items) ||
        authoritativeAmount !== Number(paymentIntent.amount) ||
        authoritativeAmount !== Number(paymentIntent.payment?.amount)
      ) {
        throw new HttpsError('failed-precondition', 'The paid checkout details do not match this order.')
      }
    }

    const numberingPeriods = numberingPeriodsFor(now)
    const orderNumberAllocation = await prepareNumberAllocation({
      transaction,
      type: 'order',
      period: numberingPeriods.calendarYear,
      prefix: `PC-${numberingPeriods.calendarYear}-`,
      orderField: 'orderNumber',
      now,
    })
    const invoiceNumberAllocation = await prepareNumberAllocation({
      transaction,
      type: 'invoice',
      period: numberingPeriods.financialYear,
      prefix: `PC/${numberingPeriods.financialYear}/`,
      orderField: 'invoiceNumber',
      now,
    })
    transaction.set(
      orderNumberAllocation.reference,
      orderNumberAllocation.counter,
      { merge: true },
    )
    transaction.set(
      invoiceNumberAllocation.reference,
      invoiceNumberAllocation.counter,
      { merge: true },
    )

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
        transaction.update(
          db.doc(`products/${productId}`),
          inventoryUpdateFor(product, now),
        )
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
        reservationStatus: 'consumed',
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
    const orderStatus = isCashOnDelivery ? 'Pending' : 'Confirmed'
    const paymentEnvironment = paymentIntent?.environment === 'live'
      ? 'Razorpay'
      : 'Razorpay Test Mode'
    const paymentMethod = isCashOnDelivery
      ? 'Cash on Delivery'
      : `${String(verifiedPayment.method || 'Online payment').toUpperCase()} via ${paymentEnvironment}`
    const invoiceSettings = normalizeInvoiceSettings(
      invoiceSettingsDocument.exists ? invoiceSettingsDocument.data() : {},
    )
    const invoiceProductsById = new Map(
      productDocuments.map((document) => [document.id, document.data() || {}]),
    )
    const invoiceQuote = {
      ...quote,
      items: quote.items.map((item) => {
        const quotedHsnCode = String(item.hsnCode || '').trim()
        const currentHsnCode = String(
          invoiceProductsById.get(item.productId)?.hsnCode || '',
        ).trim()
        return {
          ...item,
          hsnCode: /^[0-9]{8}$/.test(quotedHsnCode)
            ? quotedHsnCode
            : /^[0-9]{8}$/.test(currentHsnCode)
              ? currentHsnCode
              : '',
        }
      }),
    }
    let invoice
    try {
      invoice = createInvoiceSnapshot({
        orderId: orderNumberAllocation.value,
        invoiceNumber: invoiceNumberAllocation.value,
        invoiceSettings,
        invoiceDate: now,
        quote: invoiceQuote,
        customer: {
          name: authUser.displayName || userDocument.data()?.name || 'Pride customer',
          email: String(authUser.email || '').toLowerCase(),
          phone: userDocument.data()?.phone || '',
        },
        shippingAddress,
        billingAddress,
        gstProfile,
        payment: {
          method: paymentMethod,
          status: paymentStatus,
          transactionId: isCashOnDelivery ? '' : String(paymentIntent.paymentId),
          paidAt: isCashOnDelivery ? '' : now,
        },
      })
    } catch (error) {
      throw new HttpsError('failed-precondition', error.message)
    }
    const invoiceTotalPaise = Math.round(Number(invoice.amounts.total) * 100)
    if (
      invoiceTotalPaise !== Number(quote.totalPaise) ||
      (!isCashOnDelivery && (
        invoiceTotalPaise !== Number(paymentIntent.amount) ||
        invoiceTotalPaise !== Number(verifiedPayment.amount)
      ))
    ) {
      throw new HttpsError(
        'data-loss',
        'The verified payment, order, and invoice totals do not match.',
      )
    }
    const orderItems = invoiceQuote.items.map((item, index) => {
      const invoiceLine = invoice.lineItems[index] || {}
      return {
        ...item,
        quantity: invoiceLine.quantity,
        hsnCode: invoiceLine.hsnCode || '',
        unitSellingPrice: invoiceLine.unitSellingPrice,
        grossAmount: invoiceLine.grossAmount,
        discount: invoiceLine.discount,
        productTotal: invoiceLine.productTotal,
        taxableValue: invoiceLine.taxableValue,
        gstRate: invoiceLine.gstRate,
        cgst: invoiceLine.cgst,
        sgst: invoiceLine.sgst,
        igst: invoiceLine.igst,
        lineTax: invoiceLine.lineTax,
        lineTotal: invoiceLine.lineTotal,
      }
    })
    const deliverySnapshot = {
      method: quote.deliveryId,
      label: quote.deliveryMethod,
      charges: Number(quote.shipping || 0),
      gst: Number(quote.shippingTax || 0),
      address: quote.deliveryId === 'office_pickup'
        ? String(quote.deliveryDetails?.pickupAddress || '')
        : quote.deliveryId === 'delivery_express'
          ? cleanObject(shippingAddress)
          : null,
      instructions: quote.deliveryId === 'porter'
        ? 'Customer will arrange and pay for Porter pickup.'
        : String(quote.deliveryDetails?.instructions || ''),
    }
    const placedMoment = indiaOrderMoment(now)
    const order = {
      id: orderReference.id,
      orderNumber: orderNumberAllocation.value,
      clientRequestId: requestId,
      checkoutMode,
      userId: uid,
      customer: authUser.displayName || 'Pride customer',
      email: String(authUser.email || '').toLowerCase(),
      date: placedMoment.date,
      total: formatOrderTotal(quote.total),
      totalValue: quote.total,
      totalPaise: Number(quote.totalPaise),
      subtotal: quote.sellingSubtotal,
      netSubtotal: invoice.amounts.netSubtotal,
      discount: quote.couponDiscount,
      deliveryCharges: quote.shipping,
      productTax: roundMoney(
        Number(invoice.amounts.totalGst || 0) - Number(invoice.amounts.shippingGst || 0),
      ),
      shippingTax: Number(invoice.amounts.shippingGst || 0),
      shippingTaxableValue: Number(invoice.tax.shippingTaxableValue || 0),
      shippingTaxRate: Number(invoice.tax.shippingGstRate || 0),
      shippingTaxTreatment: invoice.tax.shippingTaxTreatment,
      shippingCgst: Number(invoice.tax.shippingCgst || 0),
      shippingSgst: Number(invoice.tax.shippingSgst || 0),
      shippingIgst: Number(invoice.tax.shippingIgst || 0),
      taxAmount: quote.tax,
      pricingModel: quote.pricingModel,
      couponCode: quote.couponCode,
      deliveryId: quote.deliveryId,
      deliveryMethod: quote.deliveryId,
      deliveryMethodId: quote.deliveryId,
      deliveryMethodLabel: quote.deliveryMethod,
      delivery: cleanObject(deliverySnapshot),
      deliveryDetails: cleanObject(quote.deliveryDetails),
      items: orderItems,
      itemsCount: quote.items.reduce((sum, item) => sum + item.qty, 0),
      status: orderStatus,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      inventoryState: 'reserved',
      inventoryIssue: '',
      orderTime: placedMoment.time,
      deliveryDate: String(submittedOrder.deliveryDate || 'Being scheduled').slice(0, 100),
      deliveryOption: quote.deliveryMethod,
      shippingAddress,
      billingAddress,
      gstProfile,
      gstBreakdown: invoice.tax,
      paymentStatus,
      paymentAmountPaise: isCashOnDelivery ? 0 : Number(verifiedPayment.amount),
      paymentCurrency: isCashOnDelivery ? 'INR' : String(verifiedPayment.currency || 'INR'),
      paymentDate: isCashOnDelivery ? null : now,
      paymentMethod,
      paymentEnvironment: isCashOnDelivery ? 'Cash on Delivery' : paymentEnvironment,
      razorpayPaymentId: isCashOnDelivery ? '' : String(paymentIntent.paymentId),
      razorpayOrderId: isCashOnDelivery ? '' : String(paymentIntent.id),
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: orderStatus,
          ...placedMoment,
        },
      ],
    }
    transaction.create(db.doc(`invoices/${orderReference.id}`), {
      orderId: orderReference.id,
      userId: uid,
      invoice: cleanObject(invoice),
      createdAt: now,
      updatedAt: now,
    })
    transaction.create(orderReference, cleanObject(order))
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


module.exports = { placeOrderHandler }


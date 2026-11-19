const { createHash } = require('node:crypto')
const {
  FieldValue,
  db,
  cleanObject,
  indiaOrderMoment,
  removePurchasedCartItems,
} = require('../shared/core')
const { loadCouponReservation, confirmCouponReservation } = require('./coupon-reservations')

const terminalPaidStates = new Set([
  'paid', 'successful', 'captured', 'refund pending', 'refund processing',
  'refund action required', 'refunded', 'refund failed',
])

const eventReferenceFor = (providerOrderId, paymentId, paymentStatus) =>
  db.doc(`cashfreeWebhookEvents/${createHash('sha256')
    .update(`${providerOrderId}:${paymentId}:${paymentStatus}`).digest('hex')}`)

async function applyVerifiedCashfreePayment({
  orderReference,
  providerOrderId,
  payment,
}) {
  const paymentId = String(payment?.cf_payment_id || '')
  const paymentStatus = String(payment?.payment_status || '').toUpperCase()
  if (!paymentId || !['SUCCESS', 'FAILED', 'PENDING', 'USER_DROPPED'].includes(paymentStatus)) {
    throw new Error('Cashfree returned an unsupported payment status.')
  }
  const paymentAmountPaise = Math.round(Number(payment.payment_amount) * 100)
  if (!Number.isSafeInteger(paymentAmountPaise)) {
    throw new Error('Cashfree returned an invalid payment amount.')
  }
  if (String(payment.payment_currency || '').toUpperCase() !== 'INR') {
    throw new Error('Cashfree returned an unexpected payment currency.')
  }

  const eventReference = eventReferenceFor(providerOrderId, paymentId, paymentStatus)
  const now = new Date().toISOString()
  return db.runTransaction(async (transaction) => {
    const [eventDocument, orderDocument] = await Promise.all([
      transaction.get(eventReference),
      transaction.get(orderReference),
    ])
    if (!orderDocument.exists) throw new Error('Pride Circuit order was not found.')
    const order = orderDocument.data()
    if (order.paymentMethod !== 'Cashfree' || order.cashfreeOrderId !== providerOrderId) {
      throw new Error('Cashfree payment does not match the Pride Circuit order.')
    }
    if (paymentAmountPaise !== Number(order.totalPaise)) {
      throw new Error('Cashfree payment amount does not match the order total.')
    }
    const couponReservationState = await loadCouponReservation(transaction, orderDocument.id)
    if (eventDocument.exists) return {
      order: { ...order, id: orderDocument.id }, duplicateEvent: true,
      requiresRefund: paymentStatus === 'SUCCESS' && (
        order.status === 'Cancelled' || order.inventoryState === 'released' ||
        (terminalPaidStates.has(String(order.paymentStatus || '').toLowerCase()) && order.transactionId !== paymentId)
      ),
    }

    const alreadyPaid = terminalPaidStates.has(String(order.paymentStatus || '').toLowerCase())
    const successful = paymentStatus === 'SUCCESS'
    const differentSuccessfulPayment = successful && alreadyPaid && order.transactionId !== paymentId
    const lateSuccessfulPayment = successful && (
      order.status === 'Cancelled' || order.inventoryState === 'released'
    )
    const invoiceReference = db.doc(`invoices/${orderDocument.id}`)
    const invoiceDocument = await transaction.get(invoiceReference)
    const paymentDate = successful
      ? String(payment.payment_time || now)
      : order.paymentDate || null
    const nextPaymentStatus = alreadyPaid
      ? order.paymentStatus
      : lateSuccessfulPayment
        ? 'Paid'
      : ({ SUCCESS: 'Paid', FAILED: 'Failed', PENDING: 'Pending', USER_DROPPED: 'Cancelled' })[paymentStatus]
    const shouldConfirmOrder = successful && !alreadyPaid && !lateSuccessfulPayment && order.status === 'Pending'
    let userDocument = null
    let couponDocument = null
    let couponUsageDocument = null
    const userReference = db.doc(`users/${order.userId}`)
    const couponQuery = order.couponCode
      ? db.collection('coupons')
        .where('code', '==', String(order.couponCode).trim().toUpperCase())
        .limit(1)
      : null
    let couponUsageReference = null
    if (shouldConfirmOrder) {
      userDocument = await transaction.get(userReference)
      if (couponQuery && !couponReservationState.active) {
        const couponResults = await transaction.get(couponQuery)
        couponDocument = couponResults.docs[0] || null
        if (couponDocument) {
          couponUsageReference = db.doc(`couponUsages/${couponDocument.id}_${order.userId}`)
          couponUsageDocument = await transaction.get(couponUsageReference)
        }
      }
    }

    transaction.create(eventReference, {
      provider: 'cashfree',
      providerOrderId,
      providerPaymentId: paymentId,
      paymentStatus,
      createdAt: now,
    })
    transaction.update(orderReference, cleanObject({
      paymentStatus: nextPaymentStatus,
      paymentAmountPaise: successful ? paymentAmountPaise : Number(order.paymentAmountPaise || 0),
      paymentCurrency: 'INR',
      paymentDate: successful && !alreadyPaid ? paymentDate : order.paymentDate || null,
      transactionId: successful && !alreadyPaid ? paymentId : order.transactionId || '',
      paymentMethodDetail: payment.payment_group || order.paymentMethodDetail || '',
      ...(lateSuccessfulPayment ? {
        paymentException: 'Payment succeeded after cancellation or stock release; refund reconciliation is required.',
      } : {}),
      ...(differentSuccessfulPayment ? {
        paymentException: 'A second Cashfree payment succeeded for this order; refund reconciliation is required.',
        duplicateCashfreePaymentIds: [...new Set([
          ...(order.duplicateCashfreePaymentIds || []), paymentId,
        ])].slice(0, 10),
      } : {}),
      ...(shouldConfirmOrder ? {
        status: 'Confirmed',
        statusHistory: [...(order.statusHistory || []), {
          status: 'Confirmed', ...indiaOrderMoment(paymentDate),
        }],
      } : {}),
      updatedAt: now,
    }))

    if (successful && !alreadyPaid && invoiceDocument.exists) {
      const invoice = invoiceDocument.data().invoice || {}
      transaction.update(invoiceReference, {
        invoice: {
          ...invoice,
          payment: {
            ...(invoice.payment || {}),
            method: 'Cashfree',
            status: 'Paid',
            transactionId: paymentId,
            paidAt: paymentDate,
          },
        },
        updatedAt: now,
      })
    }
    if (shouldConfirmOrder) {
      if (userDocument?.exists) {
        transaction.set(userReference, {
          cartItems: removePurchasedCartItems(
            userDocument.data()?.cartItems,
            order.items,
            order.checkoutMode,
          ),
          ordersCount: FieldValue.increment(1),
          totalSpentValue: FieldValue.increment(Number(order.totalValue || 0)),
          lastOrderAt: now,
          updatedAt: now,
        }, { merge: true })
      }
      if (couponReservationState.active) {
        confirmCouponReservation(transaction, couponReservationState, now)
      } else if (couponDocument?.exists && couponUsageReference) {
        const currentUsage = Number(couponUsageDocument?.data()?.count || 0)
        transaction.update(couponDocument.ref, {
          usageCount: FieldValue.increment(1),
          updatedAt: now,
        })
        transaction.set(couponUsageReference, {
          couponId: couponDocument.id,
          code: order.couponCode,
          userId: order.userId,
          count: currentUsage + 1,
          updatedAt: now,
        }, { merge: true })
      }
    }
    return {
      order: {
        ...order,
        ...(shouldConfirmOrder ? { status: 'Confirmed' } : {}),
        paymentStatus: nextPaymentStatus,
        transactionId: successful && !alreadyPaid ? paymentId : order.transactionId || '',
        updatedAt: now,
      },
      duplicateEvent: false,
      requiresRefund: successful && (
        lateSuccessfulPayment || differentSuccessfulPayment
      ),
    }
  })
}

async function reconcileVerifiedCashfreePayment(args) {
  const result = await applyVerifiedCashfreePayment(args)
  if (result.requiresRefund) {
    const { requestVerifiedCashfreeRefund } = require('./cashfree-refund-service')
    await requestVerifiedCashfreeRefund(args.orderReference, result.order, args.payment)
  }
  return result
}

module.exports = { applyVerifiedCashfreePayment, reconcileVerifiedCashfreePayment }

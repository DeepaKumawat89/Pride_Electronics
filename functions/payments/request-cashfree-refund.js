const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { db, callableOptions, requireAdmin } = require('../shared/core')
const {
  cashfreeClientId,
  cashfreeClientSecret,
} = require('./cashfree-secrets')
const { getCashfreePayments } = require('./cashfree-api')
const { requestVerifiedCashfreeRefund } = require('./cashfree-refund-service')

async function requestCashfreeRefundHandler(request) {
  requireAdmin(request)
  const orderId = String(request.data?.orderId || '').trim()
  const orderReference = db.doc(`orders/${orderId}`)
  const orderDocument = await orderReference.get()
  if (!orderDocument.exists) throw new HttpsError('not-found', 'Order not found.')

  const order = orderDocument.data()
  const paymentStatus = String(order.paymentStatus || '').toLowerCase()
  const retryableStatuses = [
    'paid', 'successful', 'captured', 'refund pending', 'refund action required', 'refund failed',
  ]
  if (
    order.paymentMethod !== 'Cashfree' || !order.cashfreeOrderId ||
    !retryableStatuses.includes(paymentStatus)
  ) {
    throw new HttpsError('failed-precondition', 'Only paid Cashfree orders can be refunded.')
  }

  const paymentId = String(request.data?.paymentId || order.transactionId || '')
  if (!paymentId) throw new HttpsError('failed-precondition', 'A verified Cashfree payment is required.')

  let verifiedPayments
  try {
    verifiedPayments = await getCashfreePayments(order.cashfreeOrderId, {
      cashfreeClientId,
      cashfreeClientSecret,
    })
  } catch {
    throw new HttpsError('unavailable', 'Cashfree payment status could not be verified.')
  }
  const verifiedCharge = verifiedPayments.find((payment) =>
    String(payment.payment_status || '').toUpperCase() === 'SUCCESS' &&
    String(payment.cf_payment_id || '') === paymentId &&
    Math.round(Number(payment.payment_amount) * 100) === Number(order.totalPaise) &&
    String(payment.payment_currency || '').toUpperCase() === 'INR',
  )
  if (!verifiedCharge) {
    throw new HttpsError('failed-precondition', 'Cashfree does not confirm this payment as refundable.')
  }

  try {
    return await requestVerifiedCashfreeRefund(orderReference, order, verifiedCharge)
  } catch (error) {
    console.error('Cashfree admin refund requires reconciliation', {
      orderId: orderDocument.id,
      reason: String(error.message || 'refund_reconciliation_failed').slice(0, 120),
    })
    throw new HttpsError(
      'unavailable',
      'The refund status could not be confirmed. Review Cashfree before retrying.',
    )
  }
}

const requestCashfreeRefund = onCall({
  ...callableOptions,
  enforceAppCheck: true,
  secrets: [cashfreeClientId, cashfreeClientSecret],
}, requestCashfreeRefundHandler)

module.exports = { requestCashfreeRefund, requestCashfreeRefundHandler }

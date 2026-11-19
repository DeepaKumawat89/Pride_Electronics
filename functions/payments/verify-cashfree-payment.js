const { onCall, HttpsError } = require('firebase-functions/v2/https')
const {
  db,
  callableOptions,
  requireActiveCustomer,
} = require('../shared/core')
const {
  cashfreeClientId,
  cashfreeClientSecret,
} = require('./cashfree-secrets')
const { getCashfreePayments } = require('./cashfree-api')
const { reconcileVerifiedCashfreePayment } = require('./cashfree-settlement')

async function verifyCashfreePaymentHandler(request) {
  const uid = await requireActiveCustomer(request)
  const orderId = String(request.data?.orderId || '').trim()
  if (!orderId || orderId.length > 180) {
    throw new HttpsError('invalid-argument', 'A valid order is required.')
  }
  const orderReference = db.doc(`orders/${orderId}`)
  const orderDocument = await orderReference.get()
  if (!orderDocument.exists || orderDocument.data().userId !== uid) {
    throw new HttpsError('not-found', 'The requested order was not found.')
  }
  const order = orderDocument.data()
  if (order.paymentMethod !== 'Cashfree' || !order.cashfreeOrderId) {
    throw new HttpsError('failed-precondition', 'This order has no Cashfree payment.')
  }
  const payments = await getCashfreePayments(order.cashfreeOrderId, {
    cashfreeClientId,
    cashfreeClientSecret,
  })
  if (!payments.length) return { order: { ...order, id: orderDocument.id }, verified: false }
  let verified = false
  for (const payment of payments) {
    const status = String(payment.payment_status || '').toUpperCase()
    if (!['SUCCESS', 'FAILED', 'PENDING', 'USER_DROPPED'].includes(status)) continue
    await reconcileVerifiedCashfreePayment({
      orderReference,
      providerOrderId: order.cashfreeOrderId,
      payment,
    })
    if (status === 'SUCCESS') verified = true
  }
  const latestOrder = await orderReference.get()
  return {
    order: { ...latestOrder.data(), id: latestOrder.id },
    verified,
  }
}

const verifyCashfreePayment = onCall({
  ...callableOptions,
  enforceAppCheck: true,
  secrets: [cashfreeClientId, cashfreeClientSecret],
}, verifyCashfreePaymentHandler)

module.exports = { verifyCashfreePayment, verifyCashfreePaymentHandler }

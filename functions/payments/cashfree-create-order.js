const { createHash } = require('node:crypto')
const { db } = require('../shared/core')
const { cashfreeClientId, cashfreeClientSecret } = require('./cashfree-secrets')

const CASHFREE_API = 'https://sandbox.cashfree.com/pg'
const CASHFREE_API_VERSION = '2025-01-01'

const cashfreeIdsFor = (orderId) => {
  const hex = createHash('sha256').update(orderId).digest('hex')
  return {
    orderId: `pc_${hex.slice(0, 32)}`,
    idempotencyKey: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`,
  }
}

async function createCashfreePaymentOrder({ order, uid, authUser }) {
  if (order.paymentMethod !== 'Cashfree' || order.status !== 'Pending') {
    throw new Error('This Cashfree order is no longer available for payment.')
  }
  const orderReference = db.doc(`orders/${order.id}`)
  const { orderId: cashfreeOrderId, idempotencyKey } = cashfreeIdsFor(order.id)

  await orderReference.set({
    cashfreeOrderId,
    updatedAt: new Date().toISOString(),
  }, { merge: true })

  const userDocument = await db.doc(`users/${uid}`).get()
  const phone = String(order.shippingAddress?.phone || userDocument.data()?.phone || '')
    .replace(/\D/g, '')
    .slice(-10)
  if (!/^[6-9]\d{9}$/.test(phone)) {
    throw new Error('Add a valid 10-digit phone number to your account before paying online.')
  }

  const amountPaise = Number(order.totalPaise)
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error('The verified order amount is invalid.')
  }

  const response = await fetch(`${CASHFREE_API}/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-version': CASHFREE_API_VERSION,
      'x-client-id': cashfreeClientId.value(),
      'x-client-secret': cashfreeClientSecret.value(),
      'x-idempotency-key': idempotencyKey,
    },
    body: JSON.stringify({
      order_id: cashfreeOrderId,
      order_amount: amountPaise / 100,
      order_currency: 'INR',
      customer_details: {
        customer_id: uid,
        customer_name: String(authUser.displayName || order.customer || 'Pride customer').slice(0, 100),
        customer_email: String(authUser.email || order.email || '').toLowerCase(),
        customer_phone: phone,
      },
      order_note: `Pride Circuit ${order.orderNumber}`.slice(0, 250),
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.payment_session_id || result.order_id !== cashfreeOrderId) {
    console.error('Cashfree order creation failed', {
      orderId: order.id,
      status: response.status,
      code: result.code || '',
    })
    throw new Error('Cashfree could not start this payment. Your order is saved as pending; retry checkout or contact support.')
  }

  await orderReference.set({
    cashfreeOrderStatus: result.order_status || 'ACTIVE',
    updatedAt: new Date().toISOString(),
  }, { merge: true })

  return {
    order: { ...order, cashfreeOrderId, paymentEnvironment: 'Cashfree Sandbox' },
    paymentSessionId: result.payment_session_id,
    cashfreeMode: 'sandbox',
  }
}

module.exports = { createCashfreePaymentOrder }

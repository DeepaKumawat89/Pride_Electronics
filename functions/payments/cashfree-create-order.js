const { createHash } = require('node:crypto')
const { db } = require('../shared/core')
const {
  cashfreeClientId,
  cashfreeClientSecret,
  cashfreeWebhookUrl,
} = require('./cashfree-secrets')
const { CASHFREE_API, CASHFREE_API_VERSION } = require('./cashfree-api')
const CASHFREE_RETURN_URL = 'https://pridecircuit.in/order-success?order_id={order_id}'

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
  let notifyUrl
  try {
    notifyUrl = new URL(cashfreeWebhookUrl.value())
    if (notifyUrl.protocol !== 'https:' || !notifyUrl.hostname) throw new Error('Invalid URL')
  } catch {
    throw new Error('Cashfree webhook URL is not configured. Online payments are unavailable.')
  }

  const orderExpiryTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  await db.runTransaction(async (transaction) => {
    const currentOrder = await transaction.get(orderReference)
    if (!currentOrder.exists || currentOrder.data().status !== 'Pending' ||
        currentOrder.data().paymentMethod !== 'Cashfree') {
      throw new Error('This order is no longer available for payment.')
    }
    const existingProviderOrderId = currentOrder.data().cashfreeOrderId
    if (existingProviderOrderId && existingProviderOrderId !== cashfreeOrderId) {
      throw new Error('This order has a different Cashfree payment attempt.')
    }
    transaction.update(orderReference, {
      cashfreeOrderId,
      updatedAt: new Date().toISOString(),
    })
  })
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
      order_expiry_time: orderExpiryTime,
      customer_details: {
        customer_id: uid,
        customer_name: String(authUser.displayName || order.customer || 'Pride customer').slice(0, 100),
        customer_email: String(authUser.email || order.email || '').toLowerCase(),
        customer_phone: phone,
      },
      order_note: `Pride Circuit ${order.orderNumber}`.slice(0, 250),
      order_meta: {
        return_url: CASHFREE_RETURN_URL,
        notify_url: notifyUrl.toString(),
      },
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

  await db.runTransaction(async (transaction) => {
    const currentOrder = await transaction.get(orderReference)
    if (!currentOrder.exists || currentOrder.data().status !== 'Pending' ||
        currentOrder.data().cashfreeOrderId !== cashfreeOrderId) {
      throw new Error('This order was cancelled before payment could start.')
    }
    transaction.update(orderReference, {
      cashfreeOrderStatus: result.order_status || 'ACTIVE',
      paymentExpiresAt: orderExpiryTime,
      updatedAt: new Date().toISOString(),
    })
  })

  return {
    order: { ...order, cashfreeOrderId, paymentEnvironment: 'Cashfree Production' },
    paymentSessionId: result.payment_session_id,
    cashfreeMode: 'production',
  }
}

module.exports = { createCashfreePaymentOrder }

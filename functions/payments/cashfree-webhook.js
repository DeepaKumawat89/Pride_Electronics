const { createHash, createHmac, timingSafeEqual } = require('node:crypto')
const { FieldValue, db, onRequest, region, cleanObject, normalizeOrderItems, inventoryForItem, syncVariantReservedStock, inventoryUpdateFor, indiaOrderMoment } = require('../shared/core')
const { cashfreeClientSecret } = require('./cashfree-secrets')

const eventStatuses = {
  PAYMENT_SUCCESS_WEBHOOK: 'SUCCESS',
  PAYMENT_FAILED_WEBHOOK: 'FAILED',
  PAYMENT_PENDING_WEBHOOK: 'PENDING',
  PAYMENT_USER_DROPPED_WEBHOOK: 'USER_DROPPED',
}

const verifySignature = (request) => {
  const signature = String(request.get('x-webhook-signature') || '')
  const timestamp = String(request.get('x-webhook-timestamp') || '')
  const rawBody = request.rawBody
  if (!signature || !timestamp || !Buffer.isBuffer(rawBody) || !rawBody.length) return false
  const expected = createHmac('sha256', cashfreeClientSecret.value())
    .update(timestamp)
    .update(rawBody)
    .digest('base64')
  const suppliedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
}

async function cashfreePaymentWebhookHandler(request, response) {
  if (request.method !== 'POST') return response.status(405).send('Method not allowed')
  if (!verifySignature(request)) return response.status(401).send('Invalid signature')

  let payload
  try {
    payload = JSON.parse(request.rawBody.toString('utf8'))
  } catch {
    return response.status(400).send('Invalid payload')
  }
  const type = String(payload.type || payload.event_type || '')
  const expectedStatus = eventStatuses[type]
  const providerOrderId = String(payload.data?.order?.order_id || '')
  const payment = payload.data?.payment || {}
  const paymentId = String(payment.cf_payment_id || '')
  const paymentStatus = String(payment.payment_status || '').toUpperCase()
  if (!expectedStatus || !providerOrderId || !paymentId || paymentStatus !== expectedStatus) {
    return response.status(400).send('Unsupported payment event')
  }

  try {
    const matches = await db.collection('orders')
      .where('cashfreeOrderId', '==', providerOrderId)
      .limit(1)
      .get()
    if (matches.empty) return response.status(404).send('Order not found')
    const orderReference = matches.docs[0].ref
    const eventReference = db.doc(`cashfreeWebhookEvents/${createHash('sha256')
      .update(`${providerOrderId}:${paymentId}:${type}`).digest('hex')}`)
    const now = new Date().toISOString()

    await db.runTransaction(async (transaction) => {
      const [eventDocument, orderDocument] = await Promise.all([
        transaction.get(eventReference),
        transaction.get(orderReference),
      ])
      if (eventDocument.exists) return
      if (!orderDocument.exists) throw new Error('Order disappeared during payment processing.')
      const order = orderDocument.data()
      if (order.paymentMethod !== 'Cashfree' || order.cashfreeOrderId !== providerOrderId) {
        throw new Error('Cashfree order mapping mismatch.')
      }
      const reportedAmount = payment.payment_amount ?? payload.data?.order?.order_amount
      const amountPaise = Math.round(Number(reportedAmount) * 100)
      const currency = String(payment.payment_currency || payload.data?.order?.order_currency || '').toUpperCase()
      if (!Number.isFinite(amountPaise) || amountPaise !== Number(order.totalPaise) || currency !== 'INR') {
        throw new Error('Cashfree payment amount or currency mismatch.')
      }

      const successful = expectedStatus === 'SUCCESS'
      const currentStatus = String(order.paymentStatus || '').toLowerCase()
      const alreadyPaid = ['paid', 'successful', 'captured'].includes(currentStatus)
      const invoiceReference = db.doc(`invoices/${orderDocument.id}`)
      const invoiceDocument = await transaction.get(invoiceReference)
      const paymentDate = successful ? String(payment.payment_time || now) : order.paymentDate || null
      const nextPaymentStatus = alreadyPaid ? order.paymentStatus : ({
        SUCCESS: 'Paid', FAILED: 'Failed', PENDING: 'Pending', USER_DROPPED: 'Cancelled',
      })[expectedStatus]
      const shouldConfirmOrder = successful && !alreadyPaid && order.status === 'Pending'
      const confirmedMoment = shouldConfirmOrder ? indiaOrderMoment(paymentDate) : null
      transaction.create(eventReference, {
        provider: 'cashfree',
        type,
        providerOrderId,
        providerPaymentId: paymentId,
        paymentStatus,
        createdAt: now,
      })
      transaction.update(orderReference, cleanObject({
        paymentStatus: nextPaymentStatus,
        paymentAmountPaise: successful ? amountPaise : Number(order.paymentAmountPaise || 0),
        paymentCurrency: 'INR',
        paymentDate: successful ? paymentDate : order.paymentDate || null,
        transactionId: successful && !alreadyPaid ? paymentId : order.transactionId || '',
        paymentMethodDetail: payment.payment_group || order.paymentMethodDetail || '',
        ...(successful && order.inventoryState === 'released' ? {
          paymentException: 'Payment confirmed after order cancellation or reservation release; review for refund.',
        } : {}),
        ...(successful && alreadyPaid && order.transactionId !== paymentId ? {
          paymentException: 'More than one Cashfree payment succeeded for this order; review for a duplicate charge.',
        } : {}),
        ...(shouldConfirmOrder ? {
          status: 'Confirmed',
          statusHistory: [ ...(order.statusHistory || []), { status: 'Confirmed', ...confirmedMoment } ],
        } : {}),
        updatedAt: now,
      }))
      if (successful && !alreadyPaid && invoiceDocument.exists) {
        const saved = invoiceDocument.data()
        transaction.update(invoiceReference, {
          invoice: {
            ...saved.invoice,
            payment: {
              ...(saved.invoice?.payment || {}),
              method: 'Cashfree',
              status: 'Paid',
              transactionId: paymentId,
              paidAt: paymentDate,
            },
          },
          updatedAt: now,
        })
      }
    })
    return response.status(200).send('OK')
  } catch (error) {
    console.error('Cashfree webhook processing failed', { message: error.message })
    return response.status(500).send('Webhook processing failed')
  }
}

const cashfreePaymentWebhook = onRequest({
  region,
  invoker: 'public',
  secrets: [cashfreeClientSecret],
}, cashfreePaymentWebhookHandler)

module.exports = { cashfreePaymentWebhook, cashfreePaymentWebhookHandler, verifySignature }

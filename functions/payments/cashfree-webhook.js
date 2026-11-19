const { createHash, createHmac, timingSafeEqual } = require('node:crypto')
const { db, onRequest, region } = require('../shared/core')
const { cashfreeClientId, cashfreeClientSecret } = require('./cashfree-secrets')
const { getCashfreePayments } = require('./cashfree-api')
const { reconcileVerifiedCashfreePayment } = require('./cashfree-settlement')
const {
  SUPPORTED_REFUND_STATUSES,
  reconcileCashfreeRefundWebhook,
} = require('./cashfree-refund-service')

const eventStatuses = {
  PAYMENT_SUCCESS_WEBHOOK: 'SUCCESS',
  PAYMENT_FAILED_WEBHOOK: 'FAILED',
  PAYMENT_PENDING_WEBHOOK: 'PENDING',
  PAYMENT_USER_DROPPED_WEBHOOK: 'USER_DROPPED',
}

const logWebhookRejection = (status, reason, details = {}) => {
  console.warn('Cashfree webhook request rejected', {
    status,
    reason,
    ...details,
  })
}

const boundedDiagnosticValue = (value) => String(value || '').slice(0, 64)

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
  if (request.method !== 'POST') {
    logWebhookRejection(405, 'method_not_allowed', {
      method: boundedDiagnosticValue(request.method),
    })
    return response.status(405).send('Method not allowed')
  }
  if (!verifySignature(request)) {
    logWebhookRejection(401, 'signature_verification_failed', {
      hasSignatureHeader: Boolean(request.get('x-webhook-signature')),
      hasTimestampHeader: Boolean(request.get('x-webhook-timestamp')),
      rawBodyBytes: Buffer.isBuffer(request.rawBody) ? request.rawBody.length : 0,
    })
    return response.status(401).send('Invalid signature')
  }

  let payload
  try {
    payload = JSON.parse(request.rawBody.toString('utf8'))
  } catch {
    logWebhookRejection(400, 'invalid_json_payload', {
      rawBodyBytes: request.rawBody.length,
      contentType: boundedDiagnosticValue(request.get('content-type')),
    })
    return response.status(400).send('Invalid payload')
  }
  const eventType = String(payload.type || payload.event_type || '')
  if (eventType === 'REFUND_STATUS_WEBHOOK') {
    const refundPayload = payload.data?.refund || {}
    const cashfreeRefundId = String(refundPayload.cf_refund_id || '')
    const merchantRefundId = String(refundPayload.refund_id || '')
    const providerRefundId = cashfreeRefundId || merchantRefundId
    const providerStatus = String(refundPayload.refund_status || '').toUpperCase()
    if (!providerRefundId || !SUPPORTED_REFUND_STATUSES.has(providerStatus) || providerStatus === 'REQUEST_FAILED') {
      logWebhookRejection(400, 'unsupported_refund_event', {
        eventType: boundedDiagnosticValue(eventType),
        refundStatus: boundedDiagnosticValue(providerStatus),
        hasRefundId: Boolean(providerRefundId),
      })
      return response.status(400).send('Unsupported refund event')
    }
    try {
      let refundMatches = await db.collection('refunds')
        .where('providerRefundId', '==', providerRefundId)
        .limit(1)
        .get()
      if (refundMatches.empty && merchantRefundId && merchantRefundId !== providerRefundId) {
        refundMatches = await db.collection('refunds')
          .where('refundId', '==', merchantRefundId)
          .limit(1)
          .get()
      } else if (refundMatches.empty && merchantRefundId) {
        refundMatches = await db.collection('refunds')
          .where('refundId', '==', merchantRefundId)
          .limit(1)
          .get()
      }
      if (refundMatches.empty) {
        logWebhookRejection(404, 'refund_not_found', {
          eventType: boundedDiagnosticValue(eventType),
          refundStatus: boundedDiagnosticValue(providerStatus),
        })
        return response.status(404).send('Refund not found')
      }
      const refundReference = refundMatches.docs[0].ref
      const eventId = createHash('sha256')
        .update(`${providerRefundId}:${providerStatus}:${payload.event_time || ''}`)
        .digest('hex')
      const eventReference = db.doc(`cashfreeRefundWebhookEvents/${eventId}`)
      await reconcileCashfreeRefundWebhook({
        refundReference,
        providerRefundId,
        providerStatus,
        eventReference,
      })
      return response.status(200).send('OK')
    } catch (error) {
      console.error('Cashfree refund webhook processing failed', { message: error.message })
      return response.status(500).send('Refund webhook processing failed')
    }
  }
  const expectedStatus = eventStatuses[String(payload.type || payload.event_type || '')]
  const providerOrderId = String(payload.data?.order?.order_id || '')
  const paymentId = String(payload.data?.payment?.cf_payment_id || '')
  const webhookStatus = String(payload.data?.payment?.payment_status || '').toUpperCase()
  if (!expectedStatus || !providerOrderId || !paymentId || webhookStatus !== expectedStatus) {
    logWebhookRejection(400, 'unsupported_payment_event', {
      eventType: boundedDiagnosticValue(eventType),
      paymentStatus: boundedDiagnosticValue(webhookStatus),
      hasOrderId: Boolean(providerOrderId),
      hasPaymentId: Boolean(paymentId),
    })
    return response.status(400).send('Unsupported payment event')
  }

  try {
    const matches = await db.collection('orders')
      .where('cashfreeOrderId', '==', providerOrderId)
      .limit(1)
      .get()
    if (matches.empty) {
      logWebhookRejection(404, 'order_not_found', {
        eventType: boundedDiagnosticValue(eventType),
        paymentStatus: boundedDiagnosticValue(webhookStatus),
      })
      return response.status(404).send('Order not found')
    }

    const providerPayments = await getCashfreePayments(providerOrderId, {
      cashfreeClientId,
      cashfreeClientSecret,
    })
    const verifiedPayment = providerPayments.find(
      (payment) => String(payment.cf_payment_id || '') === paymentId,
    )
    if (!verifiedPayment || !Object.values(eventStatuses).includes(
      String(verifiedPayment.payment_status || '').toUpperCase(),
    )) {
      logWebhookRejection(503, 'cashfree_payment_status_not_yet_verifiable', {
        eventType: boundedDiagnosticValue(eventType),
        paymentStatus: boundedDiagnosticValue(webhookStatus),
        paymentFound: Boolean(verifiedPayment),
      })
      return response.status(503).send('Payment status is not yet verifiable')
    }
    await reconcileVerifiedCashfreePayment({
      orderReference: matches.docs[0].ref,
      providerOrderId,
      payment: verifiedPayment,
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
  timeoutSeconds: 60,
  secrets: [cashfreeClientId, cashfreeClientSecret],
}, cashfreePaymentWebhookHandler)

module.exports = { cashfreePaymentWebhook, cashfreePaymentWebhookHandler, verifySignature }

const { onCall } = require('firebase-functions/v2/https')
const { callableOptions } = require('../shared/core')
const {
  cashfreeClientId,
  cashfreeClientSecret,
  cashfreePaymentsEnabled,
  cashfreeWebhookUrl,
} = require('./cashfree-secrets')
const { placeOrderHandler } = require('../orders/place-order-handler')
const { HttpsError } = require('firebase-functions/v2/https')

const createCashfreeOrder = onCall({
  ...callableOptions,
  enforceAppCheck: true,
  secrets: [cashfreeClientId, cashfreeClientSecret],
}, (request) => {
  if (!cashfreePaymentsEnabled.value()) {
    throw new HttpsError(
      'unavailable',
      'Online payments are temporarily unavailable. Please try again later.',
    )
  }
  if (!cashfreeWebhookUrl.value()) {
    throw new HttpsError('failed-precondition', 'Online payments are not configured yet.')
  }
  return placeOrderHandler({ ...request, allowCashfree: true })
})

module.exports = { createCashfreeOrder }

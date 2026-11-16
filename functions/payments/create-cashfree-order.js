const { onCall } = require('firebase-functions/v2/https')
const { callableOptions } = require('../shared/core')
const { cashfreeClientId, cashfreeClientSecret } = require('./cashfree-secrets')
const { placeOrderHandler } = require('../orders/place-order-handler')

const createCashfreeOrder = onCall({
  ...callableOptions,
  secrets: [cashfreeClientId, cashfreeClientSecret],
}, (request) => placeOrderHandler({ ...request, allowCashfree: true }))

module.exports = { createCashfreeOrder }

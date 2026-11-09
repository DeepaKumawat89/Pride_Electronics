const { onCall, callableOptions } = require('../shared/core')
const { placeOrderHandler } = require('./place-order-handler')

const placeOrder = onCall(callableOptions, placeOrderHandler)

module.exports = { placeOrder }


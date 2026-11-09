const { onCall, razorpayCallableOptions } = require('../shared/core')
const { createRazorpayOrderHandler } = require('./razorpay-handlers')

const createRazorpayOrder = onCall(
  razorpayCallableOptions,
  createRazorpayOrderHandler,
)

module.exports = { createRazorpayOrder }


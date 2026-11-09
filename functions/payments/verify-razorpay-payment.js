const { onCall, razorpayCallableOptions } = require('../shared/core')
const { verifyRazorpayPaymentHandler } = require('./razorpay-handlers')

const verifyRazorpayPayment = onCall(
  razorpayCallableOptions,
  verifyRazorpayPaymentHandler,
)

module.exports = { verifyRazorpayPayment }


const { onCall, callableOptions } = require('../shared/core')
const { releaseRazorpayReservationHandler } = require('./razorpay-handlers')

const releaseRazorpayReservation = onCall(
  callableOptions,
  releaseRazorpayReservationHandler,
)

module.exports = { releaseRazorpayReservation }


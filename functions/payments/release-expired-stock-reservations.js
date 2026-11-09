const { onSchedule, region } = require('../shared/core')
const {
  releaseExpiredStockReservationsHandler,
} = require('./razorpay-handlers')

const releaseExpiredStockReservations = onSchedule(
  {
    schedule: 'every 60 minutes',
    region,
    timeZone: 'Asia/Kolkata',
    retryCount: 3,
  },
  releaseExpiredStockReservationsHandler,
)

module.exports = { releaseExpiredStockReservations }


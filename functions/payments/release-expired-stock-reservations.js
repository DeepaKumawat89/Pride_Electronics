const { onSchedule, region } = require('../shared/core')
const { cashfreeClientId, cashfreeClientSecret } = require('./cashfree-secrets')
const {
  releaseExpiredStockReservationsHandler,
} = require('./reservation-cleanup')

const releaseExpiredStockReservations = onSchedule(
  {
    schedule: 'every 15 minutes',
    region,
    timeZone: 'Asia/Kolkata',
    retryCount: 3,
    secrets: [cashfreeClientId, cashfreeClientSecret],
  },
  releaseExpiredStockReservationsHandler,
)

module.exports = { releaseExpiredStockReservations }

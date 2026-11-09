const {
  onRequest,
  region,
  razorpayKeyId,
  razorpayKeySecret,
  razorpayWebhookSecret,
} = require('../shared/core')
const { razorpayWebhookHandler } = require('./razorpay-handlers')

const razorpayWebhook = onRequest(
  {
    region,
    invoker: 'public',
    secrets: [razorpayKeyId, razorpayKeySecret, razorpayWebhookSecret],
  },
  razorpayWebhookHandler,
)

module.exports = { razorpayWebhook }


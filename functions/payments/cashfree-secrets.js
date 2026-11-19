const {
  defineBoolean,
  defineSecret,
  defineString,
} = require('firebase-functions/params')

const cashfreeClientId = defineSecret('CASHFREE_CLIENT_ID')
const cashfreeClientSecret = defineSecret('CASHFREE_CLIENT_SECRET')
// Fail closed until production merchant credentials and dashboard setup are verified.
const cashfreePaymentsEnabled = defineBoolean('CASHFREE_PAYMENTS_ENABLED', {
  default: false,
})
// Must be set to the deployed HTTPS function URL before enabling production.
const cashfreeWebhookUrl = defineString('CASHFREE_WEBHOOK_URL', { default: '' })

module.exports = {
  cashfreeClientId,
  cashfreeClientSecret,
  cashfreePaymentsEnabled,
  cashfreeWebhookUrl,
}

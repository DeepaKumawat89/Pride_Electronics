const { defineSecret } = require('firebase-functions/params')

const cashfreeClientId = defineSecret('CASHFREE_CLIENT_ID')
const cashfreeClientSecret = defineSecret('CASHFREE_CLIENT_SECRET')

module.exports = { cashfreeClientId, cashfreeClientSecret }

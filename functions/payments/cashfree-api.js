const CASHFREE_API = 'https://api.cashfree.com/pg'
const CASHFREE_API_VERSION = '2026-01-01'

const cashfreeHeaders = ({ cashfreeClientId, cashfreeClientSecret, extra = {} }) => ({
  'content-type': 'application/json',
  'x-api-version': CASHFREE_API_VERSION,
  'x-client-id': cashfreeClientId.value(),
  'x-client-secret': cashfreeClientSecret.value(),
  ...extra,
})

async function getCashfreePayments(providerOrderId, credentials) {
  const response = await fetch(
    `${CASHFREE_API}/orders/${encodeURIComponent(providerOrderId)}/payments`,
    { method: 'GET', headers: cashfreeHeaders(credentials) },
  )
  const result = await response.json().catch(() => null)
  if (response.status === 404) return []
  if (!response.ok || !Array.isArray(result)) {
    console.error('Cashfree payment lookup failed', {
      status: response.status,
      providerOrderId,
    })
    throw new Error('Cashfree payment status could not be verified.')
  }
  return result
}

async function getCashfreeRefund(providerOrderId, refundId, credentials) {
  const response = await fetch(
    `${CASHFREE_API}/orders/${encodeURIComponent(providerOrderId)}/refunds/${encodeURIComponent(refundId)}`,
    { method: 'GET', headers: cashfreeHeaders(credentials) },
  )
  const result = await response.json().catch(() => null)
  if (response.status === 404) return null
  if (!response.ok || !result || typeof result !== 'object') {
    console.error('Cashfree refund lookup failed', { status: response.status })
    throw new Error('Cashfree refund status could not be verified.')
  }
  return Array.isArray(result) ? result[0] || null : result
}

async function createCashfreeRefund(providerOrderId, refund, credentials) {
  const response = await fetch(
    `${CASHFREE_API}/orders/${encodeURIComponent(providerOrderId)}/refunds`,
    {
      method: 'POST',
      headers: cashfreeHeaders({ ...credentials, extra: {
        'x-idempotency-key': refund.idempotencyKey,
      } }),
      body: JSON.stringify({
        refund_id: refund.refundId,
        refund_amount: refund.amountPaise / 100,
        refund_note: refund.note,
      }),
    },
  )
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error('Cashfree could not start the refund.')
    error.providerStatus = response.status
    throw error
  }
  return Array.isArray(result) ? result[0] || {} : result
}

module.exports = {
  CASHFREE_API,
  CASHFREE_API_VERSION,
  cashfreeHeaders,
  getCashfreePayments,
  getCashfreeRefund,
  createCashfreeRefund,
}

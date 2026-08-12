import { createHmac, timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'

const jsonHeaders = { 'Content-Type': 'application/json' }

function sendJson(response, status, payload) {
  response.writeHead(status, jsonHeaders)
  response.end(JSON.stringify(payload))
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 1_000_000) reject(new Error('Request body is too large'))
    })
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Invalid JSON request'))
      }
    })
    request.on('error', reject)
  })
}

function secureCompare(received, expected) {
  const receivedBuffer = Buffer.from(received || '', 'utf8')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function createRazorpayMiddleware({ keyId, keySecret }) {
  return async (request, response, next) => {
    if (!request.url?.startsWith('/api/razorpay/')) return next()
    if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed' })
    if (!keyId || !keySecret) return sendJson(response, 503, { error: 'Razorpay Test credentials are not configured on the server.' })
    if (!keyId.startsWith('rzp_test_')) return sendJson(response, 503, { error: 'Only a Razorpay Test Mode Key ID is allowed in this demo.' })

    try {
      const body = await readJson(request)

      if (request.url === '/api/razorpay/orders') {
        const amount = Number(body.amount)
        if (!Number.isInteger(amount) || amount < 100 || amount > 100_000_000) {
          return sendJson(response, 400, { error: 'Enter a valid payment amount.' })
        }

        const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            ...jsonHeaders,
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
          },
          body: JSON.stringify({
            amount,
            currency: 'INR',
            receipt: String(body.receipt || `pride_${Date.now()}`).slice(0, 40),
            notes: { source: 'Pride Electronics Test Checkout' },
          }),
        })
        const order = await razorpayResponse.json()
        if (!razorpayResponse.ok) return sendJson(response, razorpayResponse.status, { error: order.error?.description || 'Unable to create Razorpay order.' })
        return sendJson(response, 200, { keyId, order })
      }

      if (request.url === '/api/razorpay/verify') {
        const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body
        if (!orderId || !paymentId || !signature) return sendJson(response, 400, { error: 'Incomplete Razorpay payment response.' })
        const expectedSignature = createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
        if (!secureCompare(signature, expectedSignature)) return sendJson(response, 400, { error: 'Payment signature verification failed.' })
        return sendJson(response, 200, { verified: true })
      }

      return sendJson(response, 404, { error: 'API endpoint not found' })
    } catch (error) {
      return sendJson(response, 500, { error: error.message || 'Unexpected payment server error.' })
    }
  }
}

export function razorpayApiPlugin(credentials) {
  const middleware = createRazorpayMiddleware(credentials)
  return {
    name: 'pride-razorpay-test-api',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

const PINCODE_API_URL = 'https://api.pincodeapi.in/api/v1/pincode'
const INDIAN_PINCODE = /^[1-8]\d{5}$/
const REQUEST_TIMEOUT_MS = 10000

const pincodeCache = new Map()

export class AddressLookupError extends Error {
  constructor(message, code = 'lookup_failed') {
    super(message)
    this.name = 'AddressLookupError'
    this.code = code
  }
}

async function fetchJson(url, { signal, timeout = REQUEST_TIMEOUT_MS } = {}) {
  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abortFromCaller, { once: true })
  const timer = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      if (response.status === 400) {
        throw new AddressLookupError(
          'Enter a valid 6-digit Indian PIN code.',
          'invalid_pincode',
        )
      }
      if (response.status === 404) {
        throw new AddressLookupError(
          'This PIN code could not be matched to a valid Indian city and state.',
          'pincode_not_found',
        )
      }
      if (response.status === 429) {
        throw new AddressLookupError(
          'Too many PIN code requests. Please wait a moment and try again.',
          'rate_limited',
        )
      }
      throw new AddressLookupError(
        'The PIN code service is unavailable. Please try again.',
        'service_unavailable',
      )
    }
    return await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    if (timedOut) {
      throw new AddressLookupError(
        'The PIN code request timed out. Please try again.',
        'timeout',
      )
    }
    if (error instanceof AddressLookupError) throw error
    throw new AddressLookupError(
      'Unable to reach the PIN code service. Check your connection and try again.',
      'network_error',
    )
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

export async function lookupIndianPincode(pincode, { signal } = {}) {
  const normalizedPincode = String(pincode || '').trim()
  if (!INDIAN_PINCODE.test(normalizedPincode)) {
    throw new AddressLookupError(
      'Enter a valid 6-digit Indian PIN code.',
      'invalid_pincode',
    )
  }
  if (pincodeCache.has(normalizedPincode)) {
    return pincodeCache.get(normalizedPincode)
  }

  const data = await fetchJson(
    `${PINCODE_API_URL}/${encodeURIComponent(normalizedPincode)}`,
    { signal },
  )
  const matches = Array.isArray(data?.data?.post_offices)
    ? data.data.post_offices
    : []
  const match = matches.find(
    (entry) =>
      String(entry.pincode || '').trim() === normalizedPincode &&
      String(entry.district || '').trim() &&
      String(entry.state || '').trim(),
  )

  if (
    !data?.success ||
    String(data?.data?.pincode) !== normalizedPincode ||
    !match
  ) {
    throw new AddressLookupError(
      'This PIN code could not be matched to a valid Indian city and state.',
      'pincode_not_found',
    )
  }

  const result = {
    city: String(match.district).trim(),
    state: String(match.state).trim(),
    pincode: normalizedPincode,
  }
  pincodeCache.set(normalizedPincode, result)
  return result
}

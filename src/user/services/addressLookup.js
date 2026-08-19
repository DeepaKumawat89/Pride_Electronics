const GEOAPIFY_BASE_URL = 'https://api.geoapify.com/v1/geocode'
const PINCODE_API_URL = 'https://api.pincodeapi.in/api/v1/pincode'
const INDIAN_PINCODE = /^[1-8]\d{5}$/
const REQUEST_TIMEOUT_MS = 10000

const addressCache = new Map()
const pincodeCache = new Map()

export class AddressLookupError extends Error {
  constructor(message, code = 'lookup_failed') {
    super(message)
    this.name = 'AddressLookupError'
    this.code = code
  }
}

const getGeoapifyApiKey = () =>
  String(import.meta.env.VITE_GEOAPIFY_API_KEY || '').trim()

export const isGeoapifyConfigured = () => Boolean(getGeoapifyApiKey())

const requireGeoapifyApiKey = () => {
  const apiKey = getGeoapifyApiKey()
  if (!apiKey) {
    throw new AddressLookupError(
      'Address lookup is not configured. Please enter the address manually.',
      'not_configured',
    )
  }
  return apiKey
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
      if (response.status === 401 || response.status === 403) {
        throw new AddressLookupError(
          'Address lookup is temporarily unavailable. Please enter the address manually.',
          'unauthorized',
        )
      }
      if (response.status === 429) {
        throw new AddressLookupError(
          'Too many address requests. Please wait a moment and try again.',
          'rate_limited',
        )
      }
      throw new AddressLookupError(
        'The address service is unavailable. Please try again.',
        'service_unavailable',
      )
    }
    return await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    if (timedOut) {
      throw new AddressLookupError(
        'The address request timed out. Please try again.',
        'timeout',
      )
    }
    if (error instanceof AddressLookupError) throw error
    throw new AddressLookupError(
      'Unable to reach the address service. Check your connection and try again.',
      'network_error',
    )
  } finally {
    window.clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromCaller)
  }
}

function normalizeGeoapifyResult(result) {
  const properties = result.properties || result
  const coordinates = result.geometry?.coordinates || []
  const latitude = Number(properties.lat ?? coordinates[1])
  const longitude = Number(properties.lon ?? coordinates[0])
  const area =
    properties.suburb ||
    properties.district ||
    properties.city_district ||
    properties.county ||
    ''
  const city =
    properties.city ||
    properties.town ||
    properties.village ||
    properties.municipality ||
    properties.county ||
    ''
  const street =
    properties.street ||
    properties.name ||
    properties.address_line1 ||
    ''
  const label =
    properties.formatted ||
    [properties.address_line1, properties.address_line2]
      .filter(Boolean)
      .join(', ')

  return {
    id:
      properties.place_id ||
      `${latitude || 'unknown'}-${longitude || 'unknown'}-${label}`,
    label,
    name: properties.name || '',
    houseFlat: properties.housenumber || '',
    street,
    area,
    locality: area,
    city,
    state: properties.state || '',
    countryCode: String(properties.country_code || '').toLowerCase(),
    pincode: String(properties.postcode || '').replace(/\D/g, '').slice(0, 6),
    coordinates:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null,
  }
}

const getGeoapifyResults = (data) =>
  (data.results || data.features || [])
    .map(normalizeGeoapifyResult)
    .filter((result) => result.label)

export async function searchIndianAddresses(
  text,
  { signal, limit = 6, bias } = {},
) {
  const normalizedText = String(text || '').trim()
  if (normalizedText.length < 3) return []
  const cacheKey = `${normalizedText.toLowerCase()}-${bias?.latitude || ''}-${bias?.longitude || ''}`
  if (addressCache.has(cacheKey)) return addressCache.get(cacheKey)

  const params = new URLSearchParams({
    text: normalizedText,
    format: 'json',
    filter: 'countrycode:in',
    lang: 'en',
    limit: String(limit),
    apiKey: requireGeoapifyApiKey(),
  })
  if (Number.isFinite(bias?.latitude) && Number.isFinite(bias?.longitude)) {
    params.set('bias', `proximity:${bias.longitude},${bias.latitude}`)
  }

  const data = await fetchJson(
    `${GEOAPIFY_BASE_URL}/autocomplete?${params.toString()}`,
    { signal },
  )
  const results = getGeoapifyResults(data)
  addressCache.set(cacheKey, results)
  return results
}

export async function reverseGeocodeIndianCoordinates(
  latitude,
  longitude,
  { signal } = {},
) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    lang: 'en',
    apiKey: requireGeoapifyApiKey(),
  })
  const data = await fetchJson(
    `${GEOAPIFY_BASE_URL}/reverse?${params.toString()}`,
    { signal },
  )
  const [result] = getGeoapifyResults(data)
  if (!result) {
    throw new AddressLookupError(
      'We found your location but could not resolve a postal address.',
      'address_not_found',
    )
  }
  if (result.countryCode && result.countryCode !== 'in') {
    throw new AddressLookupError(
      'Your current location is outside the supported delivery country.',
      'outside_india',
    )
  }
  return result
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
    `${PINCODE_API_URL}/${encodeURIComponent(normalizedPincode)}?limit=100`,
    { signal },
  )
  const offices = Array.isArray(data?.data) ? data.data : []
  if (String(data?.status).toLowerCase() !== 'success' || !offices.length) {
    throw new AddressLookupError(
      'No post offices were found for this PIN code.',
      'pincode_not_found',
    )
  }

  const uniqueOffices = new Map()
  offices.forEach((office) => {
    const locality = String(office.officename || '').trim()
    if (!locality || uniqueOffices.has(locality.toLowerCase())) return
    const city = String(office.district || '').trim()
    const state = String(office.statename || '').trim()
    uniqueOffices.set(locality.toLowerCase(), {
      id: String(office.id || `${normalizedPincode}-${locality}`),
      label: [locality, city, state].filter(Boolean).join(', '),
      locality,
      city,
      district: city,
      state,
      pincode: normalizedPincode,
      branchType: office.officetype || '',
      deliveryStatus: office.delivery || '',
    })
  })

  const results = [...uniqueOffices.values()]
  pincodeCache.set(normalizedPincode, results)
  return results
}

export function getBrowserCoordinates() {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      reject(
        new AddressLookupError(
          'Current location requires a secure HTTPS connection.',
          'insecure_context',
        ),
      )
      return
    }
    if (!navigator.geolocation) {
      reject(
        new AddressLookupError(
          'Location services are not supported by this browser.',
          'unsupported',
        ),
      )
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (error) => {
        const messages = {
          1: 'Location permission was denied. Allow location access or enter the address manually.',
          2: 'Your current location could not be determined. Please try again.',
          3: 'Location detection timed out. Please try again.',
        }
        reject(
          new AddressLookupError(
            messages[error.code] || 'Unable to access your current location.',
            error.code === 1 ? 'permission_denied' : 'geolocation_failed',
          ),
        )
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    )
  })
}

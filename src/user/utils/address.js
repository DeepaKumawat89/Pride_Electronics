const INDIAN_PIN_CODE = /^[1-9]\d{5}$/
const INDIAN_MOBILE_NUMBER = /^[6-9]\d{9}$/

export function normalizeAddress(address = {}) {
  const hasStructuredAddress = Boolean(
    address.houseFlat || address.street || address.area,
  )
  const houseFlat = address.houseFlat || (!hasStructuredAddress ? address.line1 || '' : '')
  const street = address.street || ''
  const area = address.area || ''
  const line1 =
    [houseFlat, street, area].filter(Boolean).join(', ') || address.line1 || ''

  return {
    ...address,
    label: address.label === 'Work' ? 'Office' : address.label || 'Home',
    houseFlat,
    street,
    area,
    line1,
    landmark: String(address.landmark || '').trim(),
  }
}

export function getAddressValidationError(
  address = {},
  { addressType = 'delivery' } = {},
) {
  const normalized = normalizeAddress(address)
  const requiredFields = ['fullName', 'phone', 'line1', 'city', 'state', 'pincode']

  if (requiredFields.some((field) => !String(normalized[field] || '').trim())) {
    return `Please fill in all mandatory ${addressType} address fields.`
  }
  if (!INDIAN_MOBILE_NUMBER.test(String(normalized.phone || '').trim())) {
    return 'Enter a valid 10-digit Indian mobile number.'
  }
  if (!INDIAN_PIN_CODE.test(String(normalized.pincode || '').trim())) {
    return 'Enter a valid 6-digit Indian PIN code.'
  }
  return ''
}

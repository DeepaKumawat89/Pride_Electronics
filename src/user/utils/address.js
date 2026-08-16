const INDIAN_PIN_CODE = /^[1-8]\d{5}$/

const addBusinessDays = (value, days) => {
  const date = new Date(value)
  let remaining = days
  while (remaining > 0) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1
  }
  return date
}

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
  }
}

export function getPinDeliveryAvailability(pincode, now = new Date()) {
  const normalizedPincode = String(pincode || '').trim()
  if (!normalizedPincode) {
    return {
      status: 'unchecked',
      available: false,
      pincode: '',
      message: 'Enter a PIN code to check delivery availability.',
      estimatedDate: '',
      estimatedDateLabel: '',
    }
  }
  if (!INDIAN_PIN_CODE.test(normalizedPincode)) {
    return {
      status: normalizedPincode.length < 6 ? 'incomplete' : 'unavailable',
      available: false,
      pincode: normalizedPincode,
      message:
        normalizedPincode.length < 6
          ? 'Enter a valid 6-digit PIN code.'
          : 'Delivery is not available for this PIN code.',
      estimatedDate: '',
      estimatedDateLabel: '',
    }
  }

  const leadDays = 3 + (Number(normalizedPincode.at(-1)) % 3)
  const estimatedDate = addBusinessDays(now, leadDays)
  const estimatedDateLabel = estimatedDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return {
    status: 'available',
    available: true,
    pincode: normalizedPincode,
    message: `Delivery available. Estimated by ${estimatedDateLabel}.`,
    estimatedDate: estimatedDate.toISOString().slice(0, 10),
    estimatedDateLabel,
    leadDays,
  }
}

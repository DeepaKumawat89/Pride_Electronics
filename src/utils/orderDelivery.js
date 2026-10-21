export const OFFICE_PICKUP_ADDRESS = 'Office No. 237, 2nd Floor, XION Mall, Hinjewadi, Pune, MH 411057'

const methodAliases = {
  office_pickup: 'office_pickup',
  'office-pickup': 'office_pickup',
  'collect from office': 'office_pickup',
  porter: 'porter',
  'through porter': 'porter',
  delivery_express: 'delivery_express',
  'delivery-express': 'delivery_express',
  'delivery express': 'delivery_express',
}

const labels = {
  office_pickup: 'Office Pickup',
  porter: 'Porter',
  delivery_express: 'Express Delivery',
}

export const normalizeDeliveryMethod = (value) =>
  methodAliases[String(value || '').trim().toLowerCase()] || ''

export const formatOrderAddress = (address) => {
  if (!address) return ''
  if (typeof address === 'string') return address.trim()
  return [
    address.fullName,
    address.line1 || address.street,
    address.line2,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  ].filter(Boolean).join(', ')
}

export function getOrderDeliverySnapshot(order = {}) {
  const stored = order.delivery && typeof order.delivery === 'object'
    ? order.delivery
    : {}
  const method = normalizeDeliveryMethod(
    stored.method || order.deliveryMethodId || order.deliveryMethod || order.deliveryId,
  )
  if (!method) return null

  const charges = Number(stored.charges ?? order.deliveryCharges ?? 0)
  const gst = Number(stored.gst ?? order.shippingTax ?? 0)
  const address = method === 'office_pickup'
    ? stored.address || order.deliveryDetails?.pickupAddress || ''
    : method === 'delivery_express'
      ? stored.address || order.shippingAddress || null
      : null

  return {
    method,
    label: labels[method],
    charges: Number.isFinite(charges) ? charges : 0,
    gst: Number.isFinite(gst) ? gst : 0,
    address,
    formattedAddress: formatOrderAddress(address),
  }
}

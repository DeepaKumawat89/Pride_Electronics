export function parsePrice(price) {
  return Number(String(price).replace(/[^0-9.]/g, '')) || 0
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value)
}

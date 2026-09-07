export function parsePrice(price) {
  return Number(String(price).replace(/[^0-9.]/g, '')) || 0
}

export const hasValidPrice = (price) => parsePrice(price) > 0

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDiscount(value) {
  if (value === '' || value === null || value === undefined) return ''
  if (typeof value === 'number') return `${value}% off`
  const text = String(value).trim()
  return /^\d+(?:\.\d+)?$/.test(text) ? `${text}% off` : text
}

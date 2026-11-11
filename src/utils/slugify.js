export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getProductPath(product) {
  const identifier = product?.slug || product?.id || ''
  return `/product/${encodeURIComponent(String(identifier))}`
}

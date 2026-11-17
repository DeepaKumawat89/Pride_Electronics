export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\u00df/gi, 'ss')
    .replace(/[ßẞ]/g, 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ß]/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function getProductPath(product) {
  const identifier = product?.slug || product?.id || ''
  return `/product/${encodeURIComponent(String(identifier))}`
}

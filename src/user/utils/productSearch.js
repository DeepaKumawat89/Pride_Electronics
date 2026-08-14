const relatedSearchDefinitions = [
  {
    label: 'Earphones',
    query: 'earphones',
    keywords: 'ear earphone earphones earbuds headphones audio',
  },
  {
    label: 'Earbuds',
    query: 'earbuds',
    keywords: 'ear earbud earbuds earphones headphones audio wireless',
  },
  {
    label: 'Headphones',
    query: 'headphones',
    keywords: 'ear headphone headphones earphones earbuds audio anc',
  },
  {
    label: 'Smart watches',
    query: 'smart watch',
    keywords: 'watch watches wearable wearables fitness smart',
  },
  {
    label: 'Gaming accessories',
    query: 'gaming',
    keywords: 'gaming keyboard monitor peripherals accessories',
  },
  {
    label: 'PC components',
    query: 'components',
    keywords: 'pc diy component components cooler processor board',
  },
]

export function normalizeSearchQuery(value = '') {
  return value.trim().toLowerCase()
}

export function matchesProductQuery(product, query) {
  const normalizedQuery = normalizeSearchQuery(query)
  if (!normalizedQuery) return true

  const attributeValues = Object.values(product.attributes || {}).flat()
  return `${product.name} ${product.brand || ''} ${product.category} ${product.subcategory || ''} ${product.description} ${product.badge || ''} ${(product.features || []).join(' ')} ${attributeValues.join(' ')}`
    .toLowerCase()
    .includes(normalizedQuery)
}

export function getRelatedSearches(query, limit = 4) {
  const normalizedQuery = normalizeSearchQuery(query)
  if (!normalizedQuery) return []

  return relatedSearchDefinitions
    .filter(({ keywords }) => keywords.includes(normalizedQuery))
    .slice(0, limit)
}

const normalizedName = (value) => String(value || '').trim().toLowerCase()

const taxonomySlug = (value) =>
  normalizedName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'legacy'

const stableHash = (value) => {
  let hash = 0
  for (const character of String(value)) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return hash.toString(36)
}

export const categoryForProduct = (product, categories = []) => {
  const categoryId = String(product?.categoryId || '')
  if (categoryId) {
    const category = categories.find((item) => String(item.id) === categoryId)
    if (category) return category
  }

  const categoryName = normalizedName(product?.category)
  return categoryName
    ? categories.find((item) => normalizedName(item.name) === categoryName) || null
    : null
}

export const subcategoriesForCategory = (subcategories = [], categoryId = '') =>
  subcategories.filter(
    (subcategory) => String(subcategory.categoryId) === String(categoryId),
  )

export const subcategoryForProduct = (
  product,
  subcategories = [],
  category = null,
) => {
  const subcategoryId = String(product?.subcategoryId || '')
  if (subcategoryId) {
    const subcategory = subcategories.find(
      (item) => String(item.id) === subcategoryId,
    )
    if (
      subcategory &&
      (!category || String(subcategory.categoryId) === String(category.id))
    ) {
      return subcategory
    }
  }

  const subcategoryName = normalizedName(product?.subcategory)
  if (!subcategoryName) return null
  return (
    subcategories.find(
      (item) =>
        normalizedName(item.name) === subcategoryName &&
        (!category || String(item.categoryId) === String(category.id)),
    ) || null
  )
}

export const normalizeProductTaxonomy = (
  product,
  categories = [],
  subcategories = [],
) => {
  const category = categoryForProduct(product, categories)
  const subcategory = subcategoryForProduct(product, subcategories, category)

  return {
    ...product,
    categoryId: category?.id || product?.categoryId || '',
    category: category?.name || product?.category || '',
    subcategoryId: subcategory?.id || product?.subcategoryId || '',
    subcategory: subcategory?.name || product?.subcategory || '',
  }
}

export const legacyTaxonomyPatch = (
  product,
  categories = [],
  subcategories = [],
) => {
  const patch = {}
  const category = categoryForProduct(product, categories)
  if (
    category &&
    String(product?.categoryId || '') !== String(category.id)
  ) {
    patch.categoryId = category.id
  }
  if (category && String(product?.category || '') !== String(category.name)) {
    patch.category = category.name
  }

  const subcategory = subcategoryForProduct(product, subcategories, category)
  if (
    subcategory &&
    String(product?.subcategoryId || '') !== String(subcategory.id)
  ) {
    patch.subcategoryId = subcategory.id
  }
  if (
    subcategory &&
    String(product?.subcategory || '') !== String(subcategory.name)
  ) {
    patch.subcategory = subcategory.name
  }

  return patch
}

export const legacySubcategoriesForProducts = (
  products = [],
  categories = [],
  subcategories = [],
) => {
  const created = new Map()
  products.forEach((product) => {
    if (!product?.subcategory) return
    const category = categoryForProduct(product, categories)
    if (!category) return
    const existing = subcategoryForProduct(product, subcategories, category)
    if (existing) return

    const key = `${category.id}:${normalizedName(product.subcategory)}`
    if (created.has(key)) return
    created.set(key, {
      id: `subcategory-${taxonomySlug(product.subcategory)}-${stableHash(key)}`,
      categoryId: category.id,
      categoryName: category.name,
      name: String(product.subcategory).trim(),
      description: '',
      enabled: true,
      migratedFromLegacyProduct: true,
    })
  })
  return [...created.values()]
}

export const productBelongsToCategory = (product, category) =>
  Boolean(
    category &&
      (String(product?.categoryId || '') === String(category.id) ||
        (!product?.categoryId &&
          normalizedName(product?.category) === normalizedName(category.name))),
  )

export const productBelongsToSubcategory = (product, subcategory) => {
  if (!subcategory) return false
  if (String(product?.subcategoryId || '') === String(subcategory.id)) return true
  if (product?.subcategoryId) return false

  const categoryMatches = product?.categoryId
    ? String(product.categoryId) === String(subcategory.categoryId)
    : !subcategory.categoryName ||
      normalizedName(product?.category) === normalizedName(subcategory.categoryName)
  return (
    categoryMatches &&
    normalizedName(product?.subcategory) === normalizedName(subcategory.name)
  )
}

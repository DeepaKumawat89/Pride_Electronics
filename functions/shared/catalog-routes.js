const { slugify } = require('./slugify')

const stableIdSuffix = (value) => {
  const id = String(value || '')
  const readable = slugify(id)
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return `${readable || 'item'}-${hash.toString(36)}`
}

const routeEntries = (records = []) => {
  const active = records
    .filter((record) => record && record.enabled !== false)
    .sort((first, second) => String(first.id).localeCompare(String(second.id)))
  const baseCounts = new Map()
  active.forEach((record) => {
    const base = slugify(record.name) || stableIdSuffix(record.id)
    baseCounts.set(base, (baseCounts.get(base) || 0) + 1)
  })
  const used = new Set()
  return active.map((record) => {
    const base = slugify(record.name) || stableIdSuffix(record.id)
    let slug = baseCounts.get(base) > 1 ? `${base}-${stableIdSuffix(record.id)}` : base
    let attempt = 0
    while (used.has(slug)) {
      attempt += 1
      slug = `${base}-${stableIdSuffix(record.id)}-${attempt}`
    }
    used.add(slug)
    return { record, slug }
  })
}

const buildTaxonomyRoutes = (categories = [], subcategories = []) => {
  const categoryEntries = routeEntries(categories)
  return {
    categories: categoryEntries.map(({ record, slug }) => ({
      ...record,
      slug,
      path: `/product-category/${encodeURIComponent(slug)}/`,
    })),
    subcategories: categoryEntries.flatMap(({ record: category, slug: categorySlug }) =>
      routeEntries(
        subcategories.filter(
          (subcategory) => String(subcategory.categoryId) === String(category.id),
        ),
      ).map(({ record, slug }) => ({
        ...record,
        slug,
        categorySlug,
        path: `/product-category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(slug)}/`,
      })),
    ),
  }
}

exports.buildTaxonomyRoutes = buildTaxonomyRoutes

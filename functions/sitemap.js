const { getFirestore } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')
const { slugify } = require('./shared/slugify')

const SITE_URL = 'https://pridecircuit.in'
const db = getFirestore()

const textValue = (value) => String(value || '').trim()
const normalizedName = (value) => textValue(value).toLowerCase()

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const lastModified = (value) => {
  if (!value) return ''
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

const latestLastmod = (...values) =>
  values.filter(Boolean).sort().at(-1) || ''

const urlEntry = ({ path, lastmod = '' }) =>
  `  <url><loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`

const categoryForProduct = (product, categoryById, categoryByName) =>
  categoryById.get(product.categoryId) ||
  categoryByName.get(normalizedName(product.category)) ||
  null

const subcategoryForProduct = (
  product,
  category,
  subcategoryById,
  subcategories,
) => {
  const byId = product.subcategoryId
    ? subcategoryById.get(product.subcategoryId)
    : null
  if (
    byId &&
    (!category || String(byId.categoryId) === String(category.id))
  ) {
    return byId
  }

  const productSubcategoryName = normalizedName(product.subcategory)
  if (!productSubcategoryName) return null
  return (
    subcategories.find(
      (subcategory) =>
        normalizedName(subcategory.name) === productSubcategoryName &&
        (!category || String(subcategory.categoryId) === String(category.id)),
    ) || null
  )
}

const addUrl = (urlsByPath, path, lastmod = '') => {
  if (!path.startsWith('/') || path.includes('?') || path.includes('#')) return
  const existing = urlsByPath.get(path)
  urlsByPath.set(path, {
    path,
    lastmod: latestLastmod(existing?.lastmod, lastmod),
  })
}

exports.sitemap = onRequest(
  { region: 'asia-south1', invoker: 'public' },
  async (_request, response) => {
    try {
      const [
        productsSnapshot,
        categoriesSnapshot,
        subcategoriesSnapshot,
        marketingSnapshot,
      ] = await Promise.all([
        db.collection('products').get(),
        db.collection('categories').get(),
        db.collection('subcategories').get(),
        db.collection('settings').doc('marketing').get(),
      ])

      const categories = categoriesSnapshot.docs.map((document) => {
        const data = document.data() || {}
        return {
          id: document.id,
          name: textValue(data.name),
          enabled: data.enabled !== false,
          lastmod: lastModified(data.updatedAt || data.createdAt),
        }
      })
      const categoryById = new Map(
        categories.map((category) => [String(category.id), category]),
      )
      const categoryByName = new Map(
        categories
          .filter((category) => category.name)
          .map((category) => [normalizedName(category.name), category]),
      )

      const subcategories = subcategoriesSnapshot.docs.map((document) => {
        const data = document.data() || {}
        return {
          id: document.id,
          categoryId: textValue(data.categoryId),
          name: textValue(data.name),
          enabled: data.enabled !== false,
          lastmod: lastModified(data.updatedAt || data.createdAt),
        }
      })
      const subcategoryById = new Map(
        subcategories.map((subcategory) => [String(subcategory.id), subcategory]),
      )

      const publicProducts = productsSnapshot.docs
        .map((document) => {
          const data = document.data() || {}
          const product = {
            id: document.id,
            slug: textValue(data.slug),
            categoryId: textValue(data.categoryId),
            category: textValue(data.category),
            subcategoryId: textValue(data.subcategoryId),
            subcategory: textValue(data.subcategory),
            enabled: data.enabled !== false,
            lastmod: lastModified(data.updatedAt || data.createdAt),
          }
          const category = categoryForProduct(
            product,
            categoryById,
            categoryByName,
          )
          const subcategory = subcategoryForProduct(
            product,
            category,
            subcategoryById,
            subcategories,
          )
          return {
            ...product,
            categoryRecord: category,
            categoryName: category?.name || product.category,
            subcategoryRecord: subcategory,
          }
        })
        .filter(
          (product) =>
            product.enabled &&
            product.categoryRecord?.enabled !== false &&
            product.subcategoryRecord?.enabled !== false,
        )

      const publicProductLastmod = latestLastmod(
        ...publicProducts.map((product) => product.lastmod),
      )
      const publicCategoryLastmod = latestLastmod(
        ...categories
          .filter((category) => category.enabled)
          .map((category) => category.lastmod),
      )
      const publicSubcategoryLastmod = latestLastmod(
        ...subcategories
          .filter((subcategory) => {
            const category = categoryById.get(String(subcategory.categoryId))
            return subcategory.enabled && category?.enabled !== false
          })
          .map((subcategory) => subcategory.lastmod),
      )
      const marketingData = marketingSnapshot.exists
        ? marketingSnapshot.data() || {}
        : {}
      const homeLastmod = latestLastmod(
        lastModified(marketingData.updatedAt || marketingData.createdAt),
        publicProductLastmod,
        publicCategoryLastmod,
      )
      const catalogLastmod = latestLastmod(
        publicProductLastmod,
        publicCategoryLastmod,
        publicSubcategoryLastmod,
      )

      const urlsByPath = new Map()
      addUrl(urlsByPath, '/', homeLastmod)
      addUrl(urlsByPath, '/products', catalogLastmod)

      const categoryLastmodBySlug = new Map()
      categories
        .filter((category) => category.enabled && category.name)
        .forEach((category) => {
          const categorySlug = slugify(category.name)
          if (!categorySlug) return
          const subcategoryLastmod = latestLastmod(
            ...subcategories
              .filter(
                (subcategory) =>
                  String(subcategory.categoryId) === String(category.id) &&
                  subcategory.enabled,
              )
              .map((subcategory) => subcategory.lastmod),
          )
          categoryLastmodBySlug.set(
            categorySlug,
            latestLastmod(
              categoryLastmodBySlug.get(categorySlug),
              category.lastmod,
              subcategoryLastmod,
            ),
          )
        })

      publicProducts.forEach((product) => {
        const categorySlug = slugify(product.categoryName)
        if (categorySlug) {
          categoryLastmodBySlug.set(
            categorySlug,
            latestLastmod(
              categoryLastmodBySlug.get(categorySlug),
              product.categoryRecord?.lastmod,
              product.subcategoryRecord?.lastmod,
              product.lastmod,
            ),
          )
        }

        const identifier = product.slug || product.id
        if (identifier) {
          addUrl(
            urlsByPath,
            `/product/${encodeURIComponent(identifier)}`,
            product.lastmod,
          )
        }
      })

      categoryLastmodBySlug.forEach((lastmod, categorySlug) => {
        addUrl(
          urlsByPath,
          `/category/${encodeURIComponent(categorySlug)}`,
          lastmod,
        )
      })

      const urls = [...urlsByPath.values()].sort((first, second) => {
        if (first.path === '/') return -1
        if (second.path === '/') return 1
        if (first.path === '/products') return -1
        if (second.path === '/products') return 1
        return first.path.localeCompare(second.path)
      })
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(urlEntry),
        '</urlset>',
      ].join('\n')

      response
        .status(200)
        .set('Content-Type', 'application/xml; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300, s-maxage=300')
        .set('X-Content-Type-Options', 'nosniff')
        .send(xml)
    } catch (error) {
      console.error('Unable to generate sitemap.', error)
      response.status(500).type('text/plain').send('Unable to generate sitemap.')
    }
  },
)

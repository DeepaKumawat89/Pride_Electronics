const { getFirestore } = require('firebase-admin/firestore')
const { onRequest } = require('firebase-functions/v2/https')

const SITE_URL = 'https://pridecircuit.in'
const db = getFirestore()

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const urlEntry = (path) => `  <url><loc>${escapeXml(`${SITE_URL}${path}`)}</loc></url>`

exports.sitemap = onRequest(
  { region: 'asia-south1', invoker: 'public' },
  async (_request, response) => {
    try {
      const [productsSnapshot, categoriesSnapshot, subcategoriesSnapshot] = await Promise.all([
        db.collection('products').get(),
        db.collection('categories').get(),
        db.collection('subcategories').get(),
      ])

      const categoryRecords = categoriesSnapshot.docs.map((document) => ({
        id: document.id,
        name: String(document.data()?.name || '').trim(),
        enabled: document.data()?.enabled !== false,
      }))
      const categoryById = new Map(
        categoryRecords.map((category) => [category.id, category]),
      )
      const categoryByName = new Map(
        categoryRecords.map((category) => [category.name.toLowerCase(), category]),
      )
      const subcategoryRecords = subcategoriesSnapshot.docs.map((document) => ({
        id: document.id,
        categoryId: String(document.data()?.categoryId || ''),
        name: String(document.data()?.name || '').trim(),
        enabled: document.data()?.enabled !== false,
      }))
      const subcategoryById = new Map(
        subcategoryRecords.map((subcategory) => [subcategory.id, subcategory]),
      )
      const publicProducts = productsSnapshot.docs
        .map((document) => ({
          id: document.id,
          categoryId: String(document.data()?.categoryId || ''),
          category: String(document.data()?.category || '').trim(),
          subcategoryId: String(document.data()?.subcategoryId || ''),
          subcategory: String(document.data()?.subcategory || '').trim(),
          enabled: document.data()?.enabled !== false,
        }))
        .filter((product) => {
          const category =
            categoryById.get(product.categoryId) ||
            categoryByName.get(product.category.toLowerCase())
          const subcategory =
            (product.subcategoryId
              ? subcategoryById.get(product.subcategoryId)
              : null) ||
            subcategoryRecords.find(
              (item) =>
                item.name.toLowerCase() === product.subcategory.toLowerCase() &&
                (!category || item.categoryId === category.id),
            )
          return (
            product.enabled &&
            category?.enabled !== false &&
            subcategory?.enabled !== false
          )
        })

      const categoryNames = new Set(
        categoryRecords
          .filter((category) => category.enabled)
          .map((category) => category.name)
          .filter(Boolean),
      )
      publicProducts.forEach((product) => {
        if (product.category) categoryNames.add(product.category)
      })

      const categoryPaths = [...categoryNames]
        .map(slugify)
        .filter(Boolean)
        .sort()
        .map((slug) => `/category/${encodeURIComponent(slug)}`)
      const productPaths = publicProducts
        .map((product) => `/product/${encodeURIComponent(product.id)}`)
        .sort()

      const urls = [
        '/',
        '/products',
        ...categoryPaths,
        ...productPaths,
      ]
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
        .send(xml)
    } catch {
      response.status(500).type('text/plain').send('Unable to generate sitemap.')
    }
  },
)

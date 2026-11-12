const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./shared/core')
const { slugify } = require('./shared/slugify')

const SITE_URL = 'https://pridecircuit.in'
const CACHE_TTL_MS = 5 * 60 * 1000
let catalogCache = null

const text = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const escapeHtml = (value) =>
  text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const safeImage = (value) => {
  const image = text(value)
  return /^https:\/\//i.test(image) ? image : `${SITE_URL}/favicon-192x192.png`
}

const publicProduct = (document) => {
  const data = document.data() || {}
  return {
    id: document.id,
    slug: text(data.slug),
    name: text(data.name) || 'Electronic component',
    description: text(data.description),
    categoryId: text(data.categoryId),
    category: text(data.category),
    subcategoryId: text(data.subcategoryId),
    subcategory: text(data.subcategory),
    brand: text(data.brand || data.manufacturer),
    sku: text(data.sku),
    image: safeImage(data.image || data.images?.[0]),
    price: Number(data.price || data.basePrice || 0),
    stock: Math.max(0, Number(data.stock) || 0),
    enabled: data.enabled !== false,
  }
}

async function loadCatalog() {
  if (catalogCache && Date.now() - catalogCache.loadedAt < CACHE_TTL_MS) {
    return catalogCache.value
  }
  const pending = Promise.all([
    db.collection('products').get(),
    db.collection('categories').get(),
    db.collection('subcategories').get(),
  ]).then(([productSnapshot, categorySnapshot, subcategorySnapshot]) => {
    const categories = categorySnapshot.docs.map((document) => ({
      id: document.id,
      name: text(document.data()?.name),
      enabled: document.data()?.enabled !== false,
    }))
    const subcategories = subcategorySnapshot.docs.map((document) => ({
      id: document.id,
      categoryId: text(document.data()?.categoryId),
      enabled: document.data()?.enabled !== false,
    }))
    const categoryById = new Map(categories.map((category) => [category.id, category]))
    const categoryByName = new Map(
      categories.map((category) => [category.name.toLowerCase(), category]),
    )
    const subcategoryById = new Map(
      subcategories.map((subcategory) => [subcategory.id, subcategory]),
    )
    const products = productSnapshot.docs
      .map(publicProduct)
      .filter((product) => {
        const category = categoryById.get(product.categoryId) ||
          categoryByName.get(product.category.toLowerCase())
        const subcategory = subcategoryById.get(product.subcategoryId)
        return product.enabled && category?.enabled !== false && subcategory?.enabled !== false
      })
    return { products, categories: categories.filter((category) => category.enabled) }
  })
  catalogCache = { loadedAt: Date.now(), value: pending }
  try {
    const value = await pending
    catalogCache = { loadedAt: Date.now(), value }
    return value
  } catch (error) {
    catalogCache = null
    throw error
  }
}

const productPath = (product) =>
  `/product/${encodeURIComponent(product.slug || product.id)}`

const productCards = (products) => products.map((product) => `
  <article class="seo-card">
    <a href="${productPath(product)}">
      <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="320" height="240" loading="lazy">
      <h2>${escapeHtml(product.name)}</h2>
    </a>
    <p>${escapeHtml(product.category)}${product.subcategory ? ` · ${escapeHtml(product.subcategory)}` : ''}</p>
    ${product.description ? `<p>${escapeHtml(product.description.slice(0, 180))}</p>` : ''}
  </article>`).join('')

const pageHtml = ({ title, description, canonicalPath, content, schema, status = 200 }) => {
  const canonical = `${SITE_URL}${canonicalPath}`
  const safeTitle = escapeHtml(title)
  const safeDescription = escapeHtml(description)
  const schemaText = JSON.stringify(schema).replace(/</g, '\\u003c')
  return {
    status,
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}">
  <meta name="robots" content="${status === 200 ? 'index,follow' : 'noindex,follow'}">
  <link rel="canonical" href="${canonical}">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="Pride Circuit">
  <script type="application/ld+json">${schemaText}</script>
  <link rel="stylesheet" href="/assets/app.css">
  <style>
    #root{display:none}.seo-fallback{font-family:Arial,sans-serif;max-width:1280px;margin:auto;padding:32px 20px;color:#172019}.seo-nav{display:flex;gap:16px;flex-wrap:wrap}.seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;margin-top:28px}.seo-card{border:1px solid #dfe6df;border-radius:18px;padding:16px;background:#fff}.seo-card img{width:100%;height:180px;object-fit:contain}.seo-card a,.seo-nav a{color:#245c36}.seo-card h2{font-size:16px}.seo-card p{font-size:13px;line-height:1.5;color:#536057}html[data-pride-app-ready=true] #root{display:block}html[data-pride-app-ready=true] .seo-fallback{display:none}
  </style>
</head>
<body>
  <div id="root"></div>
  <main class="seo-fallback">
    <nav class="seo-nav" aria-label="Store"><a href="/">Home</a><a href="/products">All products</a></nav>
    ${content}
  </main>
  <script type="module" src="/assets/app.js"></script>
</body>
</html>`,
  }
}

function renderCatalogPage(products, category = '') {
  const categoryName = text(category)
  const filtered = categoryName
    ? products.filter((product) => slugify(product.category) === slugify(categoryName))
    : products
  const title = categoryName
    ? `${categoryName} Products | Pride Circuit`
    : 'Electronic Products Online | Pride Circuit'
  const description = categoryName
    ? `Shop ${categoryName} products online at Pride Circuit with clear pricing and reliable delivery across India.`
    : 'Browse genuine electronic components and industrial automation products online at Pride Circuit.'
  const canonicalPath = categoryName
    ? `/category/${encodeURIComponent(slugify(categoryName))}`
    : '/products'
  const itemList = filtered.slice(0, 100).map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: product.name,
    url: `${SITE_URL}${productPath(product)}`,
  }))
  return pageHtml({
    title,
    description,
    canonicalPath,
    content: `<h1>${escapeHtml(categoryName || 'Electronic products')}</h1><p>${escapeHtml(description)}</p><div class="seo-grid">${productCards(filtered)}</div>`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `${SITE_URL}${canonicalPath}`,
      mainEntity: { '@type': 'ItemList', numberOfItems: itemList.length, itemListElement: itemList },
    },
  })
}

function renderProductPage(product) {
  const canonicalPath = productPath(product)
  const description = product.description.slice(0, 160) || `Shop ${product.name} from Pride Circuit.`
  const offer = product.price > 0 ? {
    '@type': 'Offer',
    price: product.price.toFixed(2),
    priceCurrency: 'INR',
    availability: `https://schema.org/${product.stock > 0 ? 'InStock' : 'OutOfStock'}`,
    url: `${SITE_URL}${canonicalPath}`,
  } : undefined
  return pageHtml({
    title: `${product.name} | Pride Circuit`,
    description,
    canonicalPath,
    content: `<article><p><a href="/category/${encodeURIComponent(slugify(product.category))}">${escapeHtml(product.category)}</a></p><h1>${escapeHtml(product.name)}</h1><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" width="640" height="480"><p>${escapeHtml(product.description)}</p>${product.sku ? `<p>SKU: ${escapeHtml(product.sku)}</p>` : ''}${product.brand ? `<p>Brand: ${escapeHtml(product.brand)}</p>` : ''}</article>`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      image: [product.image],
      sku: product.sku || undefined,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      offers: offer,
      url: `${SITE_URL}${canonicalPath}`,
    },
  })
}

exports.publicPage = onRequest(
  { region: 'asia-south1', invoker: 'public', timeoutSeconds: 30 },
  async (request, response) => {
    try {
      const { products, categories } = await loadCatalog()
      const path = String(request.path || '/').replace(/\/+$/, '') || '/'
      let page
      if (path === '/') {
        const featured = products.slice(0, 24)
        const description = 'Shop genuine electronic components and industrial automation products online in India with Pride Circuit.'
        page = pageHtml({
          title: 'Pride Circuit | Buy Electronic Components Online in India',
          description,
          canonicalPath: '/',
          content: `<h1>Electronic components and automation products</h1><p>${escapeHtml(description)}</p><nav class="seo-nav" aria-label="Product categories">${categories.map((category) => `<a href="/category/${encodeURIComponent(slugify(category.name))}">${escapeHtml(category.name)}</a>`).join('')}</nav><div class="seo-grid">${productCards(featured)}</div>`,
          schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Pride Circuit', url: `${SITE_URL}/` },
        })
      } else if (path === '/products') {
        page = renderCatalogPage(products)
      } else if (path.startsWith('/category/')) {
        const requestedSlug = decodeURIComponent(path.slice('/category/'.length))
        const category = categories.find((item) => slugify(item.name) === requestedSlug)
        page = category
          ? renderCatalogPage(products, category.name)
          : pageHtml({ title: 'Category not found | Pride Circuit', description: 'This product category is not available.', canonicalPath: path, content: '<h1>Category not found</h1><p><a href="/products">Browse all products</a></p>', schema: { '@context': 'https://schema.org', '@type': 'WebPage' }, status: 404 })
      } else if (path.startsWith('/product/')) {
        const identifier = decodeURIComponent(path.slice('/product/'.length))
        const product = products.find((item) => item.slug === identifier || item.id === identifier)
        page = product
          ? renderProductPage(product)
          : pageHtml({ title: 'Product not found | Pride Circuit', description: 'This product is not available.', canonicalPath: path, content: '<h1>Product not found</h1><p><a href="/products">Browse all products</a></p>', schema: { '@context': 'https://schema.org', '@type': 'WebPage' }, status: 404 })
      } else {
        response.status(404).send('Not found')
        return
      }
      response
        .status(page.status)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600')
        .set('X-Content-Type-Options', 'nosniff')
        .send(page.html)
    } catch (error) {
      console.error('Unable to render public catalog page.', error)
      response.status(503).set('Retry-After', '60').type('text/plain').send('Storefront temporarily unavailable.')
    }
  },
)

exports._test = { pageHtml, renderCatalogPage, renderProductPage }

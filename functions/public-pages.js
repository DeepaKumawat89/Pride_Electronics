const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./shared/core')
const { slugify } = require('./shared/slugify')

const SITE_URL = 'https://pridecircuit.in'
const CONTENT_PAGES = {
  '/about-us': ['About Pride Circuit | Pride Circuit', 'Learn about Pride Circuit and our selection of electronics and automation products.', 'About Pride Circuit'],
  '/contact-us': ['Contact Pride Circuit | Pride Circuit', 'Contact Pride Circuit for help with electronics, orders, delivery, and support.', 'Contact Pride Circuit'],
  '/privacy-policy': ['Privacy Policy | Pride Circuit', 'Read the Pride Circuit privacy policy and learn how customer information is handled.', 'Privacy Policy'],
  '/terms-and-conditions': ['Terms & Conditions | Pride Circuit', 'Review the terms and conditions that apply to Pride Circuit website purchases and services.', 'Terms & Conditions'],
  '/refund-and-cancellation-policy': ['Refund & Cancellation Policy | Pride Circuit', 'Review Pride Circuit order cancellation, return, and refund terms.', 'Refund & Cancellation Policy'],
  '/shipping-and-delivery-policy': ['Shipping & Delivery Policy | Pride Circuit', 'Review delivery methods, timelines, charges, and support information for Pride Circuit orders.', 'Shipping & Delivery Policy'],
}
const CACHE_TTL_MS = 5 * 60 * 1000
let catalogCache = null

const timestampMillis = (value) => {
  if (value && typeof value.toMillis === 'function') return value.toMillis()
  const parsed = new Date(value || 0).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

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

const formatPrice = (value) => {
  const price = Number(value)
  return Number.isFinite(price) && price > 0
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(price)
    : 'Price unavailable'
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
    thumbnail: safeImage(
      data.thumbnail || data.thumbnails?.[0] || data.image || data.images?.[0],
    ),
    price: Number(data.price ?? data.basePrice ?? 0),
    stock: Math.max(0, Number(data.stock) || 0),
    createdAt: data.createdAt,
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
      name: text(document.data()?.name),
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
      .sort((first, second) => timestampMillis(second.createdAt) - timestampMillis(first.createdAt))
    return { products, categories: categories.filter((category) => category.enabled), subcategories: subcategories.filter((subcategory) => subcategory.enabled) }
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

const responsiveImageAttributes = (product, sizes) => {
  const thumbnail = text(product.thumbnail)
  const image = text(product.image)
  const srcset = thumbnail && image && thumbnail !== image
    ? ` srcset="${escapeHtml(`${thumbnail} 640w, ${image} 1600w`)}"`
    : ''
  return `${srcset} sizes="${escapeHtml(sizes)}"`
}

const SEO_CATALOG_IMAGE_BUDGET = 24
const SEO_EAGER_IMAGE_COUNT = 4

// 1. Remove product.description from catalog cards so /products stops outranking /product/:slug
const productCards = (products) => products.map((product, index) => `
  <article class="seo-card">
    <a href="${productPath(product)}">
      ${index < SEO_CATALOG_IMAGE_BUDGET
        ? `<img src="${escapeHtml(product.thumbnail || product.image)}"${responsiveImageAttributes(product, '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw')} alt="${escapeHtml(product.name)}" width="320" height="240" loading="${index < SEO_EAGER_IMAGE_COUNT ? 'eager' : 'lazy'}"${index < SEO_EAGER_IMAGE_COUNT ? ' fetchpriority="high"' : ''} decoding="async">`
        : '<span class="seo-card-image-placeholder" aria-hidden="true"></span>'}
      <h2>${escapeHtml(product.name)}</h2>
    </a>
    <p>${escapeHtml(product.category)}${product.subcategory ? ` · ${escapeHtml(product.subcategory)}` : ''}</p>
    <p class="seo-card-price">${escapeHtml(formatPrice(product.price))}</p>
  </article>`).join('')

const categoryCards = (categories, products) => categories.map((category) => {
  const productCount = products.filter(
    (product) =>
      product.categoryId === category.id ||
      product.category.toLowerCase() === category.name.toLowerCase(),
  ).length
  const path = `/category/${encodeURIComponent(slugify(category.name))}`
  return `
    <article class="seo-card">
      <a href="${path}"><h2>${escapeHtml(category.name)}</h2></a>
      <p>${productCount} ${productCount === 1 ? 'product' : 'products'}</p>
    </article>`
}).join('')

const pageHtml = ({ title, description, canonicalPath, content, schema, image = `${SITE_URL}/favicon-192x192.png`, status = 200 }) => {
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
  <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossorigin>
  <link rel="dns-prefetch" href="//firebasestorage.googleapis.com">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:type" content="${schema?.['@type'] === 'Product' ? 'product' : 'website'}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:alt" content="${safeTitle}">
  <meta property="og:site_name" content="Pride Circuit">
  <meta name="twitter:card" content="${schema?.['@type'] === 'Product' ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  <meta name="twitter:url" content="${canonical}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <meta name="twitter:image:alt" content="${safeTitle}">
  <script type="application/ld+json"${schema?.['@type'] === 'Product' ? ' data-pride-product-schema="true"' : ''}>${schemaText}</script>
  <link rel="stylesheet" href="/assets/app.css">
  <style>
    #root{display:none}.seo-fallback{font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;max-width:1280px;margin:auto;padding:32px 20px;color:#172019}.seo-fallback h1{color:#020617;font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;font-weight:800;letter-spacing:-.045em;line-height:1.1}.seo-nav{display:flex;gap:16px;flex-wrap:wrap}.seo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;margin-top:28px}.seo-card{border:1px solid #dfe6df;border-radius:18px;padding:16px;background:#fff}.seo-card img,.seo-card-image-placeholder{display:block;width:100%;height:180px;object-fit:contain}.seo-card-image-placeholder{background:#f2f5f1;border-radius:12px}.seo-card a,.seo-nav a{color:#245c36}.seo-card h2{font-size:16px}.seo-card p{font-size:13px;line-height:1.5;color:#536057}html[data-pride-app-ready=true] #root{display:block}html[data-pride-app-ready=true] .seo-fallback{display:none}
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

function renderCatalogPage(products, category = '', subcategory = '') {
  const categoryName = text(category)
  const subcategoryName = text(subcategory)
  const filtered = subcategoryName
    ? products.filter((product) => slugify(product.category) === slugify(categoryName) && slugify(product.subcategory) === slugify(subcategoryName))
    : categoryName
    ? products.filter((product) => slugify(product.category) === slugify(categoryName))
    : products
  const title = subcategoryName
    ? `${subcategoryName} ${categoryName} Products | Pride Circuit`
    : categoryName
      ? `${categoryName} Products | Pride Circuit`
    : 'Electronic Products Online | Pride Circuit'
  const description = subcategoryName
    ? `Shop ${subcategoryName} products in ${categoryName} online at Pride Circuit with clear pricing and reliable delivery across India.`
    : categoryName
      ? `Shop ${categoryName} products online at Pride Circuit with clear pricing and reliable delivery across India.`
    : 'Browse genuine electronic components and industrial automation products online at Pride Circuit.'
  const canonicalPath = subcategoryName
    ? `/category/${encodeURIComponent(slugify(categoryName))}/${encodeURIComponent(slugify(subcategoryName))}`
    : categoryName
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
    content: `<h1>${escapeHtml(subcategoryName ? `${subcategoryName} ${categoryName}` : categoryName || 'Electronic products')}</h1><p>${escapeHtml(description)}</p><div class="seo-grid">${productCards(filtered)}</div>`,
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

function renderCategoriesPage(products, categories) {
  const title = 'All Electronics Categories | Pride Circuit'
  const description = 'Browse every active electronics and industrial automation category available from Pride Circuit.'
  const categoryList = categories.map((category, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: category.name,
    url: `${SITE_URL}/category/${encodeURIComponent(slugify(category.name))}`,
  }))
  return pageHtml({
    title,
    description,
    canonicalPath: '/categories',
    content: `<h1>Browse all categories</h1><p>${escapeHtml(description)}</p><div class="seo-grid">${categoryCards(categories, products)}</div>`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: `${SITE_URL}/categories`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: categoryList.length,
        itemListElement: categoryList,
      },
    },
  })
}

function renderProductPage(product) {
  const canonicalPath = productPath(product)
  const productDescription = product.description || `Shop ${product.name} from Pride Circuit.`
  const description = productDescription.slice(0, 160)
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
    image: product.image,
    content: `<article><p><a href="/category/${encodeURIComponent(slugify(product.category))}">${escapeHtml(product.category)}</a></p><h1>${escapeHtml(product.name)}</h1><img src="${escapeHtml(product.image)}"${responsiveImageAttributes(product, '(min-width: 1024px) 55vw, 100vw')} alt="${escapeHtml(product.name)}" width="640" height="480" loading="eager" fetchpriority="high" decoding="async"><p>${escapeHtml(productDescription)}</p><p>${escapeHtml(formatPrice(product.price))}${product.price > 0 ? ' (Excl. GST)' : ''}</p><p>${product.stock > 0 ? 'In stock' : 'Out of stock'}</p>${product.sku ? `<p>SKU: ${escapeHtml(product.sku)}</p>` : ''}${product.brand ? `<p>Brand: ${escapeHtml(product.brand)}</p>` : ''}</article>`,
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: productDescription,
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
      const { products, categories, subcategories } = await loadCatalog()
      const path = String(request.path || '/').replace(/\/+$/, '') || '/'
      let page
      if (CONTENT_PAGES[path]) {
        const [title, description, heading] = CONTENT_PAGES[path]
        page = pageHtml({
          title,
          description,
          canonicalPath: path,
          content: `<article><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p><p><a href="/products">Browse products</a> · <a href="/contact-us">Contact Pride Circuit</a></p></article>`,
          schema: { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: `${SITE_URL}${path}` },
        })
      } else if (path === '/') {
        const featured = products.slice(0, 24)
        const description = 'Shop genuine electronic components and industrial automation products online in India with Pride Circuit.'
        page = pageHtml({
          title: 'Pride Circuit | Buy Electronic Components Online in India',
          description,
          canonicalPath: '/',
          content: `<h1>Electronic components and automation products</h1><p>${escapeHtml(description)}</p><nav class="seo-nav" aria-label="Product categories"><a href="/categories">View all categories</a>${categories.map((category) => `<a href="/category/${encodeURIComponent(slugify(category.name))}">${escapeHtml(category.name)}</a>`).join('')}</nav><div class="seo-grid">${productCards(featured)}</div>`,
          schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Pride Circuit', url: `${SITE_URL}/` },
        })
      } else if (path === '/categories') {
        page = renderCategoriesPage(products, categories)
      } else if (path === '/products') {
        page = renderCatalogPage(products)
      } else if (path.startsWith('/category/')) {
        const segments = path.slice('/category/'.length).split('/').map(decodeURIComponent)
        const requestedSlug = segments[0]
        const category = categories.find((item) => slugify(item.name) === requestedSlug)
        const subcategory = segments[1]
          ? subcategories.find((item) => slugify(item.name) === segments[1] && categories.find((entry) => String(entry.id) === String(item.categoryId) && entry.id === category?.id))
          : null
        if (segments[1] && category && !subcategory) {
          page = pageHtml({ title: 'Category not found | Pride Circuit', description: 'This product category is not available.', canonicalPath: path, content: '<h1>Category not found</h1><p><a href="/products">Browse all products</a></p>', schema: { '@context': 'https://schema.org', '@type': 'WebPage' }, status: 404 })
        } else {
        page = category
          ? renderCatalogPage(products, category.name, subcategory?.name || '')
          : pageHtml({ title: 'Category not found | Pride Circuit', description: 'This product category is not available.', canonicalPath: path, content: '<h1>Category not found</h1><p><a href="/products">Browse all products</a></p>', schema: { '@context': 'https://schema.org', '@type': 'WebPage' }, status: 404 })
        }

        // 2. Inside exports.publicPage -> else if (path.startsWith('/product/'))
      } else if (path.startsWith('/product/')) {
        const productRoutePath = path.endsWith('/reviews') ? path.slice(0, -'/reviews'.length) : path
        const routeIdentifier = decodeURIComponent(productRoutePath.slice('/product/'.length))
        const identifier = routeIdentifier.startsWith('id/')
          ? routeIdentifier.slice('id/'.length)
          : routeIdentifier
        const productBySlug = products.find((item) => item.slug === identifier)
        const productById = !productBySlug
          ? products.find((item) => item.id === identifier)
          : null

        if (productById && productById.slug && productById.slug !== identifier) {
          response.redirect(301, productPath(productById))
          return
        }

        const product = productBySlug || productById
        page = product
          ? renderProductPage(product)
          : pageHtml({ title: 'Product not found | Pride Circuit', description: 'This product is not available.', canonicalPath: path, content: '<h1>Product not found</h1><p><a href="/products">Browse all products</a></p>', schema: { '@context': 'https://schema.org', '@type': 'WebPage' }, status: 404 })
      }
      else {
        response.status(404).send('Not found')
        return
      }
      response
        .status(page.status)
        .set('Content-Type', 'text/html; charset=utf-8')
        .set('Cache-Control', 'public, max-age=300, s-maxage=300')
        .set('X-Content-Type-Options', 'nosniff')
        .send(page.html)
    } catch (error) {
      console.error('Unable to render public catalog page.', error)
      response.status(503).set('Retry-After', '60').type('text/plain').send('Storefront temporarily unavailable.')
    }
  },
)

exports._test = {
  pageHtml,
  renderCatalogPage,
  renderCategoriesPage,
  renderProductPage,
}

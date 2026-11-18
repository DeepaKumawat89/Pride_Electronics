const { onRequest } = require('firebase-functions/v2/https')
const { db } = require('./shared/core')
const { slugify } = require('./shared/slugify')
const { buildTaxonomyRoutes } = require('./shared/catalog-routes')
const { productPath } = require('./shared/product-routes')

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
const plainText = (value) => String(value || '')
  .replace(/&nbsp;|&#160;|&#xA0;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]*>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
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
    description: String(data.description ?? ''),
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
    const categoryByName = new Map()
    categories.forEach((category) => {
      const name = category.name.toLowerCase()
      categoryByName.set(name, [...(categoryByName.get(name) || []), category])
    })
    const subcategoryById = new Map(
      subcategories.map((subcategory) => [subcategory.id, subcategory]),
    )
    const products = productSnapshot.docs
      .map(publicProduct)
      .filter((product) => {
        const namedCategories = categoryByName.get(product.category.toLowerCase()) || []
        const category = categoryById.get(product.categoryId) ||
          (namedCategories.length === 1 ? namedCategories[0] : null)
        const subcategory = subcategoryById.get(product.subcategoryId)
        return product.enabled && category?.enabled !== false && subcategory?.enabled !== false
      })
      .sort((first, second) => timestampMillis(second.createdAt) - timestampMillis(first.createdAt))
    const activeCategories = categories.filter((category) => category.enabled)
    const activeSubcategories = subcategories.filter((subcategory) => subcategory.enabled)
    return {
      products,
      categories: activeCategories,
      subcategories: activeSubcategories,
      taxonomyRoutes: buildTaxonomyRoutes(activeCategories, activeSubcategories),
    }
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

const categoryCards = (categories, products, taxonomyRoutes = { categories: [] }) => categories.map((category) => {
  const categoryNameCount = categories.filter(
    (item) => item.name.trim().toLowerCase() === category.name.trim().toLowerCase(),
  ).length
  const productCount = products.filter(
    (product) => product.categoryId
      ? String(product.categoryId) === String(category.id)
      : categoryNameCount === 1 && product.category.toLowerCase() === category.name.toLowerCase(),
  ).length
  const path = taxonomyRoutes.categories.find((item) => String(item.id) === String(category.id))?.path || `/product-category/${encodeURIComponent(slugify(category.name))}/`
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

function renderCatalogPage(products, category = '', subcategory = '', taxonomyRoutes = { categories: [], subcategories: [] }, categories = []) {
  const categoryRecord = category && typeof category === 'object' ? category : null
  const subcategoryRecord = subcategory && typeof subcategory === 'object' ? subcategory : null
  const categoryName = text(categoryRecord?.name || category)
  const subcategoryName = text(subcategoryRecord?.name || subcategory)
  const sameNameCategories = categories.filter((item) => item.name.trim().toLowerCase() === categoryName.toLowerCase())
  const sameNameSubcategories = taxonomyRoutes.subcategories.filter((item) =>
    String(item.categoryId) === String(categoryRecord?.id || '') &&
    item.name.trim().toLowerCase() === subcategoryName.toLowerCase(),
  )
  const belongsToCategory = (product) => categoryRecord?.id
    ? product.categoryId
      ? String(product.categoryId) === String(categoryRecord.id)
      : sameNameCategories.length === 1 && product.category.trim().toLowerCase() === categoryName.toLowerCase()
    : !categoryName || slugify(product.category) === slugify(categoryName)
  const belongsToSubcategory = (product) => !subcategoryName || (
    belongsToCategory(product) &&
    (subcategoryRecord?.id && product.subcategoryId
      ? String(product.subcategoryId) === String(subcategoryRecord.id)
      : sameNameSubcategories.length === 1 && slugify(product.subcategory) === slugify(subcategoryName))
  )
  const filtered = products.filter((product) => belongsToCategory(product) && belongsToSubcategory(product))
  const categoryRoute = categoryRecord?.id
    ? taxonomyRoutes.categories.find((item) => String(item.id) === String(categoryRecord.id))
    : null
  const subcategoryRoute = subcategoryRecord?.id
    ? taxonomyRoutes.subcategories.find((item) => String(item.id) === String(subcategoryRecord.id))
    : null
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
    ? subcategoryRoute?.path || `${categoryRoute?.path || `/product-category/${slugify(categoryName)}/`}${encodeURIComponent(slugify(subcategoryName))}/`
    : categoryName
      ? categoryRoute?.path || `/product-category/${encodeURIComponent(slugify(categoryName))}/`
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

function renderCategoriesPage(products, categories, taxonomyRoutes = { categories: [] }) {
  const title = 'All Electronics Categories | Pride Circuit'
  const description = 'Browse every active electronics and industrial automation category available from Pride Circuit.'
  const categoryList = categories.map((category, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: category.name,
    url: `${SITE_URL}${taxonomyRoutes.categories.find((item) => String(item.id) === String(category.id))?.path || `/product-category/${encodeURIComponent(slugify(category.name))}/`}`,
  }))
  return pageHtml({
    title,
    description,
    canonicalPath: '/categories',
    content: `<h1>Browse all categories</h1><p>${escapeHtml(description)}</p><div class="seo-grid">${categoryCards(categories, products, taxonomyRoutes)}</div>`,
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

function renderProductPage(product, categoryPath = '') {
  const canonicalPath = productPath(product)
  const productDescription = product.description || `Shop ${product.name} from Pride Circuit.`
  const description = plainText(product.description) || plainText(productDescription)
  const offer = product.price > 0 ? {
    '@type': 'Offer',
    price: product.price.toFixed(2),
    priceCurrency: 'INR',
    availability: `https://schema.org/${product.stock > 0 ? 'InStock' : 'OutOfStock'}`,
    url: `${SITE_URL}${canonicalPath}`,
  } : undefined
  return pageHtml({
    title: product.name,
    description,
    canonicalPath,
    image: product.image,
    content: `<article><p>${categoryPath ? `<a href="${escapeHtml(categoryPath)}">${escapeHtml(product.category)}</a>` : escapeHtml(product.category)}</p><h1>${escapeHtml(product.name)}</h1><img src="${escapeHtml(product.image)}"${responsiveImageAttributes(product, '(min-width: 1024px) 55vw, 100vw')} alt="${escapeHtml(product.name)}" width="640" height="480" loading="eager" fetchpriority="high" decoding="async"><p>${escapeHtml(productDescription)}</p><p>${escapeHtml(formatPrice(product.price))}${product.price > 0 ? ' (Excl. GST)' : ''}</p><p>${product.stock > 0 ? 'In stock' : 'Out of stock'}</p>${product.sku ? `<p>SKU: ${escapeHtml(product.sku)}</p>` : ''}${product.brand ? `<p>Brand: ${escapeHtml(product.brand)}</p>` : ''}</article>`,
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
      const { products, categories, subcategories, taxonomyRoutes } = await loadCatalog()
      const requestedPath = String(request.path || '/') || '/'
      const path = requestedPath.replace(/\/+$/, '') || '/'
      const requestUrl = new URL(request.originalUrl || request.url || path, SITE_URL)
      if (path.startsWith('/product/') && requestedPath !== path) {
        response.redirect(301, `${path}${requestUrl.search}`)
        return
      }
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
          content: `<h1>Electronic components and automation products</h1><p>${escapeHtml(description)}</p><nav class="seo-nav" aria-label="Product categories"><a href="/categories">View all categories</a>${categories.map((category) => `<a href="${escapeHtml(taxonomyRoutes.categories.find((item) => String(item.id) === String(category.id))?.path || `/product-category/${encodeURIComponent(slugify(category.name))}/`)}">${escapeHtml(category.name)}</a>`).join('')}</nav><div class="seo-grid">${productCards(featured)}</div>`,
          schema: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Pride Circuit', url: `${SITE_URL}/` },
        })
      } else if (path === '/categories') {
        page = renderCategoriesPage(products, categories, taxonomyRoutes)
      } else if (path === '/products') {
        const requestedCategory = text(requestUrl.searchParams.get('category'))
        if (requestedCategory && requestedCategory.toLowerCase() !== 'all') {
          const matchingCategories = taxonomyRoutes.categories.filter(
            (category) => category.name.trim().toLowerCase() === requestedCategory.toLowerCase(),
          )
          if (matchingCategories.length === 1) {
            const target = new URL(matchingCategories[0].path, SITE_URL)
            requestUrl.searchParams.forEach((value, key) => {
              if (key !== 'category') target.searchParams.append(key, value)
            })
            response.redirect(301, `${target.pathname}${target.search}`)
            return
          }
        }
        page = renderCatalogPage(products)
      } else if (path.startsWith('/product-category/') || path.startsWith('/category/')) {
        const legacy = path.startsWith('/category/')
        const prefix = legacy ? '/category/' : '/product-category/'
        const segments = path.slice(prefix.length).split('/').map(decodeURIComponent)
        const categoryMatches = legacy
          ? taxonomyRoutes.categories.filter((item) => slugify(item.name) === segments[0])
          : taxonomyRoutes.categories.filter((item) => item.slug === segments[0])
        const categoryRoute = categoryMatches.length === 1 ? categoryMatches[0] : null
        const subcategoryMatches = categoryRoute && segments[1]
          ? taxonomyRoutes.subcategories.filter((item) =>
              String(item.categoryId) === String(categoryRoute.id) &&
              (legacy ? slugify(item.name) === segments[1] : item.slug === segments[1]),
            )
          : []
        const subcategoryRoute = subcategoryMatches.length === 1 ? subcategoryMatches[0] : null
        if (legacy && categoryRoute && (!segments[1] || subcategoryRoute)) {
          const target = new URL(subcategoryRoute?.path || categoryRoute.path, SITE_URL)
          requestUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value))
          response.redirect(301, `${target.pathname}${target.search}`)
          return
        }
        if (categoryRoute && (!segments[1] || subcategoryRoute)) {
          const category = categories.find((item) => String(item.id) === String(categoryRoute.id))
          const subcategory = subcategoryRoute
            ? subcategories.find((item) => String(item.id) === String(subcategoryRoute.id))
            : null
          page = renderCatalogPage(products, category, subcategory || '', taxonomyRoutes, categories)
        } else {
          page = pageHtml({ title: 'Category not found | Pride Circuit', description: 'This product category is not available.', canonicalPath: '/products', content: '<h1>Category not found</h1><p><a href="/products">Browse all products</a></p>', schema: { '@context': 'https://schema.org', '@type': 'WebPage' }, status: 404 })
        }
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
          const reviewsSuffix = path.endsWith('/reviews') ? '/reviews' : ''
          response.redirect(301, `${productPath(productById)}${reviewsSuffix}${requestUrl.search}`)
          return
        }

        const product = productBySlug || productById
        const matchingProductCategories = product
          ? taxonomyRoutes.categories.filter((item) => item.name.trim().toLowerCase() === product.category.trim().toLowerCase())
          : []
        const productCategory = product && (
          taxonomyRoutes.categories.find((item) => String(item.id) === String(product.categoryId)) ||
          (matchingProductCategories.length === 1 ? matchingProductCategories[0] : null)
        )
        page = product
          ? renderProductPage(product, productCategory?.path || '')
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
  buildTaxonomyRoutes,
  pageHtml,
  renderCatalogPage,
  renderCategoriesPage,
  renderProductPage,
}

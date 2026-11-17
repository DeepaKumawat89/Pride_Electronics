const assert = require('node:assert/strict')
const test = require('node:test')
const { _test } = require('../functions/public-pages')

const product = {
  id: 'product-1',
  slug: 'safe-product',
  name: 'Safe Product',
  description: 'A useful public electronic component.',
  category: 'Components',
  subcategory: 'Sensors',
  brand: 'Pride',
  sku: 'PC-COM-SEN-000001',
  image: 'https://example.com/product.png',
  price: 125,
  stock: 2,
}

test('catalog rendering exposes canonical product links and structured data', () => {
  const page = _test.renderCatalogPage([product])
  assert.equal(page.status, 200)
  assert.match(page.html, /rel="canonical" href="https:\/\/pridecircuit\.in\/products"/)
  assert.match(page.html, /href="\/product\/safe-product"/)
  assert.match(page.html, /loading="eager" fetchpriority="high"/)
  assert.match(page.html, /"@type":"ItemList"/)
  assert.match(page.html, /src="\/assets\/app\.js"/)
  assert.match(page.html, /href="\/assets\/app\.css"/)
})

test('product rendering emits product metadata and escapes public text', () => {
  const page = _test.renderProductPage({
    ...product,
    name: 'Safe <script>alert(1)</script>',
  })
  assert.equal(page.status, 200)
  assert.match(page.html, /rel="canonical" href="https:\/\/pridecircuit\.in\/product\/safe-product"/)
  assert.match(page.html, /"@type":"Product"/)
  assert.doesNotMatch(page.html, /<script>alert\(1\)<\/script>/)
  assert.match(page.html, /Safe &lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(page.html, /loading="eager" fetchpriority="high"/)
})

test('product fallback matches storefront heading typography', () => {
  const page = _test.renderProductPage(product)
  assert.match(page.html, /fonts\.googleapis\.com\/css2\?family=JetBrains\+Mono/)
  assert.match(page.html, /font-family:"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif/)
  assert.match(page.html, /color:#020617;font-family:"Plus Jakarta Sans"/)
})

test('category directory exposes every category with canonical links', () => {
  const categories = [
    { id: 'components', name: 'Components' },
    { id: 'automation', name: 'Industrial Automation' },
  ]
  const taxonomyRoutes = _test.buildTaxonomyRoutes(categories, [])
  const page = _test.renderCategoriesPage(
    [product],
    categories,
    taxonomyRoutes,
  )

  assert.equal(page.status, 200)
  assert.match(page.html, /rel="canonical" href="https:\/\/pridecircuit\.in\/categories"/)
  assert.match(page.html, /href="\/product-category\/components\/"/)
  assert.match(page.html, /href="\/product-category\/industrial-automation\/"/)
  assert.match(page.html, /"numberOfItems":2/)
})

test('category and subcategory routes are hierarchical, collision-safe, and canonical', () => {
  const categories = [
    { id: 'components-a', name: 'Components' },
    { id: 'components-b', name: 'Components' },
  ]
  const subcategories = [
    { id: 'sensors-a', categoryId: 'components-a', name: 'Sensors' },
    { id: 'sensors-b', categoryId: 'components-b', name: 'Sensors' },
  ]
  const taxonomyRoutes = _test.buildTaxonomyRoutes(categories, subcategories)
  const category = taxonomyRoutes.categories.find((item) => item.id === 'components-a')
  const subcategory = taxonomyRoutes.subcategories.find((item) => item.id === 'sensors-a')
  const page = _test.renderCatalogPage(
    [
      { ...product, categoryId: 'components-a', subcategoryId: 'sensors-a' },
      { ...product, id: 'other', name: 'Other Product', categoryId: 'components-b', subcategoryId: 'sensors-b' },
    ],
    category,
    subcategory,
    taxonomyRoutes,
    categories,
  )

  assert.match(category.path, /^\/product-category\/components-/)
  assert.match(subcategory.path, /^\/product-category\/components-[^/]+\/sensors\//)
  assert.ok(page.html.includes(`rel="canonical" href="https://pridecircuit.in${subcategory.path}"`))
  assert.match(page.html, /Safe Product/)
  assert.doesNotMatch(page.html, /Other Product/)
})

test('large catalog limits image requests without hiding product links', () => {
  const products = Array.from({ length: 30 }, (_, index) => ({
    ...product,
    id: `product-${index + 1}`,
    slug: `product-${index + 1}`,
    name: `Product ${index + 1}`,
  }))
  const page = _test.renderCatalogPage(products)
  const imageCount = (page.html.match(/<img /g) || []).length

  assert.equal(imageCount, 24)
  assert.match(page.html, /href="\/product\/product-30"/)
  assert.match(page.html, /Product 30/)
})

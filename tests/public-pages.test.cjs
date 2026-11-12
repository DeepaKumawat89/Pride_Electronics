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

test('category directory exposes every category with canonical links', () => {
  const page = _test.renderCategoriesPage(
    [product],
    [
      { id: 'components', name: 'Components' },
      { id: 'automation', name: 'Industrial Automation' },
    ],
  )

  assert.equal(page.status, 200)
  assert.match(page.html, /rel="canonical" href="https:\/\/pridecircuit\.in\/categories"/)
  assert.match(page.html, /href="\/category\/components"/)
  assert.match(page.html, /href="\/category\/industrial-automation"/)
  assert.match(page.html, /"numberOfItems":2/)
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

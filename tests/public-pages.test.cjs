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
})

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clampProductQuantity,
  getProductMinimumOrderQuantity,
  productMeetsMinimumOrderQuantity,
} from '../src/utils/productMoq.js'
import {
  createBuyNowSelection,
  resolveCheckoutSelection,
} from '../src/user/utils/checkoutSelection.js'

test('products without MOQ remain backward compatible with a default of one', () => {
  assert.equal(getProductMinimumOrderQuantity({}), 1)
  assert.equal(clampProductQuantity({}, 0, 100), 1)
  assert.equal(productMeetsMinimumOrderQuantity({}, 1), true)
})

test('configured MOQ is automatically applied and cannot be decremented below', () => {
  const product = { id: 'MOQ-5', stock: 50, minimumOrderQuantity: 5 }
  assert.equal(clampProductQuantity(product, 1, 50), 5)
  assert.equal(clampProductQuantity(product, 4, 50), 5)
  assert.equal(clampProductQuantity(product, 6, 50), 6)
  assert.equal(productMeetsMinimumOrderQuantity(product, 4), false)
  assert.equal(productMeetsMinimumOrderQuantity(product, 5), true)
})

test('buy-now and restored checkout selections apply live product MOQ', () => {
  const product = {
    id: 'MOQ-10',
    name: 'MOQ product',
    price: 50,
    stock: 100,
    minimumOrderQuantity: 10,
  }
  const selection = createBuyNowSelection(product, 1)
  assert.equal(selection.items[0].quantity, 10)

  const restored = resolveCheckoutSelection(
    { mode: 'buy-now', items: [{ productId: product.id, quantity: 2 }] },
    [product],
  )
  assert.equal(restored[0].quantity, 10)
})

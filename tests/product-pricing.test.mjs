import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateProductUnitPrice,
  getApplicablePricingTier,
  getDefaultSamplePricingTiers,
  normalizePricingTiers,
  validatePricingTiers,
} from '../src/utils/productPricing.js'
import { calculateCartPricing } from '../src/user/utils/cart.js'

test('normalizePricingTiers sanitizes, converts, and sorts tiers ascending', () => {
  const input = [
    { minQty: '100', unitPrice: '23.85' },
    { minQty: '1', unitPrice: '54.98' },
    { minQty: '10', unitPrice: '37.64' },
    { minQty: 'invalid', unitPrice: '-5' },
  ]
  const normalized = normalizePricingTiers(input)
  assert.equal(normalized.length, 3)
  assert.deepEqual(normalized, [
    { minQty: 1, unitPrice: 54.98 },
    { minQty: 10, unitPrice: 37.64 },
    { minQty: 100, unitPrice: 23.85 },
  ])
})

test('validatePricingTiers validates ascending minQty order and positive unit prices', () => {
  // Disabled bulk pricing -> returns null (valid)
  assert.equal(validatePricingTiers([], false), null)

  // Enabled with empty array -> error
  assert.match(
    validatePricingTiers([], true),
    /add at least one quantity pricing tier/,
  )

  // Non-ascending quantities -> error
  assert.match(
    validatePricingTiers([
      { minQty: 10, unitPrice: 37.64 },
      { minQty: 5, unitPrice: 40 },
    ], true),
    /must be strictly greater than/,
  )

  // Zero or negative unit price -> error
  assert.match(
    validatePricingTiers([
      { minQty: 1, unitPrice: 0 },
    ], true),
    /must be greater than ₹0/,
  )

  // Valid ascending tiers -> returns null
  assert.equal(
    validatePricingTiers([
      { minQty: 1, unitPrice: 54.98 },
      { minQty: 10, unitPrice: 37.64 },
      { minQty: 100, unitPrice: 23.85 },
      { minQty: 500, unitPrice: 15.00 },
      { minQty: 1000, unitPrice: 13.14 },
      { minQty: 3000, unitPrice: 11.55 },
    ], true),
    null,
  )
})

test('getApplicablePricingTier resolves exact unit prices per Mouser example', () => {
  const sampleProduct = {
    price: 54.98,
    enableBulkPricing: true,
    pricingTiers: [
      { minQty: 1, unitPrice: 54.98 },
      { minQty: 10, unitPrice: 37.64 },
      { minQty: 100, unitPrice: 23.85 },
      { minQty: 500, unitPrice: 15.00 },
      { minQty: 1000, unitPrice: 13.14 },
      { minQty: 3000, unitPrice: 11.55 },
    ],
  }

  // Qty 1..9 -> ₹54.98
  assert.equal(calculateProductUnitPrice(sampleProduct, 1), 54.98)
  assert.equal(calculateProductUnitPrice(sampleProduct, 9), 54.98)

  // Qty 10..99 -> ₹37.64
  assert.equal(calculateProductUnitPrice(sampleProduct, 10), 37.64)
  assert.equal(calculateProductUnitPrice(sampleProduct, 99), 37.64)

  // Qty 100..499 -> ₹23.85
  assert.equal(calculateProductUnitPrice(sampleProduct, 100), 23.85)
  assert.equal(calculateProductUnitPrice(sampleProduct, 499), 23.85)

  // Qty 500..999 -> ₹15.00
  assert.equal(calculateProductUnitPrice(sampleProduct, 500), 15.00)
  assert.equal(calculateProductUnitPrice(sampleProduct, 999), 15.00)

  // Qty 1000..2999 -> ₹13.14
  assert.equal(calculateProductUnitPrice(sampleProduct, 1000), 13.14)
  assert.equal(calculateProductUnitPrice(sampleProduct, 2999), 13.14)

  // Qty 3000+ -> ₹11.55
  assert.equal(calculateProductUnitPrice(sampleProduct, 3000), 11.55)
  assert.equal(calculateProductUnitPrice(sampleProduct, 5000), 11.55)
})

test('calculateCartPricing correctly applies bulk pricing to cart subtotals', () => {
  const bulkProduct = {
    id: 'prod-ic-7805',
    name: 'UA78M05IDCYR',
    price: 54.98,
    enableBulkPricing: true,
    pricingTiers: [
      { minQty: 1, unitPrice: 54.98 },
      { minQty: 10, unitPrice: 37.64 },
      { minQty: 100, unitPrice: 23.85 },
    ],
  }

  // 10 units at ₹37.64 = ₹376.40
  const cart10 = calculateCartPricing([{ product: bulkProduct, quantity: 10 }])
  assert.equal(cart10.sellingSubtotal, 376.40)

  // 100 units at ₹23.85 = ₹2385.00
  const cart100 = calculateCartPricing([{ product: bulkProduct, quantity: 100 }])
  assert.equal(cart100.sellingSubtotal, 2385.00)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getProductAvailableStock,
  productForStorefront,
  productForVariant,
  variantCartKey,
} from '../src/utils/productVariants.js'
import {
  reserveOrderStock,
  transitionOrderInventory,
} from '../src/admin/utils/inventory.js'
import { matchesProductQuery } from '../src/user/utils/productSearch.js'

const product = {
  id: 'sensor-1',
  name: 'Proximity Sensor',
  sku: 'SENSOR',
  price: 999,
  pricingModel: 'gst-exclusive-v1',
  priceIncludesTax: false,
  taxRate: 18,
  stock: 8,
  reservedStock: 1,
  images: ['base.webp'],
  technicalSpecifications: [
    { fieldId: 'range', label: 'Sensing range', value: '4 mm' },
  ],
  variants: [
    {
      id: 'm12',
      name: 'M12 · 10–30 V DC',
      sku: 'SENSOR-M12',
      modelNumber: 'PRX-M12',
      price: 700,
      stock: 5,
      reservedStock: 1,
      images: ['m12.webp'],
      technicalSpecifications: [
        { fieldId: 'range', label: 'Sensing range', value: '8 mm' },
        { fieldId: 'voltage', label: 'Supply voltage', value: '10–30 V DC' },
      ],
    },
    {
      id: 'm18',
      name: 'M18 · 24 V DC',
      sku: 'SENSOR-M18',
      price: 900,
      stock: 3,
      reservedStock: 0,
    },
  ],
}

test('selected variant produces an effective product without changing the base product', () => {
  const selected = productForVariant(product, 'm12')
  assert.equal(selected.selectedVariantId, 'm12')
  assert.equal(selected.price, 700)
  assert.equal(selected.stock, 4)
  assert.equal(selected.image, 'm12.webp')
  assert.equal(selected.modelNumber, 'PRX-M12')
  assert.equal(
    selected.technicalSpecifications.find((field) => field.fieldId === 'range').value,
    '8 mm',
  )
  assert.equal(product.price, 999)
  assert.equal(product.variants[0].stock, 5)
})

test('variant availability and cart identity are scoped per variant', () => {
  assert.equal(getProductAvailableStock(product), 7)
  assert.equal(variantCartKey(product.id, 'm12'), 'sensor-1::m12')
  assert.equal(variantCartKey(product.id, 'm18'), 'sensor-1::m18')
  assert.equal(variantCartKey(product.id), 'sensor-1')
})

test('storefront products expose sellable stock without subtracting reservations twice', () => {
  const storefrontProduct = productForStorefront(product)
  assert.equal(storefrontProduct.stock, 7)
  assert.equal(storefrontProduct.reservedStock, 0)
  assert.equal(getProductAvailableStock(storefrontProduct), 7)
  assert.equal(storefrontProduct.variants[0].stock, 4)
  assert.equal(storefrontProduct.variants[0].reservedStock, 0)
  assert.equal(productForVariant(storefrontProduct, 'm12').stock, 4)

  const nonVariantProduct = productForStorefront({
    id: 'controller-1',
    stock: 8,
    reservedStock: 3,
  })
  assert.equal(nonVariantProduct.stock, 5)
  assert.equal(nonVariantProduct.reservedStock, 0)
  assert.equal(getProductAvailableStock(nonVariantProduct), 5)
})

test('storefront search finds base and variant-specific product data', () => {
  assert.equal(matchesProductQuery(product, 'proximity'), true)
  assert.equal(matchesProductQuery(product, 'SENSOR-M12'), true)
  assert.equal(matchesProductQuery(product, 'PRX-M12'), true)
  assert.equal(matchesProductQuery(product, '10–30 V DC'), true)
  assert.equal(matchesProductQuery(product, 'nonexistent variant'), false)
})

test('order inventory reserves and fulfills only the selected variant', () => {
  const order = {
    id: 'order-1',
    inventoryState: 'reserved',
    items: [{ productId: product.id, variantId: 'm12', qty: 2 }],
  }
  const reserved = reserveOrderStock([product], order, '2026-08-28T10:00:00.000Z')
  assert.equal(reserved.products[0].variants[0].reservedStock, 3)
  assert.equal(reserved.products[0].variants[1].reservedStock, 0)
  assert.equal(reserved.products[0].reservedStock, 3)
  assert.equal(reserved.history[0].variantId, 'm12')

  const fulfilled = transitionOrderInventory(
    reserved.products,
    order,
    'Shipped',
    '',
    '2026-08-28T11:00:00.000Z',
  )
  assert.equal(fulfilled.products[0].variants[0].stock, 3)
  assert.equal(fulfilled.products[0].variants[0].reservedStock, 1)
  assert.equal(fulfilled.products[0].variants[1].stock, 3)
  assert.equal(fulfilled.products[0].stock, 6)
})

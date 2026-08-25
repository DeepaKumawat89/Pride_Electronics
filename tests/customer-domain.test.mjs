import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import {
  mergeInitialGuestAccount,
  normalizeAccountState,
} from '../src/user/utils/accountState.js'
import { calculateCartPricing } from '../src/user/utils/cart.js'

const require = createRequire(import.meta.url)
const {
  calculateOrderQuote,
  itemSignature,
  normalizeRequestedItems,
} = require('../functions/checkout.js')
const { sanitizeAccountState } = require('../functions/account-state.js')

const product = {
  id: 'product-1',
  name: 'Server-priced product',
  category: 'Audio',
  price: 1000,
  originalPrice: 1200,
  stock: 5,
  reservedStock: 0,
  enabled: true,
  taxRate: 18,
}

const quoteFor = (overrides = {}) =>
  calculateOrderQuote({
    requestedItems: [{ productId: 'product-1', quantity: 2 }],
    products: [product],
    shippingSettings: {
      standardCharge: 99,
      freeShippingThreshold: 999,
      expressCharge: 199,
    },
    taxSettings: { gstEnabled: true, defaultRate: 18, pricesIncludeTax: true },
    ...overrides,
  })

test('backend quote uses current product price and preserves a purchase snapshot', () => {
  const quote = quoteFor()
  assert.equal(quote.sellingSubtotal, 2000)
  assert.equal(quote.total, 2000)
  assert.equal(quote.totalPaise, 200000)
  assert.equal(quote.items[0].price, 1000)
  assert.equal(quote.items[0].qty, 2)

  const changedQuote = quoteFor({ products: [{ ...product, price: 1250 }] })
  assert.equal(changedQuote.total, 2500)
  assert.equal(quote.items[0].price, 1000)
})

test('backend quote authoritatively calculates coupon, shipping, and GST', () => {
  const quote = quoteFor({
    requestedItems: [{ productId: 'product-1', quantity: 1 }],
    couponCode: 'SAVE10',
    coupon: {
      code: 'SAVE10',
      discountType: 'Percentage',
      amount: 10,
      maximumDiscount: 500,
      minimumOrder: 500,
      applicableCategories: ['Audio'],
    },
  })
  assert.equal(quote.couponDiscount, 100)
  assert.equal(quote.shipping, 0)
  assert.equal(quote.total, 900)
  assert.equal(quote.tax, 137.29)
})

test('express shipping and out-of-stock changes are enforced by the quote', () => {
  assert.equal(quoteFor({ deliveryId: 'express' }).shipping, 199)
  assert.throws(
    () => quoteFor({ products: [{ ...product, reservedStock: 5 }] }),
    (error) => error.code === 'insufficient-stock',
  )
  assert.throws(
    () => quoteFor({ products: [{ ...product, enabled: false }] }),
    (error) => error.code === 'product-unavailable',
  )
})

test('duplicate, malformed, and reordered item payloads cannot bypass stock checks', () => {
  assert.throws(
    () => normalizeRequestedItems([
      { productId: 'product-1', quantity: 1 },
      { productId: 'product-1', quantity: 1 },
    ]),
    (error) => error.code === 'invalid-items',
  )
  assert.throws(
    () => normalizeRequestedItems([{ productId: '../admins/root', quantity: 1 }]),
    (error) => error.code === 'invalid-items',
  )
  assert.notEqual(
    itemSignature([
      { productId: 'a', qty: 1 },
      { productId: 'b', qty: 2 },
    ]),
    itemSignature([
      { productId: 'b', qty: 2 },
      { productId: 'a', qty: 1 },
    ]),
  )
})

test('browser pricing computes quantities and subtotal consistently', () => {
  const pricing = calculateCartPricing(
    [{ product, quantity: 2 }],
    '',
    new Date('2026-08-25T00:00:00Z'),
    [],
    '',
    { standardCharge: 99, freeShippingThreshold: 999 },
    { gstEnabled: true, defaultRate: 18, pricesIncludeTax: true },
  )
  assert.equal(pricing.sellingSubtotal, 2000)
  assert.equal(pricing.total, 2000)
})

test('browser and backend totals use the same paise rounding', () => {
  const decimalProduct = { ...product, price: 333.33, originalPrice: 399.99 }
  const taxSettings = {
    gstEnabled: true,
    defaultRate: 18,
    pricesIncludeTax: false,
  }
  const shippingSettings = {
    standardCharge: 49.95,
    freeShippingThreshold: 9999,
  }
  const browser = calculateCartPricing(
    [{ product: decimalProduct, quantity: 3 }],
    '',
    new Date('2026-08-25T00:00:00Z'),
    [],
    '',
    shippingSettings,
    taxSettings,
  )
  const backend = calculateOrderQuote({
    requestedItems: [{ productId: decimalProduct.id, quantity: 3 }],
    products: [decimalProduct],
    shippingSettings,
    taxSettings,
  })
  assert.equal(Math.round(browser.total * 100), backend.totalPaise)
})

test('account-state backend keeps only bounded, masked user-owned data', () => {
  const account = sanitizeAccountState({
    wishlistIds: ['product-1', 'product-1'],
    addresses: [{
      id: 'address-1',
      type: 'Billing',
      label: 'Office',
      fullName: 'Test User',
      phone: '9876543210',
      line1: '1 Test Street',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302001',
      injectedRole: 'admin',
    }],
    paymentMethods: [{
      id: 'card-1',
      type: 'Credit Card',
      holder: 'Test User',
      last4: '4242',
      expiry: '12/30',
      cardNumber: '4242424242424242',
      cvv: '123',
    }],
    cartItems: [{ productId: 'product-1', quantity: 2 }],
    savedCartItems: [{ productId: 'product-1' }, { productId: 'product-2' }],
    role: 'admin',
    password: 'must-not-persist',
  })
  assert.deepEqual(account.wishlistIds, ['product-1'])
  assert.equal(account.addresses[0].type, 'Billing')
  assert.equal('injectedRole' in account.addresses[0], false)
  assert.deepEqual(account.paymentMethods[0], {
    id: 'card-1',
    type: 'Credit Card',
    holder: 'Test User',
    last4: '4242',
    expiry: '12/30',
    upiId: '',
    isDefault: false,
  })
  assert.deepEqual(account.savedCartItems, [{ productId: 'product-2' }])
  assert.equal('password' in account, false)
  assert.equal('role' in account, false)
})

test('initial sign-in merges guest state, later snapshots stay authoritative', () => {
  const initial = mergeInitialGuestAccount(
    {
      wishlistIds: ['remote-like'],
      cartItems: [{ productId: 'remote-cart', quantity: 1 }],
    },
    {
      wishlistIds: ['guest-like'],
      cartItems: [{ productId: 'guest-cart', quantity: 2 }],
    },
  )
  assert.deepEqual(initial.wishlistIds, ['remote-like', 'guest-like'])
  assert.deepEqual(
    initial.cartItems.map((item) => item.productId),
    ['remote-cart', 'guest-cart'],
  )

  const laterRemote = normalizeAccountState({
    wishlistIds: [],
    cartItems: [],
  })
  assert.deepEqual(laterRemote.wishlistIds, [])
  assert.deepEqual(laterRemote.cartItems, [])
})

test('oversized and malformed account data is rejected', () => {
  assert.throws(
    () => sanitizeAccountState({ wishlistIds: Array.from({ length: 201 }, (_, index) => `p-${index}`) }),
    (error) => error.code === 'invalid-account-state',
  )
  assert.throws(
    () => sanitizeAccountState({ cartItems: [{ productId: 'p-1', quantity: 0 }] }),
    (error) => error.code === 'invalid-account-state',
  )
})

test('account state cannot persist multiple default addresses', () => {
  const baseAddress = {
    type: 'Shipping',
    label: 'Home',
    fullName: 'Test User',
    phone: '9876543210',
    line1: '1 Test Street',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    isDefault: true,
  }
  const account = sanitizeAccountState({
    addresses: [
      { ...baseAddress, id: 'address-1' },
      { ...baseAddress, id: 'address-2' },
    ],
  })
  assert.equal(account.addresses.filter((address) => address.isDefault).length, 1)
  assert.equal(account.addresses[0].isDefault, true)
})

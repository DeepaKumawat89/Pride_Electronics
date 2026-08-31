import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import {
  mergeInitialGuestAccount,
  normalizeAccountState,
  removeSavedAddress,
  setDefaultSavedAddress,
  upsertSavedAddress,
} from '../src/user/utils/accountState.js'
import {
  calculateCartPricing,
  paymentAmountMatchesCheckout,
  toRazorpayAmount,
} from '../src/user/utils/cart.js'
import {
  createBuyNowSelection,
  removePurchasedItems as removePurchasedClientItems,
  resolveCheckoutSelection,
} from '../src/user/utils/checkoutSelection.js'
import {
  createRazorpayDisplayConfig,
  enabledRazorpayMethods,
  preferredRazorpayMethod,
} from '../src/user/utils/razorpayOptions.js'

const require = createRequire(import.meta.url)
const {
  calculateOrderQuote,
  itemSignature,
  normalizePaymentConfiguration,
  normalizeRequestedItems,
  razorpayEnvironmentForKey,
} = require('../functions/checkout.js')
const {
  removePurchasedCartItems,
  sanitizeAccountState,
} = require('../functions/account-state.js')

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

test('checkout rejects products without a valid current Firebase price', () => {
  assert.throws(
    () => quoteFor({ products: [{ ...product, price: '' }] }),
    (error) => error.code === 'product-unavailable',
  )
  assert.throws(
    () => quoteFor({ products: [{ ...product, price: 0 }] }),
    (error) => error.code === 'product-unavailable',
  )
})

test('buy-now selection resolves current Firebase product data and stays isolated', () => {
  const selection = createBuyNowSelection(product, 2)
  const updatedProduct = { ...product, price: 1350, stock: 3 }
  const checkoutItems = resolveCheckoutSelection(selection, [updatedProduct])
  assert.equal(checkoutItems.length, 1)
  assert.equal(checkoutItems[0].product.price, 1350)
  assert.equal(checkoutItems[0].quantity, 2)
  assert.deepEqual(
    removePurchasedClientItems(
      [
        { productId: 'product-1', quantity: 2 },
        { productId: 'keep-in-cart', quantity: 1 },
      ],
      [{ productId: 'product-1', qty: 2 }],
    ),
    [{ productId: 'keep-in-cart', quantity: 1 }],
  )
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

test('checkout accepts old and new Razorpay quote response shapes', () => {
  assert.equal(toRazorpayAmount(18000), 1800000)
  assert.equal(toRazorpayAmount(199.99), 19999)
  assert.equal(paymentAmountMatchesCheckout(18000, 1800000, undefined), true)
  assert.equal(paymentAmountMatchesCheckout(18000, 1800000, 1800000), true)
  assert.equal(paymentAmountMatchesCheckout(18000, 1800000, 1800100), false)
})

test('checkout exposes only Razorpay methods enabled by Admin settings', () => {
  const settings = {
    upiEnabled: true,
    cardsEnabled: false,
    netBankingEnabled: true,
    walletsEnabled: false,
  }
  assert.deepEqual(enabledRazorpayMethods(settings), ['upi', 'netbanking'])
  assert.deepEqual(
    createRazorpayDisplayConfig(settings).display.blocks.checkout.instruments,
    [{ method: 'upi' }, { method: 'netbanking' }],
  )
  assert.equal(preferredRazorpayMethod({ type: 'Credit Card' }, settings), '')
  assert.equal(preferredRazorpayMethod({ type: 'UPI' }, settings), 'upi')
})

test('Razorpay server settings match storefront defaults and credential mode', () => {
  assert.deepEqual(normalizePaymentConfiguration(), {
    razorpayEnabled: true,
    testMode: true,
    autoCapture: true,
    codEnabled: false,
    cardsEnabled: true,
    upiEnabled: true,
    netBankingEnabled: true,
    walletsEnabled: true,
  })
  assert.equal(razorpayEnvironmentForKey('rzp_test_example'), 'test')
  assert.equal(razorpayEnvironmentForKey('rzp_live_example'), 'live')
  assert.equal(razorpayEnvironmentForKey('invalid'), '')
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

test('client account snapshots use the same persisted shape as the backend', () => {
  const input = {
    wishlistIds: ['product-1'],
    addresses: [{
      id: 'address-1',
      type: 'Shipping',
      label: 'Home',
      fullName: ' Test User ',
      phone: '+91 98765 43210',
      houseFlat: ' 1 ',
      street: ' Test Street ',
      area: ' Test Area ',
      line1: '1, Test Street, Test Area',
      city: ' Jaipur ',
      state: ' Rajasthan ',
      pincode: '302001',
      coordinates: { latitude: 1, longitude: 2 },
      isDefault: true,
    }],
    cartItems: [{ productId: 'product-1', quantity: 1 }],
  }
  assert.deepEqual(
    normalizeAccountState(input),
    sanitizeAccountState(input),
  )
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

test('saved address add, edit, delete, and default operations remain consistent', () => {
  const baseAddress = {
    type: 'Shipping',
    label: 'Home',
    fullName: 'Test User',
    phone: '9876543210',
    line1: '1 Test Street',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
  }
  const first = upsertSavedAddress([], baseAddress, 'address-1')
  assert.equal(first.savedAddress.id, 'address-1')
  assert.equal(first.savedAddress.isDefault, true)

  const second = upsertSavedAddress(
    first.addresses,
    { ...baseAddress, label: 'Office', isDefault: true },
    'address-2',
  )
  assert.equal(second.addresses.find((address) => address.id === 'address-1').isDefault, false)
  assert.equal(second.savedAddress.isDefault, true)

  const edited = upsertSavedAddress(
    second.addresses,
    { ...second.savedAddress, city: 'Ajmer' },
    'unused-id',
  )
  assert.equal(edited.savedAddress.city, 'Ajmer')
  assert.equal(edited.addresses.length, 2)

  const defaulted = setDefaultSavedAddress(edited.addresses, 'address-1')
  assert.equal(defaulted.find((address) => address.id === 'address-1').isDefault, true)
  assert.equal(defaulted.filter((address) => address.isDefault).length, 1)

  const removed = removeSavedAddress(defaulted, 'address-1')
  assert.equal(removed.length, 1)
  assert.equal(removed[0].id, 'address-2')
  assert.equal(removed[0].isDefault, true)
})

test('successful checkout removes only purchased products from the persisted cart', () => {
  assert.deepEqual(
    removePurchasedCartItems(
      [
        { productId: 'purchased-1', quantity: 2 },
        { productId: 'keep-1', quantity: 1 },
        { productId: 'purchased-2', quantity: 3 },
      ],
      [
        { productId: 'purchased-1', qty: 2 },
        { productId: 'purchased-2', qty: 3 },
      ],
    ),
    [{ productId: 'keep-1', quantity: 1 }],
  )
})

test('variant checkout uses variant price, stock, media, and purchase snapshot', () => {
  const variantProduct = {
    ...product,
    price: 9999,
    stock: 7,
    variants: [
      {
        id: 'variant-a',
        name: '24 V DC',
        sku: 'SENSOR-24V',
        modelNumber: 'PX-24',
        price: 1500,
        discountPrice: 1250,
        stock: 4,
        reservedStock: 1,
        images: ['https://example.com/variant-a.webp'],
        technicalSpecifications: [{ fieldId: 'voltage', label: 'Voltage', value: '24 V DC' }],
      },
    ],
  }
  const quote = quoteFor({
    requestedItems: [{ productId: product.id, variantId: 'variant-a', quantity: 2 }],
    products: [variantProduct],
  })
  assert.equal(quote.items[0].variantId, 'variant-a')
  assert.equal(quote.items[0].variant, '24 V DC')
  assert.equal(quote.items[0].sku, 'SENSOR-24V')
  assert.equal(quote.items[0].variantModelNumber, 'PX-24')
  assert.equal(quote.items[0].price, 1250)
  assert.equal(quote.items[0].unitPrice, 1500)
  assert.equal(quote.items[0].image, 'https://example.com/variant-a.webp')
  assert.equal(quote.sellingSubtotal, 2500)
})

test('variant products require a current selection and allow sibling variants as separate rows', () => {
  const variantProduct = {
    ...product,
    variants: [
      { id: 'variant-a', name: 'A', price: 100, stock: 2 },
      { id: 'variant-b', name: 'B', price: 200, stock: 3 },
    ],
  }
  assert.throws(
    () => quoteFor({ products: [variantProduct] }),
    (error) => error.code === 'product-unavailable',
  )
  assert.throws(
    () => quoteFor({
      requestedItems: [{ productId: product.id, variantId: 'removed', quantity: 1 }],
      products: [variantProduct],
    }),
    (error) => error.code === 'product-unavailable',
  )
  const requested = normalizeRequestedItems([
    { productId: product.id, variantId: 'variant-a', quantity: 1 },
    { productId: product.id, variantId: 'variant-b', quantity: 1 },
  ])
  assert.equal(requested.length, 2)
  assert.throws(
    () => normalizeRequestedItems([
      { productId: product.id, variantId: 'variant-a', quantity: 1 },
      { productId: product.id, variantId: 'variant-a', quantity: 1 },
    ]),
    (error) => error.code === 'invalid-items',
  )
})

test('account state keeps sibling variants distinct and removes only the purchased variant', () => {
  const state = sanitizeAccountState({
    cartItems: [
      { productId: 'product-1', variantId: 'variant-a', quantity: 1 },
      { productId: 'product-1', variantId: 'variant-b', quantity: 2 },
    ],
  })
  assert.equal(state.cartItems.length, 2)
  assert.deepEqual(
    removePurchasedCartItems(state.cartItems, [
      { productId: 'product-1', variantId: 'variant-a', qty: 1 },
    ]),
    [{ productId: 'product-1', variantId: 'variant-b', quantity: 2 }],
  )
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CHECKOUT_PATH,
  getProtectedPathForSection,
  getProtectedRoute,
} from '../src/user/utils/protectedRoutes.js'

test('all authentication-required paths resolve to protected destinations', () => {
  const expectedRoutes = {
    '/account': 'profile',
    '/profile': 'profile',
    '/wishlist': 'wishlist',
    '/cart': 'cart',
    '/orders': 'orders',
    '/saved-address': 'address',
    '/saved-cards': 'payment',
    '/coupons': 'coupons',
  }

  for (const [path, section] of Object.entries(expectedRoutes)) {
    assert.deepEqual(getProtectedRoute(path), { path, section })
    assert.equal(getProtectedRoute(`${path}/`)?.section, section)
  }
  assert.deepEqual(getProtectedRoute(CHECKOUT_PATH), {
    path: CHECKOUT_PATH,
    page: 'checkout',
  })
})

test('account sections resolve back to their canonical protected paths', () => {
  assert.equal(getProtectedPathForSection('profile'), '/account')
  assert.equal(getProtectedPathForSection('wishlist'), '/wishlist')
  assert.equal(getProtectedPathForSection('cart'), '/cart')
  assert.equal(getProtectedPathForSection('orders'), '/orders')
  assert.equal(getProtectedPathForSection('address'), '/saved-address')
  assert.equal(getProtectedPathForSection('payment'), '/saved-cards')
  assert.equal(getProtectedPathForSection('coupons'), '/coupons')
})

test('public and unknown paths do not resolve as protected routes', () => {
  assert.equal(getProtectedRoute('/'), null)
  assert.equal(getProtectedRoute('/products'), null)
  assert.equal(getProtectedRoute('/accounting'), null)
})

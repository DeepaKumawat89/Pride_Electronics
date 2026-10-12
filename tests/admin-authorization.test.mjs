import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const { requireAdmin } = require('../functions/authz')

test('a full administrator custom claim authorizes backend operations', () => {
  assert.equal(
    requireAdmin({ auth: { uid: 'UID_ADMIN', token: { admin: true, role: 'Store Administrator' } } }, 'users'),
    'UID_ADMIN',
  )
})

test('a scoped administrator is limited to trusted claim permissions', () => {
  const request = {
    auth: {
      uid: 'UID_MANAGER',
      token: { admin: true, role: 'Order Manager', permissions: ['orders'] },
    },
  }
  assert.equal(requireAdmin(request, 'orders'), 'UID_MANAGER')
  assert.throws(
    () => requireAdmin(request, 'users'),
    (error) => error.code === 'permission-denied',
  )
})

test('an admin flag without a trusted role or permission is denied', () => {
  assert.throws(
    () => requireAdmin({ auth: { uid: 'UID_ADMIN', token: { admin: true } } }, 'users'),
    (error) => error.code === 'permission-denied',
  )
})

test('a normal authenticated user cannot manually invoke admin operations', () => {
  assert.throws(
    () => requireAdmin({ auth: { uid: 'UID_A', token: {} } }),
    (error) => error.code === 'permission-denied',
  )
})

test('an unauthenticated caller is rejected before authorization', () => {
  assert.throws(
    () => requireAdmin({}),
    (error) => error.code === 'unauthenticated',
  )
})

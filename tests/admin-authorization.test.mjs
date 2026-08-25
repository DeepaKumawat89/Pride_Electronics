import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const { requireAdmin } = require('../functions/authz')

test('a verified admin custom claim authorizes backend operations', () => {
  assert.equal(
    requireAdmin({ auth: { uid: 'UID_ADMIN', token: { admin: true } } }),
    'UID_ADMIN',
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

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidGstinFormat } from '../src/user/utils/gstinVerification.js'

test('isValidGstinFormat validates Indian GSTIN formats correctly', () => {
  // Valid GSTINs
  assert.equal(isValidGstinFormat('22AAAAA0000A1Z5'), true)
  assert.equal(isValidGstinFormat('07AAAAA0000A1Z5'), true)
  assert.equal(isValidGstinFormat('29ABCDE1234F1Z5'), true)
  assert.equal(isValidGstinFormat('  27ABCDE1234F1Z5  '), true)

  // Invalid GSTINs
  assert.equal(isValidGstinFormat(''), false)
  assert.equal(isValidGstinFormat(null), false)
  assert.equal(isValidGstinFormat('12345'), false)
  assert.equal(isValidGstinFormat('22AAAAA0000A15'), false) // 14 chars
  assert.equal(isValidGstinFormat('22AAAAA0000A1Z55'), false) // 16 chars
  assert.equal(isValidGstinFormat('22AAAAA0000A1A5'), false) // missing 'Z' at char 14
  assert.equal(isValidGstinFormat('XXAAAAA0000A1Z5'), false) // non-digit state code
})

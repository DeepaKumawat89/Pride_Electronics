import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isValidHsnCode,
  validateProductForCreate,
} from '../src/utils/productValidation.js'

const validProduct = {
  name: 'Validated product',
  brand: 'Pride',
  description: 'A complete product description for validation.',
  categoryId: 'CATEGORY_1',
  category: 'Electronics',
  subcategoryId: 'SUBCATEGORY_1',
  subcategory: 'Accessories',
  originalPrice: 1000,
  price: 900,
  discount: 10,
  stock: 5,
  modelNumber: 'MODEL-1',
  specs: ['Power: 10 W'],
  hsnCode: '01234567',
}

test('HSN codes accept exactly eight numeric digits, including a leading zero', () => {
  assert.equal(isValidHsnCode('01234567'), true)
  assert.equal(isValidHsnCode('1234567'), false)
  assert.equal(isValidHsnCode('123456789'), false)
  assert.equal(isValidHsnCode('1234A678'), false)
  assert.equal(isValidHsnCode(''), false)
})

test('product creation validation requires a valid HSN code', () => {
  assert.deepEqual(validateProductForCreate(validProduct), [])
  assert.match(
    validateProductForCreate({ ...validProduct, hsnCode: '1234A678' }).join(' '),
    /exactly 8 numeric digits/i,
  )
  assert.match(
    validateProductForCreate({ ...validProduct, hsnCode: '' }).join(' '),
    /exactly 8 numeric digits/i,
  )
})

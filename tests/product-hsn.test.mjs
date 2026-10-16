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
  price: 900,
  pricingModel: 'gst-exclusive-v1',
  priceIncludesTax: false,
  taxRate: 18,
  stock: 5,
  modelNumber: 'MODEL-1',
  specs: ['Power: 10 W'],
  hsnCode: '01234567',
}

test('HSN codes are optional and otherwise require exactly eight digits', () => {
  assert.equal(isValidHsnCode('01234567'), true)
  assert.equal(isValidHsnCode('1234567'), false)
  assert.equal(isValidHsnCode('123456789'), false)
  assert.equal(isValidHsnCode('1234A678'), false)
  assert.equal(isValidHsnCode(''), true)
})

test('product creation accepts a blank HSN code and rejects malformed values', () => {
  assert.deepEqual(validateProductForCreate(validProduct), [])
  assert.match(
    validateProductForCreate({ ...validProduct, hsnCode: '1234A678' }).join(' '),
    /exactly 8 numeric digits/i,
  )
  assert.deepEqual(validateProductForCreate({ ...validProduct, hsnCode: '' }), [])
})

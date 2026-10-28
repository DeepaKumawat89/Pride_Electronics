import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createProductSku,
  createSkuSegment,
  formatProductSku,
  getHighestSkuSequence,
  updateProductSku,
} from '../src/utils/productSku.js'

test('SKU segments are derived as exactly three characters', () => {
  assert.equal(createSkuSegment('Passive Components'), 'PAC')
  assert.equal(createSkuSegment('SMD Resistors – Thick Film Chip Resistors'), 'SMD')
  assert.equal(
    createProductSku('', 'Passive Components', 'SMD Resistors', 37),
    'PC-PAC-SMD-000037',
  )
})

test('SKU sequences retain six digits across numeric boundaries', () => {
  assert.equal(formatProductSku('PAC', 'SMD', 99), 'PC-PAC-SMD-000099')
  assert.equal(formatProductSku('PAC', 'SMD', 100), 'PC-PAC-SMD-000100')
  assert.equal(formatProductSku('PAC', 'SMD', 101), 'PC-PAC-SMD-000101')
})

test('the highest sequence is global across every SKU prefix', () => {
  assert.equal(
    getHighestSkuSequence([
      { sku: 'PC-PAC-SMD-000033' },
      { sku: 'PC-INC-PMIC-000004' },
      { sku: 'PC-PAC-CCS-000036' },
      { sku: 'unsequenced-legacy-value' },
    ]),
    36,
  )
})

test('editing changes only the SKU codes and preserves its sequence', () => {
  assert.equal(
    updateProductSku(
      'PC-PAC-SMD-000036',
      'PC-ABC-XYZ-999999',
      'Ignored category',
      'Ignored subcategory',
    ),
    'PC-ABC-XYZ-000036',
  )
  assert.equal(
    updateProductSku(
      'PC-INC-PMIC-000004',
      'PC-INC-PMIC-000004',
      'Integrated Circuits',
      'Power Management ICs',
    ),
    'PC-INC-PMIC-000004',
  )
})

test('invalid manually entered SKU codes are rejected', () => {
  assert.throws(
    () => createProductSku('PC-PA-SMD', 'Passive Components', 'SMD Resistors', 37),
    /exactly three characters/,
  )
})

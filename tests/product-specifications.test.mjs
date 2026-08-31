import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTechnicalSpecifications,
  compactCustomSpecifications,
  formatSpecificationValue,
  getDisplaySpecifications,
  getProductSpecificationValues,
  normalizeSpecificationFields,
  validateCustomSpecifications,
  validateSpecificationFields,
  validateSpecificationValues,
} from '../src/utils/productSpecifications.js'
import { matchesProductQuery } from '../src/user/utils/productSearch.js'
import { getProductDetailInformation } from '../src/user/utils/productDetails.js'

const fields = normalizeSpecificationFields([
  { id: 'ram', label: 'RAM', type: 'select', required: true, unit: 'GB', options: ['8', '16'] },
  { id: 'storage', label: 'Storage', type: 'multi-select', options: '256 GB, 512 GB' },
  { id: 'cores', label: 'Core count', type: 'number' },
  { id: 'wireless', label: 'Wireless', type: 'boolean' },
  { id: 'notes', label: 'Notes', type: 'textarea' },
])

test('normalizes all supported reusable field types and options', () => {
  assert.deepEqual(fields.map(({ type }) => type), [
    'select',
    'multi-select',
    'number',
    'boolean',
    'textarea',
  ])
  assert.deepEqual(fields[1].options, ['256 GB', '512 GB'])
  assert.equal(fields[0].key, 'ram')
})

test('validates template labels, select options, and unique keys', () => {
  const invalid = normalizeSpecificationFields([
    { id: 'first', key: 'duplicate', label: '', type: 'text' },
    { id: 'second', key: 'duplicate', label: 'Colour', type: 'text' },
    { id: 'third', key: 'finish', label: 'Finish', type: 'select' },
  ])
  const errors = validateSpecificationFields(invalid)
  assert.equal(errors.first, 'Add a field label.')
  assert.equal(errors.second, 'Each specification field must have a unique key.')
  assert.equal(errors.third, 'Add at least one option.')
})

test('validates required and allowed product values', () => {
  assert.deepEqual(validateSpecificationValues(fields, { ram: '' }), {
    ram: 'RAM is required.',
  })
  assert.deepEqual(validateSpecificationValues(fields, { ram: '32' }), {
    ram: 'Select a valid RAM option.',
  })
  assert.deepEqual(
    validateSpecificationValues(fields, {
      ram: '16',
      storage: ['256 GB', '1 TB'],
    }),
    { storage: 'Select valid Storage options.' },
  )
  const requiredBoolean = normalizeSpecificationFields([
    { id: 'enabled', label: 'Enabled', type: 'boolean', required: true },
  ])
  assert.deepEqual(validateSpecificationValues(requiredBoolean, { enabled: '' }), {
    enabled: 'Enabled is required.',
  })
  assert.deepEqual(validateSpecificationValues(requiredBoolean, { enabled: false }), {})
})

test('builds typed product snapshots without empty optional values', () => {
  const snapshots = buildTechnicalSpecifications(fields, {
    ram: '16',
    storage: ['256 GB', '512 GB'],
    cores: '12',
    wireless: false,
    notes: 'Efficient architecture',
  })
  assert.equal(snapshots.length, 5)
  assert.equal(snapshots.find(({ fieldId }) => fieldId === 'cores').value, 12)
  assert.equal(snapshots.find(({ fieldId }) => fieldId === 'wireless').value, false)
  assert.deepEqual(
    snapshots.find(({ fieldId }) => fieldId === 'storage').value,
    ['256 GB', '512 GB'],
  )
})

test('restores Edit Product values from stable field IDs', () => {
  const technicalSpecifications = buildTechnicalSpecifications(fields, {
    ram: '8',
    storage: [],
    cores: 6,
    wireless: true,
    notes: '',
  })
  assert.deepEqual(
    getProductSpecificationValues({ technicalSpecifications }, fields),
    { ram: '8', storage: [], cores: 6, wireless: true, notes: '' },
  )
  assert.equal(getProductSpecificationValues({}, fields).wireless, '')
})

test('omits unset values while retaining explicit false and numeric zero', () => {
  const snapshots = buildTechnicalSpecifications(fields, {
    ram: '',
    storage: [],
    cores: 0,
    wireless: '',
    notes: '  ',
  })
  assert.deepEqual(snapshots.map(({ fieldId, value }) => [fieldId, value]), [
    ['cores', 0],
  ])

  const displayed = getDisplaySpecifications({
    technicalSpecifications: [
      { fieldId: 'empty-text', label: 'Empty text', type: 'text', value: '  ' },
      { fieldId: 'empty-list', label: 'Empty list', type: 'multi-select', value: [] },
      { fieldId: 'unset-boolean', label: 'Unset boolean', type: 'boolean' },
      { fieldId: 'explicit-no', label: 'Explicit no', type: 'boolean', value: false },
      { fieldId: 'zero', label: 'Minimum value', type: 'number', value: 0, unit: 'V' },
    ],
    customSpecifications: [{ id: 'empty-custom', label: 'Custom', value: ' ' }],
  })
  assert.deepEqual(displayed.map(({ label, value }) => [label, value]), [
    ['Explicit no', 'No'],
    ['Minimum value', '0 V'],
  ])
})

test('validates and compacts custom label/value specifications', () => {
  const custom = [
    { id: 'one', label: 'Connector', value: 'USB-C' },
    { id: 'two', label: '  ', value: 'Missing label' },
    { id: 'three', label: '', value: '' },
  ]
  assert.deepEqual(validateCustomSpecifications(custom), {
    two: 'Add a custom specification label.',
  })
  assert.deepEqual(compactCustomSpecifications(custom), [
    { id: 'one', label: 'Connector', value: 'USB-C' },
  ])
})

test('formats and combines typed and custom storefront values', () => {
  const product = {
    technicalSpecifications: [
      { fieldId: 'power', label: 'Power', type: 'number', value: 65, unit: 'W' },
      { fieldId: 'bluetooth', label: 'Bluetooth', type: 'boolean', value: false, unit: '' },
      { fieldId: 'colours', label: 'Colours', type: 'multi-select', value: ['Black', 'Blue'], unit: '' },
    ],
    customSpecifications: [{ id: 'material', label: 'Material', value: 'Aluminium' }],
    specs: ['Legacy field: Legacy value', 'Power: 65 W'],
  }
  assert.equal(formatSpecificationValue(product.technicalSpecifications[0]), '65 W')
  assert.deepEqual(getDisplaySpecifications(product).map(({ label, value }) => [label, value]), [
    ['Power', '65 W'],
    ['Bluetooth', 'No'],
    ['Colours', 'Black, Blue'],
    ['Material', 'Aluminium'],
    ['Legacy field', 'Legacy value'],
  ])
  assert.equal(matchesProductQuery({ name: 'Adapter', category: 'Power', description: '', ...product }, 'aluminium'), true)
  assert.equal(matchesProductQuery({ name: 'Adapter', category: 'Power', description: '', ...product }, '65 w'), true)
})

test('product details expose only information supplied for the product', () => {
  assert.deepEqual(getProductDetailInformation({ brand: 'Pride', sku: 'PE-1' }), {
    highlights: [],
    includedItems: [],
    brand: 'Pride',
    modelNumber: '',
    sku: 'PE-1',
    manufacturer: '',
    countryOfOrigin: '',
    warranty: '',
    returnPolicy: '',
  })
})

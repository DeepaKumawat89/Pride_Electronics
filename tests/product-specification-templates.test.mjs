import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRODUCT_SPECIFICATION_TEMPLATES,
  applyDefaultProductSpecificationTemplate,
  applyProductSpecificationTemplate,
  getProductSpecificationTemplate,
} from '../src/data/productSpecificationTemplates.js'
import { validateSpecificationFields } from '../src/utils/productSpecifications.js'

const requestedProductTypes = [
  'Proximity Sensors',
  'Photoelectric Sensors',
  'Temperature Sensors',
  'Pressure Sensors',
  'PLCs',
  'HMIs',
  'VFDs',
  'Servo Motors',
  'Stepper Motors',
  'Servo Drives',
  'Contactors',
  'Relays',
  'MCBs',
  'SMPS / Power Supplies',
  'Push Buttons',
  'Emergency Stop Switches',
  'Limit Switches',
  'Industrial Cables',
  'Terminal Blocks',
  'Arduino / ESP32 / Development Boards',
]

test('provides valid templates for all 20 requested product types', () => {
  assert.equal(PRODUCT_SPECIFICATION_TEMPLATES.length, 20)
  assert.deepEqual(
    PRODUCT_SPECIFICATION_TEMPLATES.map(({ name }) => name),
    requestedProductTypes,
  )
  PRODUCT_SPECIFICATION_TEMPLATES.forEach((template) => {
    assert.ok(template.fields.length >= 10, `${template.name} should have useful market fields`)
    assert.deepEqual(validateSpecificationFields(template.fields), {})
    assert.equal(new Set(template.fields.map(({ id }) => id)).size, template.fields.length)
    assert.equal(new Set(template.fields.map(({ key }) => key)).size, template.fields.length)
    assert.ok(template.fields.every(({ required }) => required === false))
  })
})

test('matches exact product-type names and narrow market aliases', () => {
  assert.equal(getProductSpecificationTemplate('PLC').id, 'plcs')
  assert.equal(getProductSpecificationTemplate('Variable Frequency Drive').id, 'vfds')
  assert.equal(getProductSpecificationTemplate('E-Stop Switch').id, 'emergency-stop-switches')
  assert.equal(getProductSpecificationTemplate('ESP32 Development Boards').id, 'arduino-esp32-development-boards')
  assert.equal(getProductSpecificationTemplate('Industrial Sensors'), null)
  assert.equal(getProductSpecificationTemplate('Servo Motor Accessories'), null)
  assert.equal(getProductSpecificationTemplate('General Power Products'), null)
})

test('keeps fields relevant to their selected product type', () => {
  const keysFor = (name) => new Set(
    getProductSpecificationTemplate(name).fields.map(({ key }) => key),
  )
  const proximity = keysFor('Proximity Sensors')
  const plc = keysFor('PLCs')
  const emergencyStop = keysFor('Emergency Stop Switches')
  const developmentBoard = keysFor('Arduino / ESP32 / Development Boards')

  assert.ok(proximity.has('sensing-distance'))
  assert.equal(proximity.has('digital-inputs'), false)
  assert.ok(plc.has('digital-inputs'))
  assert.equal(plc.has('sensing-distance'), false)
  assert.ok(emergencyStop.has('direct-opening-action'))
  assert.equal(emergencyStop.has('rated-motor-power'), false)
  assert.ok(developmentBoard.has('microcontroller'))
  assert.ok(developmentBoard.has('wireless-connectivity'))
})

test('safely seeds empty matching subcategories without overwriting custom work', () => {
  const seeded = applyDefaultProductSpecificationTemplate({
    id: 'sub-plc',
    name: 'PLCs',
    categoryId: 'automation',
  })
  assert.equal(seeded.specificationTemplateId, 'plcs')
  assert.equal(seeded.specificationTemplateSource, 'default')
  assert.ok(seeded.specificationFields.length > 0)

  const existingFields = [{ id: 'custom-voltage', key: 'voltage', label: 'Voltage', type: 'text' }]
  const customized = { name: 'PLCs', specificationFields: existingFields, specificationTemplateSource: 'custom' }
  assert.equal(applyDefaultProductSpecificationTemplate(customized), customized)

  const intentionallyEmpty = { name: 'PLCs', specificationFields: [], specificationTemplateSource: 'custom' }
  assert.equal(applyDefaultProductSpecificationTemplate(intentionallyEmpty), intentionallyEmpty)
})

test('allows an admin to explicitly reload a recommended template', () => {
  const customized = {
    name: 'VFDs',
    specificationFields: [],
    specificationTemplateSource: 'custom',
  }
  const applied = applyProductSpecificationTemplate(customized, 'vfds')
  assert.equal(applied.specificationTemplateId, 'vfds')
  assert.equal(applied.specificationTemplateSource, 'default')
  assert.ok(applied.specificationFields.some(({ key }) => key === 'rated-motor-power'))
})

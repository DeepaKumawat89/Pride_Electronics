export const SPECIFICATION_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'multi-select', label: 'Multi-select' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'textarea', label: 'Long text' },
]

const supportedTypes = new Set(
  SPECIFICATION_FIELD_TYPES.map(({ value }) => value),
)

const cleanText = (value) => String(value ?? '').trim()

const uniqueOptions = (options) => [
  ...new Set(
    (Array.isArray(options) ? options : String(options ?? '').split(/[\n,]/))
      .map(cleanText)
      .filter(Boolean),
  ),
]

const slugify = (value) =>
  cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function createSpecificationField(overrides = {}) {
  const id = cleanText(overrides.id) || `spec-field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  return normalizeSpecificationField({
    id,
    key: overrides.key || id,
    label: '',
    type: 'text',
    required: false,
    unit: '',
    placeholder: '',
    options: [],
    ...overrides,
  })
}

export function normalizeSpecificationField(field = {}, index = 0) {
  const id = cleanText(field.id || field.fieldId || field.key) || `spec-field-${index + 1}`
  const label = cleanText(field.label)
  const type = supportedTypes.has(field.type) ? field.type : 'text'

  return {
    id,
    key: cleanText(field.key) || slugify(label) || id,
    label,
    type,
    required: field.required === true,
    unit: cleanText(field.unit),
    placeholder: cleanText(field.placeholder),
    options: type === 'select' || type === 'multi-select'
      ? uniqueOptions(field.options)
      : [],
  }
}

export function normalizeSpecificationFields(fields) {
  return (Array.isArray(fields) ? fields : []).map(normalizeSpecificationField)
}

export function validateSpecificationFields(fields) {
  const normalized = normalizeSpecificationFields(fields)
  const errors = {}
  const keys = new Set()

  normalized.forEach((field) => {
    if (!field.label) errors[field.id] = 'Add a field label.'
    if (keys.has(field.key)) errors[field.id] = 'Each specification field must have a unique key.'
    keys.add(field.key)
    if (
      (field.type === 'select' || field.type === 'multi-select') &&
      !field.options.length
    ) {
      errors[field.id] = 'Add at least one option.'
    }
  })

  return errors
}

export function normalizeSpecificationValue(field, value) {
  if (field.type === 'boolean') {
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    return ''
  }
  if (field.type === 'multi-select') {
    return uniqueOptions(value)
  }
  if (field.type === 'number') {
    if (value === '' || value === null || value === undefined) return ''
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : ''
  }
  return cleanText(value)
}

export function getProductSpecificationValues(product = {}, fields = []) {
  const snapshots = Array.isArray(product.technicalSpecifications)
    ? product.technicalSpecifications
    : []
  const legacyValues = product.specificationValues || {}

  return normalizeSpecificationFields(fields).reduce((values, field) => {
    const snapshot = snapshots.find(
      (item) =>
        String(item.fieldId || '') === String(field.id) ||
        String(item.key || '') === String(field.key),
    )
    const rawValue = snapshot
      ? snapshot.value
      : legacyValues[field.id] ?? legacyValues[field.key]
    values[field.id] = rawValue === undefined
      ? field.type === 'multi-select' ? [] : ''
      : normalizeSpecificationValue(field, rawValue)
    return values
  }, {})
}

export function validateSpecificationValues(fields, values = {}) {
  return normalizeSpecificationFields(fields).reduce((errors, field) => {
    const value = normalizeSpecificationValue(field, values[field.id])
    const empty = field.type === 'multi-select'
      ? !value.length
      : value === ''
    if (field.required && empty) errors[field.id] = `${field.label} is required.`
    if (!empty && field.type === 'select' && !field.options.includes(value)) {
      errors[field.id] = `Select a valid ${field.label} option.`
    }
    if (
      !empty &&
      field.type === 'multi-select' &&
      value.some((item) => !field.options.includes(item))
    ) {
      errors[field.id] = `Select valid ${field.label} options.`
    }
    return errors
  }, {})
}

export function buildTechnicalSpecifications(fields, values = {}) {
  return normalizeSpecificationFields(fields).flatMap((field) => {
    const value = normalizeSpecificationValue(field, values[field.id])
    const empty = field.type === 'multi-select'
      ? !value.length
      : value === ''
    if (empty) return []
    return [{
      fieldId: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      value,
      unit: field.unit,
    }]
  })
}

export function createCustomSpecification(overrides = {}) {
  return {
    id: cleanText(overrides.id) || `custom-spec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label: cleanText(overrides.label),
    value: cleanText(overrides.value),
  }
}

export function normalizeCustomSpecifications(specifications) {
  return (Array.isArray(specifications) ? specifications : []).map(
    (specification, index) => createCustomSpecification({
      id: specification.id || `custom-spec-${index + 1}`,
      label: specification.label,
      value: specification.value,
    }),
  )
}

export function validateCustomSpecifications(specifications) {
  return normalizeCustomSpecifications(specifications).reduce((errors, item) => {
    if (!item.label && item.value) errors[item.id] = 'Add a custom specification label.'
    if (item.label && !item.value) errors[item.id] = `Add a value for ${item.label}.`
    return errors
  }, {})
}

export function compactCustomSpecifications(specifications) {
  return normalizeCustomSpecifications(specifications).filter(
    ({ label, value }) => label && value,
  )
}

export function formatSpecificationValue(specification = {}) {
  let value
  if (specification.type === 'boolean') {
    if (specification.value === true || specification.value === 'true') value = 'Yes'
    else if (specification.value === false || specification.value === 'false') value = 'No'
    else value = ''
  } else if (Array.isArray(specification.value)) {
    value = specification.value.map(cleanText).filter(Boolean).join(', ')
  } else if (
    specification.value !== null &&
    typeof specification.value === 'object'
  ) {
    value = ''
  } else {
    value = cleanText(specification.value)
  }
  return `${value}${value && specification.unit ? ` ${specification.unit}` : ''}`
}

export function getDisplaySpecifications(product = {}) {
  const technical = (Array.isArray(product.technicalSpecifications)
    ? product.technicalSpecifications
    : [])
    .map((item, index) => ({
      id: cleanText(item.fieldId || item.key) || `technical-${index + 1}`,
      label: cleanText(item.label || item.key),
      value: formatSpecificationValue(item),
    }))
    .filter(({ label, value }) => label && value)
  const custom = compactCustomSpecifications(product.customSpecifications).map(
    (item) => ({ ...item, value: cleanText(item.value) }),
  )
  return [...technical, ...custom]
}

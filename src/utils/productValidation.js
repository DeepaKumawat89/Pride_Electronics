const DECIMAL_INPUT_PATTERN = /^\d+(?:\.\d{1,2})?$/
const HSN_CODE_PATTERN = /^\d{8}$/
const RETURN_POLICY_TYPES = ['return', 'replacement', 'non-returnable']
const MINIMUM_ORDER_QUANTITIES = [1, 2, 5, 10, 20, 50, 100]

const cleanText = (value) => String(value ?? '').trim()

export const isValidDecimalInput = (value, { allowZero = true } = {}) => {
  const text = cleanText(value)
  if (!DECIMAL_INPUT_PATTERN.test(text)) return false
  const amount = Number(text)
  return Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0)
}

export const isValidHsnCode = (value) => {
  const text = cleanText(value)
  return !text || HSN_CODE_PATTERN.test(text)
}

export const roundToTwoDecimals = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

export function validateProductForCreate(product = {}) {
  const errors = []
  const requiredText = [
    ['name', 'Product name'],
    ['brand', 'Brand'],
    ['description', 'Description'],
    ['categoryId', 'Category'],
    ['category', 'Category'],
    ['subcategoryId', 'Subcategory'],
    ['subcategory', 'Subcategory'],
    ['modelNumber', 'Model number'],
  ]

  requiredText.forEach(([field, label]) => {
    if (!cleanText(product[field])) errors.push(`${label} is required.`)
  })

  if (cleanText(product.name) && cleanText(product.name).length < 3) {
    errors.push('Product name must contain at least 3 characters.')
  }
  if (
    cleanText(product.description) &&
    cleanText(product.description).length < 20
  ) {
    errors.push('Description must contain at least 20 characters.')
  }
  if (cleanText(product.hsnCode) && !isValidHsnCode(product.hsnCode)) {
    errors.push('HSN Code must contain exactly 8 numeric digits.')
  }

  if (
    !Array.isArray(product.specs) ||
    !product.specs.some((item) => cleanText(item))
  ) {
    errors.push('Technical specifications are required.')
  }

  if (!isValidDecimalInput(product.price, { allowZero: false })) {
    errors.push('Selling price must be a positive INR amount with no more than 2 decimal places.')
  }

  if (!Number.isInteger(Number(product.stock)) || Number(product.stock) < 0) {
    errors.push('Stock must be a non-negative whole number.')
  }
  if (!MINIMUM_ORDER_QUANTITIES.includes(Number(product.minimumOrderQuantity ?? 1))) {
    errors.push('Select a valid minimum order quantity.')
  }
  if (product.pricingModel !== 'gst-exclusive-v1' || product.priceIncludesTax !== false) {
    errors.push('Products must use GST-exclusive selling prices.')
  }
  if (!isValidDecimalInput(product.taxRate) || Number(product.taxRate) > 100) {
    errors.push('GST must be between 0 and 100 with no more than 2 decimal places.')
  }
  const returnPolicy = product.returnPolicy
  if (returnPolicy && (
    typeof returnPolicy !== 'object' ||
    !RETURN_POLICY_TYPES.includes(returnPolicy.type) ||
    !cleanText(returnPolicy.conditions) ||
    cleanText(returnPolicy.conditions).length > 2000 ||
    !cleanText(returnPolicy.customerRights) ||
    cleanText(returnPolicy.customerRights).length > 500 ||
    !Number.isInteger(Number(returnPolicy.days)) ||
    (returnPolicy.type === 'non-returnable'
      ? Number(returnPolicy.days) !== 0
      : Number(returnPolicy.days) < 1 || Number(returnPolicy.days) > 365)
  )) {
    errors.push('Select a valid return policy, period, and conditions.')
  }

  return errors
}

export function assertValidProductForCreate(product) {
  const errors = validateProductForCreate(product)
  if (errors.length) throw new Error(errors.join(' '))
}

export function assertValidHsnCode(value) {
  if (!isValidHsnCode(value)) {
    throw new Error('HSN Code must contain exactly 8 numeric digits.')
  }
}

const DECIMAL_INPUT_PATTERN = /^\d+(?:\.\d{1,2})?$/

const cleanText = (value) => String(value ?? '').trim()

export const isValidDecimalInput = (value, { allowZero = true } = {}) => {
  const text = cleanText(value)
  if (!DECIMAL_INPUT_PATTERN.test(text)) return false
  const amount = Number(text)
  return Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0)
}

export const roundToTwoDecimals = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

export const calculateDiscountedPrice = (mrp, discount) =>
  roundToTwoDecimals(Number(mrp) * (1 - Number(discount) / 100))

export const normalizeDiscount = (value) => {
  if (value === '' || value === null || value === undefined) return ''
  const match = cleanText(value).match(/^(\d+(?:\.\d{1,2})?)(?:\s*%\s*(?:off)?)?$/i)
  return match ? match[1] : cleanText(value)
}

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

  if (
    !Array.isArray(product.specs) ||
    !product.specs.some((item) => cleanText(item))
  ) {
    errors.push('Technical specifications are required.')
  }

  if (!isValidDecimalInput(product.originalPrice, { allowZero: false })) {
    errors.push('MRP must be a positive INR amount with no more than 2 decimal places.')
  }
  if (!isValidDecimalInput(product.price)) {
    errors.push('Selling price must be an INR amount with no more than 2 decimal places.')
  }

  const mrp = Number(product.originalPrice)
  const sellingPrice = Number(product.price)
  if (Number.isFinite(mrp) && Number.isFinite(sellingPrice) && sellingPrice > mrp) {
    errors.push('Selling price cannot exceed MRP.')
  }

  if (!Number.isInteger(Number(product.stock)) || Number(product.stock) < 0) {
    errors.push('Stock must be a non-negative whole number.')
  }
  if (!/^(?:\d{4}|\d{6}|\d{8})$/.test(cleanText(product.hsnCode))) {
    errors.push('HSN code must contain 4, 6, or 8 digits.')
  }

  if (product.discount !== '' && product.discount !== null && product.discount !== undefined) {
    if (!isValidDecimalInput(product.discount) || Number(product.discount) > 100) {
      errors.push('Discount must be between 0 and 100 with no more than 2 decimal places.')
    } else if (
      Number.isFinite(mrp) &&
      Number.isFinite(sellingPrice) &&
      sellingPrice !== calculateDiscountedPrice(mrp, product.discount)
    ) {
      errors.push('Selling price must match the price calculated from MRP and discount.')
    }
  }

  return errors
}

export function assertValidProductForCreate(product) {
  const errors = validateProductForCreate(product)
  if (errors.length) throw new Error(errors.join(' '))
}

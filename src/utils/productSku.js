const SKU_SEQUENCE_PATTERN = /-(\d{6})$/
const COMPLETE_SKU_PATTERN = /^PC-([A-Z0-9]{3})-([A-Z0-9]{3})-(\d{6})$/i
const SKU_PREFIX_PATTERN = /^(?:PC-)?([A-Z0-9]{3})-([A-Z0-9]{3})$/i

const cleanText = (value) => String(value ?? '').trim()

export const extractSkuSequence = (sku) => {
  const match = cleanText(sku).match(SKU_SEQUENCE_PATTERN)
  return match ? Number(match[1]) : 0
}

export const getHighestSkuSequence = (products = []) =>
  products.reduce(
    (highest, product) => Math.max(highest, extractSkuSequence(product?.sku)),
    0,
  )

export const findSkuSequenceConflict = (
  sku,
  products = [],
  excludedProductId = '',
) => {
  const requestedSequence = extractSkuSequence(sku)
  if (!requestedSequence) return null

  return products.find((product) =>
    String(product?.id ?? '') !== String(excludedProductId ?? '') &&
    extractSkuSequence(product?.sku) === requestedSequence,
  ) || null
}

export const assertUniqueSkuSequence = (
  sku,
  products = [],
  excludedProductId = '',
) => {
  const conflict = findSkuSequenceConflict(sku, products, excludedProductId)
  if (!conflict) return

  const sequence = formatSkuSequence(extractSkuSequence(sku))
  throw new Error(
    `SKU sequence ${sequence} is already used by ${conflict.sku}. Enter a different six-digit sequence.`,
  )
}

export const formatSkuSequence = (sequence) => {
  const numericSequence = Number(sequence)
  if (
    !Number.isInteger(numericSequence) ||
    numericSequence < 1 ||
    numericSequence > 999999
  ) {
    throw new Error('The SKU sequence must be between 000001 and 999999.')
  }
  return String(numericSequence).padStart(6, '0')
}

export const createSkuSegment = (value) => {
  const words = cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return ''
  if (words[0].length === 3) return words[0]
  if (words.length >= 3) {
    return words.slice(0, 3).map((word) => word[0]).join('')
  }
  if (words.length === 2) {
    return `${words[0].slice(0, 2)}${words[1][0]}`.padEnd(3, 'X').slice(0, 3)
  }
  return words[0].padEnd(3, 'X').slice(0, 3)
}

export const resolveSkuSegments = (sku, category, subcategory) => {
  const value = cleanText(sku).toUpperCase()
  const completeMatch = value.match(COMPLETE_SKU_PATTERN)
  const prefixMatch = value.match(SKU_PREFIX_PATTERN)
  const match = completeMatch || prefixMatch
  if (match) return { categoryCode: match[1], subcategoryCode: match[2] }
  if (value) {
    throw new Error('SKU must use PC-XXX-YYY-000000 with exactly three characters per code.')
  }

  const categoryCode = createSkuSegment(category)
  const subcategoryCode = createSkuSegment(subcategory)
  if (!categoryCode || !subcategoryCode) {
    throw new Error('Select a category and subcategory before generating the SKU.')
  }
  return { categoryCode, subcategoryCode }
}

export const formatProductSku = (categoryCode, subcategoryCode, sequence) => {
  const prefix = `PC-${cleanText(categoryCode).toUpperCase()}-${cleanText(subcategoryCode).toUpperCase()}`
  if (!SKU_PREFIX_PATTERN.test(prefix)) {
    throw new Error('SKU codes must contain exactly three letters or numbers.')
  }
  return `${prefix}-${formatSkuSequence(sequence)}`
}

export const createProductSku = (sku, category, subcategory, sequence) => {
  const { categoryCode, subcategoryCode } = resolveSkuSegments(
    sku,
    category,
    subcategory,
  )
  return formatProductSku(categoryCode, subcategoryCode, sequence)
}

export const updateProductSku = (
  existingSku,
  requestedSku,
  category,
  subcategory,
) => {
  const existing = cleanText(existingSku)
  const requested = cleanText(requestedSku)
  if (requested === existing) return existing

  // A complete requested SKU intentionally replaces the stored sequence. A
  // prefix-only edit keeps the stored sequence, while legacy products without
  // one must provide the complete SKU.
  const sequence = extractSkuSequence(requested) || extractSkuSequence(existing)
  if (!sequence) {
    throw new Error(
      'Enter a complete SKU such as PC-PAC-FBD-000056 because the existing product has no six-digit sequence.',
    )
  }
  const { categoryCode, subcategoryCode } = resolveSkuSegments(
    requested,
    category,
    subcategory,
  )
  return formatProductSku(categoryCode, subcategoryCode, sequence)
}

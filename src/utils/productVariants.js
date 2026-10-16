import { usesGstExclusivePricing } from './productPricing.js'

const cleanText = (value) => String(value ?? '').trim()
const money = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

export const createVariantId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `variant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function normalizeProductVariant(variant = {}, index = 0) {
  const id = cleanText(variant.id) || `variant-${index + 1}`
  return {
    ...variant,
    id,
    name: cleanText(variant.name || variant.label || variant.modelNumber || variant.sku) || `Variant ${index + 1}`,
    sku: cleanText(variant.sku),
    price: variant.price ?? '',
    discountPrice: variant.discountPrice ?? '',
    stock: Math.max(0, Number(variant.stock) || 0),
    reservedStock: Math.max(0, Number(variant.reservedStock) || 0),
    modelNumber: cleanText(variant.modelNumber),
    image: cleanText(variant.image || variant.images?.[0]),
    images: Array.isArray(variant.images) ? variant.images.filter(Boolean) : [variant.image].filter(Boolean),
    imageStoragePaths: Array.isArray(variant.imageStoragePaths) ? variant.imageStoragePaths.filter(Boolean) : [],
    technicalSpecifications: Array.isArray(variant.technicalSpecifications) ? variant.technicalSpecifications : [],
    customSpecifications: Array.isArray(variant.customSpecifications) ? variant.customSpecifications : [],
  }
}

export const getProductVariants = (product = {}) =>
  (Array.isArray(product.variants) ? product.variants : []).map(normalizeProductVariant)

export const productHasVariants = (product = {}) => getProductVariants(product).length > 0

export const findProductVariant = (product, variantId) =>
  getProductVariants(product).find((variant) => String(variant.id) === String(variantId)) || null

export const variantCartKey = (productId, variantId = '') =>
  variantId ? `${String(productId)}::${String(variantId)}` : String(productId)

export const cartItemKey = (item = {}) =>
  variantCartKey(
    item.productId ?? item.product?.id,
    item.variantId ?? item.product?.selectedVariantId,
  )

const mergeSpecifications = (common, variant) => {
  const values = new Map()
  ;[...(Array.isArray(common) ? common : []), ...(Array.isArray(variant) ? variant : [])]
    .forEach((specification, index) => {
      const key = cleanText(
        specification.fieldId || specification.key || specification.label,
      ) || `specification-${index}`
      values.set(key, specification)
    })
  return [...values.values()]
}

export function productForVariant(product, variantId) {
  const variants = getProductVariants(product)
  if (!variants.length) return product
  const variant = variants.find((item) => String(item.id) === String(variantId))
  if (!variant) return null

  const variantPrice = money(variant.price)
  const legacyDiscountPrice = money(variant.discountPrice)
  const sellingPrice = !usesGstExclusivePricing(product) &&
      legacyDiscountPrice > 0 && legacyDiscountPrice <= variantPrice
    ? legacyDiscountPrice
    : variantPrice
  const images = variant.images.length
    ? variant.images
    : Array.isArray(product.images) && product.images.length
      ? product.images
      : [product.image].filter(Boolean)
  return {
    ...product,
    selectedVariantId: variant.id,
    selectedVariantName: variant.name,
    variant: variant.name,
    variantSnapshot: variant,
    sku: variant.sku || product.sku,
    modelNumber: variant.modelNumber || product.modelNumber,
    price: sellingPrice,
    stock: getVariantAvailableStock(variant),
    reservedStock: variant.reservedStock,
    image: images[0] || product.image || '',
    images,
    technicalSpecifications: mergeSpecifications(
      product.technicalSpecifications,
      variant.technicalSpecifications,
    ),
    customSpecifications: [
      ...(Array.isArray(product.customSpecifications) ? product.customSpecifications : []),
      ...variant.customSpecifications,
    ],
  }
}

export const getVariantAvailableStock = (variant) =>
  Math.max(0, Number(variant?.stock || 0) - Number(variant?.reservedStock || 0))

export const getProductAvailableStock = (product) => {
  const variants = getProductVariants(product)
  return variants.length
    ? variants.reduce((total, variant) => total + getVariantAvailableStock(variant), 0)
    : Math.max(0, Number(product?.stock || 0) - Number(product?.reservedStock || 0))
}

export const productForStorefront = (product = {}) => {
  const variants = getProductVariants(product).map((variant) => ({
    ...variant,
    stock: getVariantAvailableStock(variant),
    reservedStock: 0,
  }))

  return {
    ...product,
    stock: getProductAvailableStock(product),
    reservedStock: 0,
    variants,
  }
}

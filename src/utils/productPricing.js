import { parsePrice } from '../user/utils/currency.js'

export const GST_EXCLUSIVE_PRICING_MODEL = 'gst-exclusive-v1'

export const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

export const getProductTaxRate = (product = {}, fallbackRate = 18) => {
  const value = Number(product.taxRate ?? fallbackRate)
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
}

export const usesGstExclusivePricing = (product = {}) =>
  product.pricingModel === GST_EXCLUSIVE_PRICING_MODEL ||
  product.priceIncludesTax === false

export function getPriceBreakdown(product = {}, storedPrice = product.price, fallbackRate = 18) {
  const price = parsePrice(storedPrice)
  const taxRate = getProductTaxRate(product, fallbackRate)

  if (usesGstExclusivePricing(product)) {
    const basePrice = roundMoney(price)
    const gstAmount = roundMoney(basePrice * taxRate / 100)
    return {
      basePrice,
      gstAmount,
      finalPrice: roundMoney(basePrice + gstAmount),
      taxRate,
    }
  }

  // Legacy products stored the customer-facing price as tax-inclusive.
  // Preserve that payable price until an admin explicitly edits the product.
  const finalPrice = roundMoney(price)
  const basePrice = taxRate > 0
    ? roundMoney(finalPrice * 100 / (100 + taxRate))
    : finalPrice
  return {
    basePrice,
    gstAmount: roundMoney(finalPrice - basePrice),
    finalPrice,
    taxRate,
  }
}

export const getProductBasePrice = (product = {}, storedPrice = product.price, fallbackRate = 18) =>
  getPriceBreakdown(product, storedPrice, fallbackRate).basePrice

/**
 * Normalizes pricing tiers array.
 * Each tier object: { minQty: number, unitPrice: number }
 */
export function normalizePricingTiers(tiers = []) {
  if (!Array.isArray(tiers)) return []
  return tiers
    .map((tier) => ({
      minQty: Math.floor(Number(tier?.minQty)),
      unitPrice: parsePrice(tier?.unitPrice),
    }))
    .filter((tier) => Number.isInteger(tier.minQty) && tier.minQty >= 1 && tier.unitPrice > 0)
    .sort((a, b) => a.minQty - b.minQty)
}

/**
 * Default sample bulk pricing tiers when enabled in Admin for convenience.
 */
export function getDefaultSamplePricingTiers(basePrice = 0) {
  const price = parsePrice(basePrice) || 54.98
  return [
    { minQty: 1, unitPrice: price },
    { minQty: 10, unitPrice: Math.round(price * 0.6847 * 100) / 100 },
    { minQty: 100, unitPrice: Math.round(price * 0.4338 * 100) / 100 },
    { minQty: 500, unitPrice: Math.round(price * 0.2728 * 100) / 100 },
    { minQty: 1000, unitPrice: Math.round(price * 0.2390 * 100) / 100 },
    { minQty: 3000, unitPrice: Math.round(price * 0.2100 * 100) / 100 },
  ]
}

/**
 * Given a product (or variant) and a purchase quantity Q (>= 1),
 * calculates applicable unit price and tier info.
 */
export function getApplicablePricingTier(product = {}, quantity = 1) {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1))
  const storedBasePrice = parsePrice(product.price)
  const isBulkEnabled = Boolean(product.enableBulkPricing)
  const tiers = normalizePricingTiers(product.pricingTiers)

  if (!isBulkEnabled || tiers.length === 0) {
    const price = getPriceBreakdown(product, storedBasePrice)
    return {
      minQty: 1,
      unitPrice: price.basePrice,
      baseUnitPrice: price.basePrice,
      unitGst: price.gstAmount,
      taxRate: price.taxRate,
      isBulkTier: false,
      tierIndex: -1,
      tierLabel: null,
      appliedTier: null,
    }
  }

  // Tiers are sorted ascending by minQty. Find largest minQty <= qty.
  let matchingTier = null
  let matchingIndex = -1
  for (let i = 0; i < tiers.length; i++) {
    if (tiers[i].minQty <= qty) {
      matchingTier = tiers[i]
      matchingIndex = i
    } else {
      break
    }
  }

  if (matchingTier) {
    const price = getPriceBreakdown(product, matchingTier.unitPrice)
    return {
      minQty: matchingTier.minQty,
      unitPrice: price.basePrice,
      baseUnitPrice: price.basePrice,
      unitGst: price.gstAmount,
      taxRate: price.taxRate,
      isBulkTier: matchingTier.minQty > 1,
      tierIndex: matchingIndex,
      tierLabel: `${matchingTier.minQty.toLocaleString('en-IN')}+ units`,
      appliedTier: {
        minQty: matchingTier.minQty,
        unitPrice: price.basePrice,
        baseUnitPrice: price.basePrice,
      },
    }
  }

  const price = getPriceBreakdown(product, storedBasePrice)
  return {
    minQty: 1,
    unitPrice: price.basePrice,
    baseUnitPrice: price.basePrice,
    unitGst: price.gstAmount,
    taxRate: price.taxRate,
    isBulkTier: false,
    tierIndex: -1,
    tierLabel: null,
    appliedTier: null,
  }
}

/**
 * Convenience function to get just the applicable unit price for a given quantity.
 */
export function calculateProductUnitPrice(product = {}, quantity = 1) {
  return getApplicablePricingTier(product, quantity).unitPrice
}

/**
 * Validates pricing tiers for Admin creation/update.
 * Returns error string or null if valid.
 */
export function validatePricingTiers(tiers = [], enableBulkPricing = false) {
  if (!enableBulkPricing) return null
  if (!Array.isArray(tiers) || tiers.length === 0) {
    return 'Please add at least one quantity pricing tier when bulk pricing is enabled.'
  }
  for (let i = 0; i < tiers.length; i++) {
    const rawMinQty = tiers[i]?.minQty
    const rawUnitPrice = tiers[i]?.unitPrice
    const minQty = Number(rawMinQty)
    const unitPrice = parsePrice(rawUnitPrice)

    if (rawMinQty === '' || rawMinQty === null || rawMinQty === undefined || !Number.isInteger(minQty) || minQty < 1) {
      return `Tier ${i + 1}: Minimum quantity must be a positive whole number (1 or more).`
    }
    if (rawUnitPrice === '' || rawUnitPrice === null || rawUnitPrice === undefined || unitPrice <= 0) {
      return `Tier ${i + 1}: Unit price must be greater than ₹0.`
    }
    if (i > 0) {
      const prevMinQty = Number(tiers[i - 1]?.minQty)
      if (minQty <= prevMinQty) {
        return `Tier ${i + 1} min qty (${minQty}) must be strictly greater than Tier ${i} min qty (${prevMinQty}). Quantities must be in ascending order.`
      }
    }
  }
  return null
}

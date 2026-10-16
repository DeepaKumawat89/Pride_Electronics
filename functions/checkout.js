const money = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const normalizedText = (value) => String(value || '').trim().toLowerCase()
const GST_EXCLUSIVE_PRICING_MODEL = 'gst-exclusive-v1'

const taxRateFor = (product = {}, fallbackRate = 18) => {
  const value = Number(product.taxRate ?? fallbackRate)
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
}

const priceBreakdown = (product, storedPrice, fallbackRate = 18) => {
  const price = roundMoney(money(storedPrice))
  const taxRate = taxRateFor(product, fallbackRate)
  const taxExclusive = product.pricingModel === GST_EXCLUSIVE_PRICING_MODEL ||
    product.priceIncludesTax === false
  if (taxExclusive) {
    const gstAmount = roundMoney(price * taxRate / 100)
    return {
      basePrice: price,
      gstAmount,
      finalPrice: roundMoney(price + gstAmount),
      taxRate,
    }
  }
  const basePrice = taxRate > 0
    ? roundMoney(price * 100 / (100 + taxRate))
    : price
  return {
    basePrice,
    gstAmount: roundMoney(price - basePrice),
    finalPrice: price,
    taxRate,
  }
}

const DEFAULT_PAYMENT_CONFIGURATION = Object.freeze({
  razorpayEnabled: true,
  testMode: true,
  autoCapture: true,
  codEnabled: false,
  cardsEnabled: true,
  upiEnabled: true,
  netBankingEnabled: true,
  walletsEnabled: true,
})

function normalizePaymentConfiguration(value = {}) {
  return Object.fromEntries(
    Object.entries(DEFAULT_PAYMENT_CONFIGURATION).map(([key, fallback]) => [
      key,
      typeof value?.[key] === 'boolean' ? value[key] : fallback,
    ]),
  )
}

function razorpayEnvironmentForKey(keyId) {
  const normalized = String(keyId || '').trim()
  if (normalized.startsWith('rzp_test_')) return 'test'
  if (normalized.startsWith('rzp_live_')) return 'live'
  return ''
}

const appliesToProduct = (coupon, product) => {
  const products = Array.isArray(coupon?.applicableProducts)
    ? coupon.applicableProducts
    : []
  const categories = Array.isArray(coupon?.applicableCategories)
    ? coupon.applicableCategories
    : []
  if (!products.length && !categories.length) return true
  return (
    products.some(
      (value) =>
        String(value) === String(product.id) ||
        normalizedText(value) === normalizedText(product.name),
    ) ||
    categories.some(
      (value) => normalizedText(value) === normalizedText(product.category),
    )
  )
}

const itemSignature = (items) =>
  items
    .map((item) => `${String(item.productId)}:${String(item.variantId || '')}:${Number(item.qty || item.quantity)}`)
    .join('|')

function normalizeRequestedItems(items) {
  if (!Array.isArray(items) || !items.length || items.length > 50) {
    const error = new Error('The order must contain products.')
    error.code = 'invalid-items'
    throw error
  }
  const productIds = new Set()
  return items.map((item) => {
    const productId = String(item?.productId || '').trim()
    const variantId = String(item?.variantId || '').trim()
    const qty = Math.floor(Number(item?.qty || item?.quantity))
    const itemKey = `${productId}::${variantId}`
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(productId) ||
      (variantId && !/^[a-zA-Z0-9_-]{1,100}$/.test(variantId)) ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 100 ||
      productIds.has(itemKey)
    ) {
      const error = new Error('The order contains an invalid product.')
      error.code = 'invalid-items'
      throw error
    }
    productIds.add(itemKey)
    return { productId, ...(variantId ? { variantId } : {}), qty }
  })
}

function calculateOrderQuote({
  requestedItems,
  products,
  coupon = null,
  couponCode = '',
  shippingSettings = {},
  deliveryId = 'standard',
}) {
  const productsById = products instanceof Map
    ? products
    : new Map(products.map((product) => [String(product.id), product]))
  const items = requestedItems.map((requested) => {
    const product = productsById.get(String(requested.productId))
    const qty = Number(requested.qty || requested.quantity)
    if (!product || product.enabled === false) {
      const error = new Error('A product is no longer available.')
      error.code = 'product-unavailable'
      throw error
    }
    const variants = Array.isArray(product.variants) ? product.variants : []
    const variant = variants.find(
      (item) => String(item.id) === String(requested.variantId || ''),
    )
    if ((variants.length && !variant) || (!variants.length && requested.variantId)) {
      const error = new Error('The selected product variant is no longer available.')
      error.code = 'product-unavailable'
      throw error
    }
    const inventory = variant || product
    const available = Math.max(
      0,
      Number(inventory.stock || 0) - Number(inventory.reservedStock || 0),
    )
    if (!Number.isInteger(qty) || qty < 1 || qty > 100 || available < qty) {
      const error = new Error('A product has insufficient stock.')
      error.code = 'insufficient-stock'
      throw error
    }
    const variantPrice = money(variant?.price)
    const legacyVariantDiscountPrice = money(variant?.discountPrice)
    const usesExclusivePricing = product.pricingModel === GST_EXCLUSIVE_PRICING_MODEL ||
      product.priceIncludesTax === false
    let storedPrice = variant
      ? !usesExclusivePricing && legacyVariantDiscountPrice > 0 && legacyVariantDiscountPrice <= variantPrice
        ? legacyVariantDiscountPrice
        : variantPrice
      : money(product.price)

    let appliedTier = null
    const enableBulk = Boolean(product.enableBulkPricing || variant?.enableBulkPricing)
    const rawTiers = Array.isArray(product.pricingTiers) ? product.pricingTiers : []
    if (enableBulk && rawTiers.length > 0) {
      const tiers = rawTiers
        .map((tier) => ({ minQty: Math.max(1, Math.floor(Number(tier?.minQty) || 1)), unitPrice: money(tier?.unitPrice) }))
        .filter((tier) => tier.minQty >= 1 && tier.unitPrice > 0)
        .sort((a, b) => a.minQty - b.minQty)
      for (let i = 0; i < tiers.length; i++) {
        if (tiers[i].minQty <= qty) {
          storedPrice = tiers[i].unitPrice
          appliedTier = { minQty: tiers[i].minQty }
        } else {
          break
        }
      }
    }

    const price = priceBreakdown(
      product,
      storedPrice,
      18,
    )
    if (!(price.basePrice > 0)) {
      const error = new Error('A product does not have a valid current price.')
      error.code = 'product-unavailable'
      throw error
    }
    if (appliedTier) {
      appliedTier = {
        ...appliedTier,
        unitPrice: price.basePrice,
        baseUnitPrice: price.basePrice,
      }
    }
    return {
      productId: String(product.id),
      ...(variant ? { variantId: String(variant.id) } : {}),
      sku: String(variant?.sku || product.sku || `PE-${String(product.id).padStart(4, '0')}`).slice(0, 100),
      productName: String(product.name || 'Product').slice(0, 200),
      variant: String(variant?.name || product.variant || product.specification || '').slice(0, 200),
      variantModelNumber: String(variant?.modelNumber || '').slice(0, 100),
      variantSpecifications: Array.isArray(variant?.technicalSpecifications)
        ? variant.technicalSpecifications.slice(0, 50)
        : [],
      image: String(variant?.images?.[0] || variant?.image || product.image || '').slice(0, 2000),
      category: String(product.category || '').slice(0, 100),
      qty,
      price: price.basePrice,
      baseUnitPrice: price.basePrice,
      unitPrice: price.basePrice,
      unitGst: price.gstAmount,
      appliedTier,
      taxRate: price.taxRate,
    }
  })

  const sellingSubtotal = roundMoney(
    items.reduce((sum, item) => sum + item.price * item.qty, 0),
  )
  const eligibleSubtotal = coupon
    ? roundMoney(
        items.reduce(
          (sum, item) =>
            appliesToProduct(coupon, item)
              ? sum + item.price * item.qty
              : sum,
          0,
        ),
      )
    : sellingSubtotal
  if (coupon && sellingSubtotal < Number(coupon.minimumOrder || 0)) {
    const error = new Error('The coupon minimum order value is not met.')
    error.code = 'coupon-minimum-not-met'
    throw error
  }
  if (coupon && eligibleSubtotal <= 0) {
    const error = new Error('The coupon does not apply to these products.')
    error.code = 'coupon-not-applicable'
    throw error
  }
  const maximumDiscount = Math.max(
    0,
    Number(coupon?.maximumDiscount || Infinity),
  )
  const rawCouponDiscount = !coupon
    ? 0
    : coupon.discountType === 'Percentage'
      ? (eligibleSubtotal * Number(coupon.amount || 0)) / 100
      : coupon.discountType === 'Fixed Amount'
        ? Number(coupon.amount || 0)
        : 0
  const couponDiscount = roundMoney(
    Math.max(0, Math.min(rawCouponDiscount, maximumDiscount, eligibleSubtotal)),
  )
  const standardShipping =
    sellingSubtotal === 0 ||
    sellingSubtotal >= Number(shippingSettings.freeShippingThreshold ?? 999)
      ? 0
      : Number(shippingSettings.standardCharge ?? 99)
  const shipping = roundMoney(
    deliveryId === 'express'
      ? Number(shippingSettings.expressCharge ?? 199)
      : coupon?.discountType === 'Free Shipping'
        ? 0
        : standardShipping,
  )
  const tax = roundMoney(
        items.reduce((sum, item) => {
          const lineValue = item.price * item.qty
          const couponShare = sellingSubtotal
            ? (couponDiscount * lineValue) / sellingSubtotal
            : 0
          const taxable = Math.max(0, lineValue - couponShare)
          if (!couponDiscount) return sum + item.unitGst * item.qty
          const lineRate = Number(item.taxRate || 0)
          return sum + (taxable * lineRate) / 100
        }, 0),
      )
  const total = roundMoney(
    Math.max(
      0,
      sellingSubtotal - couponDiscount + shipping + tax,
    ),
  )

  return {
    items,
    itemSignature: itemSignature(items),
    couponId: coupon ? String(coupon.id || '') : '',
    couponCode: coupon ? String(couponCode || coupon.code || '').toUpperCase() : '',
    deliveryId: deliveryId === 'express' ? 'express' : 'standard',
    pricingModel: GST_EXCLUSIVE_PRICING_MODEL,
    sellingSubtotal,
    couponDiscount,
    shipping,
    tax,
    total,
    totalPaise: Math.round(total * 100),
  }
}

module.exports = {
  DEFAULT_PAYMENT_CONFIGURATION,
  calculateOrderQuote,
  itemSignature,
  money,
  normalizePaymentConfiguration,
  normalizeRequestedItems,
  razorpayEnvironmentForKey,
  roundMoney,
}

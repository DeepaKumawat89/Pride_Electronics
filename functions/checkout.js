const money = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const normalizedText = (value) => String(value || '').trim().toLowerCase()

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
    .map((item) => `${String(item.productId)}:${Number(item.qty || item.quantity)}`)
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
    const qty = Math.floor(Number(item?.qty || item?.quantity))
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(productId) ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 100 ||
      productIds.has(productId)
    ) {
      const error = new Error('The order contains an invalid product.')
      error.code = 'invalid-items'
      throw error
    }
    productIds.add(productId)
    return { productId, qty }
  })
}

function calculateOrderQuote({
  requestedItems,
  products,
  coupon = null,
  couponCode = '',
  shippingSettings = {},
  taxSettings = {},
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
    const available = Math.max(
      0,
      Number(product.stock || 0) - Number(product.reservedStock || 0),
    )
    if (!Number.isInteger(qty) || qty < 1 || qty > 100 || available < qty) {
      const error = new Error('A product has insufficient stock.')
      error.code = 'insufficient-stock'
      throw error
    }
    const price = money(product.price)
    const unitPrice = money(product.originalPrice || product.price)
    return {
      productId: String(product.id),
      sku: String(product.sku || `PE-${String(product.id).padStart(4, '0')}`).slice(0, 100),
      productName: String(product.name || 'Product').slice(0, 200),
      variant: String(product.variant || product.specification || '').slice(0, 200),
      image: String(product.image || '').slice(0, 2000),
      category: String(product.category || '').slice(0, 100),
      qty,
      price,
      unitPrice,
      discount: roundMoney(Math.max(0, unitPrice - price) * qty),
      taxRate: Number(product.taxRate ?? taxSettings.defaultRate ?? 0),
    }
  })

  const mrpSubtotal = roundMoney(
    items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
  )
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
  const taxRate = taxSettings.gstEnabled === false
    ? 0
    : Number(taxSettings.defaultRate || 0)
  const tax = taxSettings.gstEnabled === false
    ? 0
    : roundMoney(
        items.reduce((sum, item) => {
          const lineValue = item.price * item.qty
          const couponShare = sellingSubtotal
            ? (couponDiscount * lineValue) / sellingSubtotal
            : 0
          const taxable = Math.max(0, lineValue - couponShare)
          const lineRate = Number(item.taxRate ?? taxRate)
          return sum + (taxSettings.pricesIncludeTax
            ? (taxable * lineRate) / (100 + lineRate || 100)
            : (taxable * lineRate) / 100)
        }, 0),
      )
  const total = roundMoney(
    Math.max(
      0,
      sellingSubtotal - couponDiscount + shipping +
        (taxSettings.pricesIncludeTax ? 0 : tax),
    ),
  )

  return {
    items,
    itemSignature: itemSignature(items),
    couponId: coupon ? String(coupon.id || '') : '',
    couponCode: coupon ? String(couponCode || coupon.code || '').toUpperCase() : '',
    deliveryId: deliveryId === 'express' ? 'express' : 'standard',
    mrpSubtotal,
    sellingSubtotal,
    productDiscount: roundMoney(Math.max(0, mrpSubtotal - sellingSubtotal)),
    couponDiscount,
    shipping,
    tax,
    total,
    totalPaise: Math.round(total * 100),
  }
}

module.exports = {
  calculateOrderQuote,
  itemSignature,
  money,
  normalizeRequestedItems,
  roundMoney,
}

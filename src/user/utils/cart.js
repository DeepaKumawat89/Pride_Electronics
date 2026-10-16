import { getApplicablePricingTier } from '../../utils/productPricing.js'

export const FREE_SHIPPING_THRESHOLD = 999
export const STANDARD_SHIPPING_CHARGE = 99

const normalize = (value) => String(value || '').trim().toLowerCase()
const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

export const toRazorpayAmount = (amountInRupees) =>
  Math.round(Number(amountInRupees) * 100)

export const paymentAmountMatchesCheckout = (
  checkoutTotal,
  orderAmount,
  quoteTotalPaise,
) => {
  const checkoutAmountPaise = toRazorpayAmount(checkoutTotal)
  const gatewayAmountPaise = Number(orderAmount)
  const quotedAmountPaise = quoteTotalPaise == null
    ? gatewayAmountPaise
    : Number(quoteTotalPaise)
  return (
    Number.isInteger(checkoutAmountPaise) &&
    Number.isInteger(gatewayAmountPaise) &&
    Number.isInteger(quotedAmountPaise) &&
    checkoutAmountPaise === quotedAmountPaise &&
    quotedAmountPaise === gatewayAmountPaise
  )
}

const appliesToProduct = (coupon, product) => {
  const products = coupon.applicableProducts || []
  const categories = coupon.applicableCategories || []
  if (!products.length && !categories.length) return true
  return (
    products.some(
      (value) =>
        String(value) === String(product.id) ||
        normalize(value) === normalize(product.name),
    ) || categories.some((value) => normalize(value) === normalize(product.category))
  )
}

export function validateCartCoupon(
  code,
  subtotal,
  now = new Date(),
  coupons = [],
  context = {},
) {
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) {
    return { status: 'empty', code: '', discount: 0, freeShipping: false, message: '' }
  }
  const coupon = coupons.find(
    (item) => item.code.toUpperCase() === normalizedCode,
  )
  if (!coupon || coupon.enabled === false) {
    return { status: 'invalid', code: normalizedCode, discount: 0, freeShipping: false, message: 'This coupon code is not valid.' }
  }
  if (coupon.startDate && now < new Date(`${coupon.startDate}T00:00:00`)) {
    return { status: 'not-started', code: normalizedCode, discount: 0, freeShipping: false, message: `${normalizedCode} is not active yet.` }
  }
  if (coupon.endDate && now > new Date(`${coupon.endDate}T23:59:59`)) {
    return { status: 'expired', code: normalizedCode, discount: 0, freeShipping: false, message: `${normalizedCode} has expired.` }
  }
  if (Number(coupon.usageLimit) > 0 && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) {
    return { status: 'usage-limit-reached', code: normalizedCode, discount: 0, freeShipping: false, message: `${normalizedCode} has reached its usage limit.` }
  }
  const userUsage = Number(coupon.usageBy?.[normalize(context.userKey)] || 0)
  if (context.userKey && Number(coupon.perUserLimit) > 0 && userUsage >= Number(coupon.perUserLimit)) {
    return { status: 'user-limit-reached', code: normalizedCode, discount: 0, freeShipping: false, message: `You have already used ${normalizedCode} the maximum number of times.` }
  }
  if (subtotal < Number(coupon.minimumOrder || 0)) {
    return { status: 'minimum-not-reached', code: normalizedCode, discount: 0, freeShipping: false, message: `Minimum order value of ₹${Number(coupon.minimumOrder).toLocaleString('en-IN')} is required.` }
  }
  const eligibleSubtotal = Number(context.eligibleSubtotal ?? subtotal)
  if (eligibleSubtotal <= 0) {
    return { status: 'not-applicable', code: normalizedCode, discount: 0, freeShipping: false, message: `${normalizedCode} is not applicable to these products.` }
  }
  const maximumDiscount = Number(coupon.maximumDiscount || Infinity)
  const rawDiscount =
    coupon.discountType === 'Percentage'
      ? (eligibleSubtotal * Number(coupon.amount || 0)) / 100
      : coupon.discountType === 'Fixed Amount'
        ? Number(coupon.amount || 0)
        : 0
  return {
    status: 'applied',
    code: normalizedCode,
    discount: Math.min(rawDiscount, maximumDiscount, eligibleSubtotal),
    freeShipping: coupon.discountType === 'Free Shipping',
    message: `${normalizedCode} applied successfully.`,
    coupon,
  }
}

export function calculateCartPricing(
  items,
  couponCode = '',
  now = new Date(),
  coupons = [],
  userKey = '',
  shippingSettings = {},
) {
  const sellingSubtotal = roundMoney(items.reduce(
    (sum, { product, quantity }) =>
      sum + getApplicablePricingTier(product, quantity).baseUnitPrice * Number(quantity || 0),
    0,
  ))
  const selectedCoupon = coupons.find(
    (coupon) => coupon.code.toUpperCase() === couponCode.trim().toUpperCase(),
  )
  const eligibleSubtotal = selectedCoupon
    ? roundMoney(items.reduce(
        (sum, { product, quantity }) =>
          appliesToProduct(selectedCoupon, product)
            ? sum + getApplicablePricingTier(product, quantity).baseUnitPrice * Number(quantity || 0)
            : sum,
        0,
      ))
    : sellingSubtotal
  const validatedCoupon = validateCartCoupon(couponCode, sellingSubtotal, now, coupons, {
    eligibleSubtotal,
    userKey,
  })
  const coupon = {
    ...validatedCoupon,
    discount: roundMoney(validatedCoupon.discount),
  }
  const standardShipping =
    sellingSubtotal >=
      Number(
        shippingSettings.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD,
      ) || sellingSubtotal === 0
      ? 0
      : Number(shippingSettings.standardCharge ?? STANDARD_SHIPPING_CHARGE)
  const shipping = roundMoney(coupon.freeShipping ? 0 : standardShipping)
  const taxableAmount = Math.max(0, sellingSubtotal - coupon.discount)
  const tax = roundMoney(
        items.reduce((sum, { product, quantity }) => {
          const tier = getApplicablePricingTier(product, quantity)
          const lineValue = tier.baseUnitPrice * Number(quantity || 0)
          const couponShare = sellingSubtotal
            ? (coupon.discount * lineValue) / sellingSubtotal
            : 0
          const lineTaxableValue = Math.max(0, lineValue - couponShare)
          if (!coupon.discount) return sum + tier.unitGst * Number(quantity || 0)
          const lineTaxRate = tier.taxRate
          return sum + (lineTaxableValue * lineTaxRate) / 100
        }, 0),
      )
  const preTaxTotal = roundMoney(Math.max(0, taxableAmount + shipping))
  const total = roundMoney(Math.max(0, taxableAmount + shipping + tax))

  return {
    sellingSubtotal,
    couponDiscount: coupon.discount,
    shipping,
    tax,
    preTaxTotal,
    total,
    coupon,
  }
}

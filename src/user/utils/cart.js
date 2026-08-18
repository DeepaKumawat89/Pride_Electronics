import { initialCoupons } from '../../data/coupons.js'
import { parsePrice } from './currency.js'

export const FREE_SHIPPING_THRESHOLD = 999
export const STANDARD_SHIPPING_CHARGE = 99

const normalize = (value) => String(value || '').trim().toLowerCase()

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
  coupons = initialCoupons,
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
  coupons = initialCoupons,
  userKey = '',
) {
  const mrpSubtotal = items.reduce(
    (sum, { product, quantity }) =>
      sum + parsePrice(product.originalPrice || product.price) * Number(quantity || 0),
    0,
  )
  const sellingSubtotal = items.reduce(
    (sum, { product, quantity }) =>
      sum + parsePrice(product.price) * Number(quantity || 0),
    0,
  )
  const selectedCoupon = coupons.find(
    (coupon) => coupon.code.toUpperCase() === couponCode.trim().toUpperCase(),
  )
  const eligibleSubtotal = selectedCoupon
    ? items.reduce(
        (sum, { product, quantity }) =>
          appliesToProduct(selectedCoupon, product)
            ? sum + parsePrice(product.price) * Number(quantity || 0)
            : sum,
        0,
      )
    : sellingSubtotal
  const productDiscount = Math.max(0, mrpSubtotal - sellingSubtotal)
  const coupon = validateCartCoupon(couponCode, sellingSubtotal, now, coupons, {
    eligibleSubtotal,
    userKey,
  })
  const standardShipping =
    sellingSubtotal >= FREE_SHIPPING_THRESHOLD || sellingSubtotal === 0
      ? 0
      : STANDARD_SHIPPING_CHARGE
  const shipping = coupon.freeShipping ? 0 : standardShipping
  const taxableAmount = Math.max(0, sellingSubtotal - coupon.discount)
  const tax = Math.round((taxableAmount * 18) / 118)
  const total = Math.max(0, taxableAmount + shipping)

  return {
    mrpSubtotal,
    sellingSubtotal,
    productDiscount,
    couponDiscount: coupon.discount,
    shipping,
    tax,
    total,
    coupon,
  }
}

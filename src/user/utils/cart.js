import { parsePrice } from './currency.js'

export const FREE_SHIPPING_THRESHOLD = 999
export const STANDARD_SHIPPING_CHARGE = 99

const couponRules = {
  PRIDE500: {
    expiresAt: '2026-12-31T23:59:59+05:30',
    minimumOrder: 2499,
    discount: 500,
  },
  WELCOME200: {
    expiresAt: '2026-07-31T23:59:59+05:30',
    minimumOrder: 1499,
    discount: 200,
  },
}

export function validateCartCoupon(code, subtotal, now = new Date()) {
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) {
    return { status: 'empty', code: '', discount: 0, message: '' }
  }

  const rule = couponRules[normalizedCode]
  if (!rule) {
    return {
      status: 'invalid',
      code: normalizedCode,
      discount: 0,
      message: 'This coupon code is not valid.',
    }
  }
  if (now.getTime() > new Date(rule.expiresAt).getTime()) {
    return {
      status: 'expired',
      code: normalizedCode,
      discount: 0,
      message: `${normalizedCode} has expired.`,
    }
  }
  if (subtotal < rule.minimumOrder) {
    return {
      status: 'minimum-not-reached',
      code: normalizedCode,
      discount: 0,
      message: `Minimum order value of ₹${rule.minimumOrder.toLocaleString('en-IN')} is required.`,
    }
  }

  return {
    status: 'applied',
    code: normalizedCode,
    discount: Math.min(rule.discount, subtotal),
    message: `${normalizedCode} applied successfully.`,
  }
}

export function calculateCartPricing(items, couponCode = '', now = new Date()) {
  const mrpSubtotal = items.reduce(
    (sum, { product, quantity }) =>
      sum +
      parsePrice(product.originalPrice || product.price) * Number(quantity || 0),
    0,
  )
  const sellingSubtotal = items.reduce(
    (sum, { product, quantity }) =>
      sum + parsePrice(product.price) * Number(quantity || 0),
    0,
  )
  const productDiscount = Math.max(0, mrpSubtotal - sellingSubtotal)
  const coupon = validateCartCoupon(couponCode, sellingSubtotal, now)
  const shipping =
    sellingSubtotal >= FREE_SHIPPING_THRESHOLD || sellingSubtotal === 0
      ? 0
      : STANDARD_SHIPPING_CHARGE
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

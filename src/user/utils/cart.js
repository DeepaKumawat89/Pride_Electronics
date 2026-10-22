import { getApplicablePricingTier } from '../../utils/productPricing.js'

export const FREE_SHIPPING_THRESHOLD = 999
export const STANDARD_SHIPPING_CHARGE = 99
export const MINIMUM_ORDER_VALUE = 100
export const MINIMUM_ORDER_MESSAGE = 'Minimum order value is ₹100 (excluding GST and delivery charges).'

const normalize = (value) => String(value || '').trim().toLowerCase()
const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100

const normalizeTaxRate = (value, fallback = 18) => {
  const rate = Number(value ?? fallback)
  return Number.isFinite(rate) ? Math.max(0, Math.min(100, rate)) : 0
}

const taxComponentsFor = (taxableValue, gstRate, supplyType) => {
  const taxable = roundMoney(taxableValue)
  const rate = normalizeTaxRate(gstRate, 0)
  const gstAmount = roundMoney(taxable * rate / 100)
  if (supplyType === 'inter-state') {
    return { cgst: 0, sgst: 0, igst: gstAmount, gstAmount }
  }
  const cgst = roundMoney(gstAmount / 2)
  const sgst = roundMoney(gstAmount - cgst)
  return { cgst, sgst, igst: 0, gstAmount }
}

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

export function authoritativePricingFromQuote(quote = {}, gatewayAmount) {
  const pricing = {
    sellingSubtotal: roundMoney(quote.sellingSubtotal),
    taxableSubtotal: roundMoney(quote.taxableSubtotal),
    couponDiscount: roundMoney(quote.couponDiscount),
    shipping: roundMoney(quote.shipping),
    productTax: roundMoney(quote.productTax),
    shippingTax: roundMoney(quote.shippingTax),
    tax: roundMoney(quote.tax),
    cgst: roundMoney(quote.cgst),
    sgst: roundMoney(quote.sgst),
    igst: roundMoney(quote.igst),
    total: roundMoney(quote.total),
    totalPaise: Number(quote.totalPaise),
    supplyType: quote.supplyType === 'inter-state' ? 'inter-state' : 'intra-state',
    shippingTaxRate: Number(quote.shippingTaxRate || 0),
    shippingTaxTreatment: String(quote.shippingTaxTreatment || 'exempt'),
    shippingTaxBreakdown: Array.isArray(quote.shippingTaxBreakdown)
      ? quote.shippingTaxBreakdown
      : [],
    lineTaxes: Array.isArray(quote.items) ? quote.items : [],
  }
  const monetaryValues = [
    pricing.sellingSubtotal,
    pricing.taxableSubtotal,
    pricing.couponDiscount,
    pricing.shipping,
    pricing.productTax,
    pricing.shippingTax,
    pricing.tax,
    pricing.cgst,
    pricing.sgst,
    pricing.igst,
    pricing.total,
  ]
  const expectedTaxableSubtotal = roundMoney(
    pricing.sellingSubtotal - pricing.couponDiscount,
  )
  const expectedTax = roundMoney(pricing.productTax + pricing.shippingTax)
  const expectedSplitTax = roundMoney(pricing.cgst + pricing.sgst + pricing.igst)
  const expectedTotal = roundMoney(
    pricing.taxableSubtotal + pricing.shipping + pricing.tax,
  )
  const expectedTotalPaise = toRazorpayAmount(expectedTotal)

  if (
    monetaryValues.some((value) => !Number.isFinite(value) || value < 0) ||
    pricing.taxableSubtotal < MINIMUM_ORDER_VALUE ||
    pricing.taxableSubtotal !== expectedTaxableSubtotal ||
    pricing.tax !== expectedTax ||
    pricing.tax !== expectedSplitTax ||
    pricing.total !== expectedTotal ||
    !Number.isInteger(pricing.totalPaise) ||
    pricing.totalPaise !== expectedTotalPaise ||
    Number(gatewayAmount) !== expectedTotalPaise
  ) {
    throw new Error('Firebase returned an inconsistent checkout calculation. Please try again.')
  }

  return pricing
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
  taxSettings = {},
  supplyType = 'intra-state',
  deliveryId = 'office_pickup',
) {
  const normalizedSupplyType = supplyType === 'inter-state'
    ? 'inter-state'
    : 'intra-state'
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
  const normalizedDeliveryId = ['office_pickup', 'porter', 'delivery_express'].includes(deliveryId)
    ? deliveryId
    : 'office_pickup'
  const shipping = normalizedDeliveryId === 'delivery_express' ? 100 : 0
  let allocatedDiscount = 0
  const lineTaxes = items.map(({ product, quantity }, index) => {
    const tier = getApplicablePricingTier(product, quantity)
    const grossAmount = roundMoney(tier.baseUnitPrice * Number(quantity || 0))
    const discount = index === items.length - 1
      ? roundMoney(Math.max(0, coupon.discount - allocatedDiscount))
      : roundMoney(sellingSubtotal ? coupon.discount * grossAmount / sellingSubtotal : 0)
    allocatedDiscount = roundMoney(allocatedDiscount + discount)
    const taxableValue = roundMoney(Math.max(0, grossAmount - discount))
    const gstRate = normalizeTaxRate(tier.taxRate, 0)
    const taxComponents = taxComponentsFor(taxableValue, gstRate, normalizedSupplyType)
    return {
      productId: product.id,
      variantId: product.selectedVariantId || '',
      taxableValue,
      gstRate,
      ...taxComponents,
    }
  })
  const taxableAmount = roundMoney(
    lineTaxes.reduce((sum, item) => sum + item.taxableValue, 0),
  )
  const productTax = roundMoney(
    lineTaxes.reduce((sum, item) => sum + item.gstAmount, 0),
  )
  const shippingTaxTreatment = shipping > 0
    ? 'fixed'
    : 'exempt'
  let shippingTaxBreakdown = []
  if (shipping > 0 && shippingTaxTreatment === 'fixed') {
    const rate = normalizeTaxRate(
      18,
      18,
    )
    shippingTaxBreakdown = [{
      taxableValue: shipping,
      gstRate: rate,
      ...taxComponentsFor(shipping, rate, normalizedSupplyType),
    }]
  } else if (shipping > 0 && shippingTaxTreatment === 'product-rates') {
    let allocatedShipping = 0
    shippingTaxBreakdown = lineTaxes.map((line, index) => {
      const taxableValue = index === lineTaxes.length - 1
        ? roundMoney(Math.max(0, shipping - allocatedShipping))
        : roundMoney(taxableAmount ? shipping * line.taxableValue / taxableAmount : 0)
      allocatedShipping = roundMoney(allocatedShipping + taxableValue)
      return {
        productId: line.productId,
        variantId: line.variantId,
        taxableValue,
        gstRate: line.gstRate,
        ...taxComponentsFor(taxableValue, line.gstRate, normalizedSupplyType),
      }
    })
  }
  const shippingTax = roundMoney(
    shippingTaxBreakdown.reduce((sum, item) => sum + item.gstAmount, 0),
  )
  const shippingTaxRate = shippingTaxTreatment === 'fixed'
    ? Number(shippingTaxBreakdown[0]?.gstRate || 0)
    : 0
  const tax = roundMoney(productTax + shippingTax)
  const cgst = roundMoney(
    lineTaxes.reduce((sum, item) => sum + Number(item.cgst || 0), 0) +
      shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.cgst || 0), 0),
  )
  const sgst = roundMoney(
    lineTaxes.reduce((sum, item) => sum + Number(item.sgst || 0), 0) +
      shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.sgst || 0), 0),
  )
  const igst = roundMoney(
    lineTaxes.reduce((sum, item) => sum + Number(item.igst || 0), 0) +
      shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.igst || 0), 0),
  )
  const preTaxTotal = roundMoney(Math.max(0, taxableAmount + shipping))
  const total = roundMoney(Math.max(0, taxableAmount + shipping + tax))

  return {
    sellingSubtotal,
    taxableSubtotal: taxableAmount,
    couponDiscount: coupon.discount,
    shipping,
    productTax,
    lineTaxes,
    shippingTax,
    shippingTaxRate,
    shippingTaxTreatment,
    shippingTaxBreakdown,
    tax,
    cgst,
    sgst,
    igst,
    supplyType: normalizedSupplyType,
    deliveryId: normalizedDeliveryId,
    preTaxTotal,
    total,
    coupon,
  }
}

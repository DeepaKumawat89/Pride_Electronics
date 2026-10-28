const money = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const normalizedText = (value) => String(value || '').trim().toLowerCase()
const GST_EXCLUSIVE_PRICING_MODEL = 'gst-exclusive-v1'
const MINIMUM_ORDER_VALUE = 100
const MINIMUM_ORDER_MESSAGE = 'Minimum order value is ₹100 (excluding GST and delivery charges).'
const MINIMUM_ORDER_QUANTITIES = Object.freeze([1, 2, 5, 10, 20, 50, 100])
const DELIVERY_METHODS = Object.freeze({
  office_pickup: { name: 'Collect From Office', charge: 0 },
  porter: { name: 'Through Porter', charge: 0 },
  delivery_express: { name: 'Delivery Express', charge: 100 },
})
const DELIVERY_METHOD_ALIASES = Object.freeze({
  'office-pickup': 'office_pickup',
  'delivery-express': 'delivery_express',
})
const PORTER_NOTICE = 'Please book Porter yourself and pay the delivery charges directly to Porter. No delivery charges will be collected by Pride Circuit.'
const OFFICE_PICKUP_ADDRESS = 'Office No. 237, 2nd Floor, XION Mall, Hinjewadi, Pune, MH 411057'
const normalizedHsnCode = (value) => {
  const hsnCode = String(value || '').trim()
  return /^[0-9]{8}$/.test(hsnCode) ? hsnCode : ''
}

const minimumOrderQuantityFor = (product = {}) => {
  if (
    !Object.prototype.hasOwnProperty.call(product, 'minimumOrderQuantity') ||
    product.minimumOrderQuantity === null ||
    product.minimumOrderQuantity === ''
  ) return 1
  const value = Number(product.minimumOrderQuantity)
  if (!MINIMUM_ORDER_QUANTITIES.includes(value)) {
    const error = new Error('A product has an invalid minimum order quantity.')
    error.code = 'product-unavailable'
    throw error
  }
  return value
}

function validateMinimumOrderQuantities(requestedItems, products) {
  const productsById = products instanceof Map
    ? products
    : new Map(products.map((product) => [String(product.id), product]))
  requestedItems.forEach((requested) => {
    const product = productsById.get(String(requested.productId))
    if (!product || product.enabled === false) {
      const error = new Error('A product is no longer available.')
      error.code = 'product-unavailable'
      throw error
    }
    const minimumOrderQuantity = minimumOrderQuantityFor(product)
    const quantity = Number(requested.qty || requested.quantity)
    if (!Number.isInteger(quantity) || quantity < minimumOrderQuantity) {
      const error = new Error(
        `${String(product.name || 'This product')} requires a minimum quantity of ${minimumOrderQuantity}.`,
      )
      error.code = 'minimum-order-quantity-not-met'
      throw error
    }
  })
}

const CUSTOMER_RIGHTS_NOTICE =
  'Defective, damaged, or incorrect products remain covered by applicable customer rights.'
const RETURN_POLICY_TYPES = ['return', 'replacement', 'non-returnable']

const returnPolicySnapshotFor = (product = {}) => {
  const source = product.returnPolicy
  const type = RETURN_POLICY_TYPES.includes(source?.type)
    ? source.type
    : 'unspecified'
  const days = type === 'non-returnable' || type === 'unspecified'
    ? 0
    : Math.max(1, Math.min(365, Math.floor(Number(source?.days) || 0)))
  const labels = {
    return: 'Return Available',
    replacement: 'Replacement Only',
    'non-returnable': 'Non-Returnable / Non-Replaceable',
    unspecified: 'Return / replacement policy not specified',
  }
  return {
    type,
    label: labels[type],
    days,
    conditions: String(
      (typeof source === 'string' ? source : source?.conditions) ||
        'Contact Pride Circuit support for eligibility details.',
    ).trim().slice(0, 2000),
    customerRights: String(source?.customerRights || CUSTOMER_RIGHTS_NOTICE)
      .trim()
      .slice(0, 500),
  }
}

const taxRateFor = (product = {}, fallbackRate = 18) => {
  const value = Number(product.taxRate ?? fallbackRate)
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
}

const priceBreakdown = (product, storedPrice, fallbackRate = 18) => {
  const price = roundMoney(money(storedPrice))
  const taxRate = taxRateFor(product, fallbackRate)
  const gstAmount = roundMoney(price * taxRate / 100)
  return {
    basePrice: price,
    gstAmount,
    finalPrice: roundMoney(price + gstAmount),
    taxRate,
  }
}

const taxComponentsFor = (taxableValue, gstRate, supplyType) => {
  const taxable = roundMoney(taxableValue)
  const rate = taxRateFor({ taxRate: gstRate }, 0)
  const gstAmount = roundMoney(taxable * rate / 100)
  if (supplyType === 'inter-state') {
    return { cgst: 0, sgst: 0, igst: gstAmount, gstAmount }
  }
  const cgst = roundMoney(gstAmount / 2)
  const sgst = roundMoney(gstAmount - cgst)
  return { cgst, sgst, igst: 0, gstAmount }
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
  taxSettings = {},
  deliveryId = '',
  supplyType = 'intra-state',
}) {
  const normalizedSupplyType = supplyType === 'inter-state'
    ? 'inter-state'
    : 'intra-state'
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
    const minimumOrderQuantity = minimumOrderQuantityFor(product)
    if (qty < minimumOrderQuantity) {
      const error = new Error(
        `${String(product.name || 'This product')} requires a minimum quantity of ${minimumOrderQuantity}.`,
      )
      error.code = 'minimum-order-quantity-not-met'
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
    let storedPrice = variant
      ? money(variant.price)
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
      hsnCode: normalizedHsnCode(product.hsnCode),
      productName: String(product.name || 'Product').slice(0, 200),
      variant: String(variant?.name || product.variant || product.specification || '').slice(0, 200),
      variantModelNumber: String(variant?.modelNumber || '').slice(0, 100),
      variantSpecifications: Array.isArray(variant?.technicalSpecifications)
        ? variant.technicalSpecifications.slice(0, 50)
        : [],
      image: String(variant?.images?.[0] || variant?.image || product.image || '').slice(0, 2000),
      category: String(product.category || '').slice(0, 100),
      qty,
      minimumOrderQuantity,
      price: price.basePrice,
      baseUnitPrice: price.basePrice,
      unitPrice: price.basePrice,
      unitGst: price.gstAmount,
      appliedTier,
      taxRate: price.taxRate,
      returnPolicy: returnPolicySnapshotFor(product),
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
  const requestedDeliveryId = DELIVERY_METHOD_ALIASES[deliveryId] || deliveryId
  if (!Object.hasOwn(DELIVERY_METHODS, requestedDeliveryId)) {
    const error = new Error('Select a valid delivery method.')
    error.code = 'invalid-delivery-method'
    throw error
  }
  const normalizedDeliveryId = requestedDeliveryId
  const deliveryMethod = DELIVERY_METHODS[normalizedDeliveryId]
  const shipping = deliveryMethod.charge
  const deliveryDetails = normalizedDeliveryId === 'office_pickup'
    ? {
        pickupAddress: OFFICE_PICKUP_ADDRESS,
        instructions: 'Collect your order after Pride Circuit confirms that it is ready.',
      }
    : normalizedDeliveryId === 'porter'
      ? { instructions: PORTER_NOTICE, chargesCollectedByPrideCircuit: false }
      : { baseCharge: 100, gstRate: 18, gstAmount: 18 }
  let allocatedDiscount = 0
  const quotedItems = items.map((item, index) => {
    const grossAmount = roundMoney(item.price * item.qty)
    const discount = index === items.length - 1
      ? roundMoney(Math.max(0, couponDiscount - allocatedDiscount))
      : roundMoney(sellingSubtotal ? couponDiscount * grossAmount / sellingSubtotal : 0)
    allocatedDiscount = roundMoney(allocatedDiscount + discount)
    const taxableValue = roundMoney(Math.max(0, grossAmount - discount))
    const taxComponents = taxComponentsFor(
      taxableValue,
      item.taxRate,
      normalizedSupplyType,
    )
    const lineTax = taxComponents.gstAmount
    return {
      ...item,
      grossAmount,
      discount,
      taxableValue,
      productTotal: taxableValue,
      unitSellingPrice: item.qty > 0 ? taxableValue / item.qty : 0,
      cgst: taxComponents.cgst,
      sgst: taxComponents.sgst,
      igst: taxComponents.igst,
      lineTax,
      lineTotal: roundMoney(taxableValue + lineTax),
    }
  })
  const taxableSubtotal = roundMoney(
    quotedItems.reduce((sum, item) => sum + item.taxableValue, 0),
  )
  if (taxableSubtotal < MINIMUM_ORDER_VALUE) {
    const error = new Error(MINIMUM_ORDER_MESSAGE)
    error.code = 'minimum-order-not-met'
    throw error
  }
  const productTax = roundMoney(
    quotedItems.reduce((sum, item) => sum + item.lineTax, 0),
  )
  const configuredShippingTaxTreatment = ['fixed', 'product-rates', 'exempt']
    .includes(taxSettings.shippingTaxTreatment)
    ? taxSettings.shippingTaxTreatment
    : 'product-rates'
  const shippingTaxTreatment = shipping > 0
    ? configuredShippingTaxTreatment
    : 'exempt'
  let shippingTaxBreakdown = []
  if (shipping > 0 && shippingTaxTreatment === 'fixed') {
    const rate = taxRateFor(
      { taxRate: taxSettings.shippingTaxRate },
      18,
    )
    const components = taxComponentsFor(shipping, rate, normalizedSupplyType)
    shippingTaxBreakdown = [{
      taxableValue: shipping,
      gstRate: rate,
      ...components,
    }]
  } else if (shipping > 0 && shippingTaxTreatment === 'product-rates') {
    let allocatedShipping = 0
    shippingTaxBreakdown = quotedItems.map((item, index) => {
      const taxableValue = index === quotedItems.length - 1
        ? roundMoney(Math.max(0, shipping - allocatedShipping))
        : roundMoney(taxableSubtotal
            ? shipping * item.taxableValue / taxableSubtotal
            : 0)
      allocatedShipping = roundMoney(allocatedShipping + taxableValue)
      const components = taxComponentsFor(
        taxableValue,
        item.taxRate,
        normalizedSupplyType,
      )
      return {
        productId: item.productId,
        variantId: item.variantId || '',
        taxableValue,
        gstRate: Number(item.taxRate || 0),
        ...components,
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
    quotedItems.reduce((sum, item) => sum + Number(item.cgst || 0), 0) +
      shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.cgst || 0), 0),
  )
  const sgst = roundMoney(
    quotedItems.reduce((sum, item) => sum + Number(item.sgst || 0), 0) +
      shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.sgst || 0), 0),
  )
  const igst = roundMoney(
    quotedItems.reduce((sum, item) => sum + Number(item.igst || 0), 0) +
      shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.igst || 0), 0),
  )
  const total = roundMoney(
    Math.max(
      0,
      taxableSubtotal + shipping + tax,
    ),
  )

  return {
    items: quotedItems,
    itemSignature: itemSignature(items),
    couponId: coupon ? String(coupon.id || '') : '',
    couponCode: coupon ? String(couponCode || coupon.code || '').toUpperCase() : '',
    deliveryId: normalizedDeliveryId,
    deliveryMethod: deliveryMethod.name,
    deliveryDetails,
    pricingModel: GST_EXCLUSIVE_PRICING_MODEL,
    supplyType: normalizedSupplyType,
    sellingSubtotal,
    taxableSubtotal,
    couponDiscount,
    shipping,
    productTax,
    shippingTax,
    shippingTaxRate,
    shippingTaxTreatment,
    shippingTaxBreakdown,
    tax,
    cgst,
    sgst,
    igst,
    total,
    totalPaise: Math.round(total * 100),
  }
}

function payableAmountPaiseForQuote(quote = {}) {
  const sellingSubtotal = roundMoney(quote.sellingSubtotal)
  const couponDiscount = roundMoney(quote.couponDiscount)
  const taxableSubtotal = roundMoney(quote.taxableSubtotal)
  const shipping = roundMoney(quote.shipping)
  const productTax = roundMoney(quote.productTax)
  const shippingTax = roundMoney(quote.shippingTax)
  const tax = roundMoney(quote.tax)
  const total = roundMoney(quote.total)
  const componentTax = roundMoney(
    Number(quote.cgst || 0) + Number(quote.sgst || 0) + Number(quote.igst || 0),
  )
  const totalPaise = Number(quote.totalPaise)
  const expectedTaxableSubtotal = roundMoney(sellingSubtotal - couponDiscount)
  const expectedTax = roundMoney(productTax + shippingTax)
  const expectedTotal = roundMoney(taxableSubtotal + shipping + tax)
  const expectedTotalPaise = Math.round(expectedTotal * 100)
  const items = Array.isArray(quote.items) ? quote.items : []
  const invalidItem = items.some((item) => {
    const quantity = Number(item.qty)
    const minimumOrderQuantity = Number(item.minimumOrderQuantity ?? 1)
    const unitPrice = roundMoney(item.price)
    const grossAmount = roundMoney(item.grossAmount)
    const discount = roundMoney(item.discount)
    const taxableValue = roundMoney(item.taxableValue)
    const rate = taxRateFor({ taxRate: item.taxRate }, 0)
    const lineTax = roundMoney(item.lineTax)
    return (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !MINIMUM_ORDER_QUANTITIES.includes(minimumOrderQuantity) ||
      quantity < minimumOrderQuantity ||
      unitPrice <= 0 ||
      grossAmount !== roundMoney(unitPrice * quantity) ||
      discount < 0 ||
      taxableValue !== roundMoney(grossAmount - discount) ||
      lineTax !== roundMoney(taxableValue * rate / 100) ||
      roundMoney(item.lineTotal) !== roundMoney(taxableValue + lineTax)
    )
  })
  const itemTaxableSubtotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.taxableValue || 0), 0),
  )
  const itemTaxTotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.lineTax || 0), 0),
  )
  const shippingBreakdown = Array.isArray(quote.shippingTaxBreakdown)
    ? quote.shippingTaxBreakdown
    : []
  const shippingBreakdownTax = roundMoney(
    shippingBreakdown.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0),
  )
  const shippingBreakdownTaxable = roundMoney(
    shippingBreakdown.reduce((sum, item) => sum + Number(item.taxableValue || 0), 0),
  )
  const invalidShippingTaxLine = shippingBreakdown.some((item, index) => {
    const taxableValue = roundMoney(item.taxableValue)
    const rate = taxRateFor({ taxRate: item.gstRate }, 0)
    const matchingItem = items[index]
    return (
      !Number.isFinite(taxableValue) ||
      taxableValue < 0 ||
      roundMoney(item.gstAmount) !== roundMoney(taxableValue * rate / 100) ||
      (quote.shippingTaxTreatment === 'product-rates' && (
        !matchingItem ||
        String(item.productId || '') !== String(matchingItem.productId || '') ||
        String(item.variantId || '') !== String(matchingItem.variantId || '') ||
        rate !== taxRateFor({ taxRate: matchingItem.taxRate }, 0)
      ))
    )
  })
  const validShippingTaxTreatment = ['fixed', 'product-rates', 'exempt']
    .includes(quote.shippingTaxTreatment)
  const invalidFixedShippingTax = quote.shippingTaxTreatment === 'fixed' && (
    shippingBreakdown.length !== 1 ||
    taxRateFor({ taxRate: shippingBreakdown[0]?.gstRate }, 0) !==
      taxRateFor({ taxRate: quote.shippingTaxRate }, 0)
  )
  const invalidProductRateShippingTax = quote.shippingTaxTreatment === 'product-rates' &&
    shippingBreakdown.length !== items.length
  const values = [
    sellingSubtotal,
    couponDiscount,
    taxableSubtotal,
    shipping,
    productTax,
    shippingTax,
    tax,
    total,
  ]

  if (
    values.some((value) => !Number.isFinite(value) || value < 0) ||
    items.length < 1 ||
    taxableSubtotal < MINIMUM_ORDER_VALUE ||
    invalidItem ||
    itemTaxableSubtotal !== taxableSubtotal ||
    itemTaxTotal !== productTax ||
    !validShippingTaxTreatment ||
    invalidShippingTaxLine ||
    invalidFixedShippingTax ||
    invalidProductRateShippingTax ||
    shippingBreakdownTax !== shippingTax ||
    (quote.shippingTaxTreatment === 'exempt'
      ? shippingBreakdown.length !== 0 || shippingTax !== 0
      : shippingBreakdownTaxable !== shipping) ||
    taxableSubtotal !== expectedTaxableSubtotal ||
    tax !== expectedTax ||
    componentTax !== tax ||
    total !== expectedTotal ||
    !Number.isInteger(totalPaise) ||
    totalPaise !== expectedTotalPaise
  ) {
    const error = new Error('The verified checkout total is inconsistent.')
    error.code = 'invalid-payable-amount'
    throw error
  }

  return totalPaise
}

module.exports = {
  DEFAULT_PAYMENT_CONFIGURATION,
  MINIMUM_ORDER_MESSAGE,
  MINIMUM_ORDER_VALUE,
  calculateOrderQuote,
  itemSignature,
  money,
  normalizePaymentConfiguration,
  normalizeRequestedItems,
  validateMinimumOrderQuantities,
  payableAmountPaiseForQuote,
  razorpayEnvironmentForKey,
  roundMoney,
}

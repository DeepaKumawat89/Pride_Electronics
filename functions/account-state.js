const limits = {
  wishlist: 200,
  addresses: 20,
  paymentMethods: 10,
  cart: 100,
  savedCart: 100,
}

const inputList = (value, name, limit) => {
  if (!Array.isArray(value) || value.length > limit) {
    const error = new Error(`Invalid ${name}.`)
    error.code = 'invalid-account-state'
    throw error
  }
  return value
}

const shortText = (value, max, required = false) => {
  const result = String(value || '').trim().slice(0, max)
  if (required && !result) {
    const error = new Error('Required account data is missing.')
    error.code = 'invalid-account-state'
    throw error
  }
  return result
}

const unique = (values, keyFor) => [
  ...new Map(values.map((value) => [keyFor(value), value])).values(),
]

const cartKey = (item) =>
  item?.variantId
    ? `${String(item.productId)}::${String(item.variantId)}`
    : String(item?.productId)

const withSingleDefault = (values) => {
  const defaultIndex = values.findIndex((value) => value.isDefault)
  return values.map((value, index) => ({
    ...value,
    isDefault: defaultIndex >= 0 && index === defaultIndex,
  }))
}

const sanitizeAddress = (address) => {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    const error = new Error('Invalid address.')
    error.code = 'invalid-account-state'
    throw error
  }
  const phone = String(address.phone || '').replace(/\D/g, '').slice(-10)
  const pincode = shortText(address.pincode, 6, true)
  if (!/^[6-9]\d{9}$/.test(phone) || !/^[1-8]\d{5}$/.test(pincode)) {
    const error = new Error('Invalid address contact details.')
    error.code = 'invalid-account-state'
    throw error
  }
  const type = ['Shipping', 'Billing'].includes(address.type)
    ? address.type
    : 'Shipping'
  return {
    id: shortText(address.id, 100, true),
    type,
    label: shortText(address.label || 'Home', 30, true),
    fullName: shortText(address.fullName, 100, true),
    phone,
    houseFlat: shortText(address.houseFlat, 150),
    street: shortText(address.street, 200),
    area: shortText(address.area, 150),
    line1: shortText(address.line1, 500, true),
    city: shortText(address.city, 100, true),
    state: shortText(address.state, 100, true),
    pincode,
    isDefault: address.isDefault === true,
  }
}

const sanitizePaymentMethod = (payment) => {
  if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
    const error = new Error('Invalid payment method.')
    error.code = 'invalid-account-state'
    throw error
  }
  const type = ['UPI', 'Debit Card', 'Credit Card'].includes(payment.type)
    ? payment.type
    : 'UPI'
  const last4 = String(payment.last4 || '').replace(/\D/g, '').slice(-4)
  const upiId = shortText(payment.upiId, 100)
  if ((type === 'UPI' && !upiId) || (type !== 'UPI' && last4.length !== 4)) {
    const error = new Error('Invalid payment method details.')
    error.code = 'invalid-account-state'
    throw error
  }
  return {
    id: shortText(payment.id, 100, true),
    type,
    holder: shortText(payment.holder, 100),
    last4: type === 'UPI' ? '' : last4,
    expiry: type === 'UPI' ? '' : shortText(payment.expiry, 7),
    upiId: type === 'UPI' ? upiId : '',
    isDefault: payment.isDefault === true,
  }
}

const sanitizeCartItem = (item) => {
  const productId = shortText(item?.productId, 100, true)
  const variantId = shortText(item?.variantId, 100)
  const quantity = Number(item?.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    const error = new Error('Invalid cart quantity.')
    error.code = 'invalid-account-state'
    throw error
  }
  return { productId, ...(variantId ? { variantId } : {}), quantity }
}

const sanitizeSavedItem = (item) => {
  const productId = shortText(item?.productId ?? item, 100, true)
  const variantId = shortText(item?.variantId, 100)
  return { productId, ...(variantId ? { variantId } : {}) }
}

function sanitizeAccountState(value = {}) {
  const wishlistIds = unique(
    inputList(value.wishlistIds || [], 'wishlist', limits.wishlist).map((id) =>
      shortText(id, 100, true),
    ),
    String,
  )
  const addresses = withSingleDefault(unique(
    inputList(value.addresses || [], 'addresses', limits.addresses).map(sanitizeAddress),
    (address) => address.id,
  ))
  const paymentMethods = withSingleDefault(unique(
    inputList(
      value.paymentMethods || [],
      'payment methods',
      limits.paymentMethods,
    ).map(sanitizePaymentMethod),
    (payment) => payment.id,
  ))
  const cartItems = unique(
    inputList(value.cartItems || [], 'cart', limits.cart).map(sanitizeCartItem),
    cartKey,
  )
  const cartIds = new Set(cartItems.map(cartKey))
  const savedCartItems = unique(
    inputList(
      value.savedCartItems || [],
      'saved cart',
      limits.savedCart,
    ).map(sanitizeSavedItem),
    cartKey,
  ).filter((item) => !cartIds.has(cartKey(item)))

  return { wishlistIds, addresses, paymentMethods, cartItems, savedCartItems }
}

function removePurchasedCartItems(cartItems, purchasedItems, checkoutMode = 'cart') {
  if (checkoutMode === 'buy-now') {
    return Array.isArray(cartItems) ? cartItems : []
  }
  const purchasedProductIds = new Set(
    (Array.isArray(purchasedItems) ? purchasedItems : []).map(cartKey),
  )
  return (Array.isArray(cartItems) ? cartItems : []).filter(
    (item) => !purchasedProductIds.has(cartKey(item)),
  )
}

module.exports = { limits, removePurchasedCartItems, sanitizeAccountState }

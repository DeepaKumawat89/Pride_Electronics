export const MINIMUM_ORDER_QUANTITY_OPTIONS = Object.freeze([
  1,
  2,
  5,
  10,
  20,
  50,
  100,
])

export const getProductMinimumOrderQuantity = (product = {}) => {
  const value = Number(product.minimumOrderQuantity ?? 1)
  return MINIMUM_ORDER_QUANTITY_OPTIONS.includes(value) ? value : 1
}

export const clampProductQuantity = (product, quantity, maximum = 100) => {
  const minimum = getProductMinimumOrderQuantity(product)
  const requested = Math.floor(Number(quantity) || minimum)
  const limit = Math.max(minimum, Math.floor(Number(maximum) || 0))
  return Math.min(Math.max(minimum, requested), limit)
}

export const productMeetsMinimumOrderQuantity = (product, quantity) =>
  Number.isInteger(Number(quantity)) &&
  Number(quantity) >= getProductMinimumOrderQuantity(product)

export const getMinimumOrderQuantityMessage = (product = {}) => {
  const minimum = getProductMinimumOrderQuantity(product)
  return `${String(product.name || 'This product')} requires a minimum quantity of ${minimum}.`
}

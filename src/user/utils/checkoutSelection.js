import { productForVariant, variantCartKey } from '../../utils/productVariants.js'
import { getApplicablePricingTier } from '../../utils/productPricing.js'
import { parsePrice } from './currency.js'

const validId = (value) => /^[a-zA-Z0-9_-]{1,100}$/.test(String(value || ''))

export function normalizeCheckoutSelection(value) {
  if (value?.mode !== 'buy-now' || !Array.isArray(value.items)) return null

  const items = value.items
    .slice(0, 50)
    .map((item) => ({
      productId: String(item?.productId || '').trim(),
      variantId: String(item?.variantId || '').trim(),
      quantity: Math.floor(Number(item?.quantity)),
    }))
    .filter(
      (item) =>
        validId(item.productId) &&
        (!item.variantId || validId(item.variantId)) &&
        item.quantity >= 1 &&
        item.quantity <= 100,
    )

  if (!items.length) return null
  const uniqueItems = [
    ...new Map(
      items.map((item) => [
        variantCartKey(item.productId, item.variantId),
        item,
      ]),
    ).values(),
  ]
  return { mode: 'buy-now', items: uniqueItems }
}

export function createBuyNowSelection(product, quantity = 1) {
  return normalizeCheckoutSelection({
    mode: 'buy-now',
    items: [
      {
        productId: product?.id,
        variantId: product?.selectedVariantId || '',
        quantity,
      },
    ],
  })
}

export function resolveCheckoutSelection(selection, products = []) {
  const normalized = normalizeCheckoutSelection(selection)
  if (!normalized || !Array.isArray(products)) return []

  return normalized.items.flatMap((item) => {
    const baseProduct = products.find(
      (product) => String(product.id) === item.productId,
    )
    if (!baseProduct) return []
    const product = item.variantId
      ? productForVariant(baseProduct, item.variantId)
      : baseProduct
    if (!product) return []
    return [
      {
        key: variantCartKey(item.productId, item.variantId),
        product,
        quantity: item.quantity,
      },
    ]
  })
}

export const checkoutItemRequest = ({ product, quantity }) => {
  const qty = Math.floor(Number(quantity))
  const tierInfo = getApplicablePricingTier(product, qty)
  return {
    productId: String(product.id),
    ...(product.selectedVariantId
      ? { variantId: String(product.selectedVariantId) }
      : {}),
    quantity: qty,
    qty,
    price: tierInfo.unitPrice,
    unitPrice: tierInfo.unitPrice,
    basePrice: parsePrice(product.price),
    productName: String(product.name || ''),
    image: String(product.image || ''),
    variant: String(product.selectedVariantName || product.variant || ''),
    ...(tierInfo.isBulkTier ? { appliedTier: tierInfo.appliedTier, tierLabel: tierInfo.tierLabel } : {}),
  }
}

export function removePurchasedItems(
  items = [],
  purchasedItems = [],
  checkoutMode = 'cart',
) {
  if (checkoutMode === 'buy-now') return items
  const purchasedKeys = new Set(
    purchasedItems.map((item) =>
      variantCartKey(item.productId, item.variantId),
    ),
  )
  return items.filter(
    (item) => !purchasedKeys.has(variantCartKey(item.productId, item.variantId)),
  )
}

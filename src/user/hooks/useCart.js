import { useCallback, useMemo, useState } from 'react'
import { parsePrice } from '../utils/currency'
import {
  productForVariant,
  productHasVariants,
  variantCartKey,
} from '../../utils/productVariants'

const resolveLiveProduct = (storedProduct, liveProducts) => {
  if (!Array.isArray(liveProducts)) return storedProduct
  const liveProduct = liveProducts.find((product) => product.id === storedProduct.id)
  if (!liveProduct) return null
  if (storedProduct.selectedVariantId) {
    return productForVariant(liveProduct, storedProduct.selectedVariantId)
  }
  return productHasVariants(liveProduct) ? null : liveProduct
}

const productKey = (product) =>
  variantCartKey(product.id, product.selectedVariantId)

export function useCart(initialProduct, liveProducts = null) {
  const [storedItems, setStoredItems] = useState(
    initialProduct ? [{ product: initialProduct, quantity: 1 }] : [],
  )
  const [storedSavedItems, setStoredSavedItems] = useState([])

  const items = useMemo(
    () => storedItems.flatMap((item) => {
      const liveProduct = resolveLiveProduct(item.product, liveProducts)
      if (!liveProduct) return []
      const stock = Math.max(0, Number(liveProduct.stock) || 0)
      const quantity = stock > 0
        ? Math.min(Math.max(1, item.quantity), stock)
        : item.quantity
      return [{
        key: productKey(liveProduct),
        product: liveProduct,
        quantity,
        priceChanged:
          parsePrice(item.product.price) !== parsePrice(liveProduct.price),
        quantityAdjusted: quantity !== item.quantity,
      }]
    }),
    [liveProducts, storedItems],
  )

  const savedItems = useMemo(
    () => storedSavedItems.flatMap(({ product }) => {
      const liveProduct = resolveLiveProduct(product, liveProducts)
      return liveProduct
        ? [{ key: productKey(liveProduct), product: liveProduct }]
        : []
    }),
    [liveProducts, storedSavedItems],
  )

  const removedProductCount = useMemo(
    () => Array.isArray(liveProducts)
      ? storedItems.filter((item) => !resolveLiveProduct(item.product, liveProducts)).length
      : 0,
    [liveProducts, storedItems],
  )

  const add = (product, quantity = 1) => {
    const liveBase = liveProducts?.find((item) => item.id === product.id)
    if (
      (liveBase && productHasVariants(liveBase) && !product.selectedVariantId) ||
      (productHasVariants(product) && !product.selectedVariantId)
    ) return false
    const liveProduct = resolveLiveProduct(product, liveProducts)
    if (!liveProduct) return false
    const stock = Math.max(0, Number(liveProduct.stock) || 0)
    if (!stock) return false
    const key = productKey(liveProduct)

    setStoredItems((current) => {
      const exists = current.find((item) => productKey(item.product) === key)
      return exists
        ? current.map((item) => productKey(item.product) === key
          ? { product: liveProduct, quantity: Math.min(item.quantity + quantity, stock) }
          : item)
        : [...current, {
            product: liveProduct,
            quantity: Math.min(Math.max(1, quantity), stock),
          }]
    })
    setStoredSavedItems((current) =>
      current.filter((item) => productKey(item.product) !== key),
    )
    return true
  }

  const changeQuantity = (itemKey, amount) => {
    setStoredItems((current) => current
      .map((item) => {
        if (productKey(item.product) !== itemKey) return item
        const liveProduct = resolveLiveProduct(item.product, liveProducts) || item.product
        const stock = Math.max(0, Number(liveProduct.stock) || 0)
        const currentQuantity = stock > 0 ? Math.min(item.quantity, stock) : item.quantity
        const nextQuantity = currentQuantity + amount
        return {
          product: liveProduct,
          quantity: stock > 0 ? Math.min(nextQuantity, stock) : nextQuantity,
        }
      })
      .filter((item) => item.quantity > 0))
  }

  const remove = (itemKey) =>
    setStoredItems((current) => current.filter((item) => productKey(item.product) !== itemKey))

  const saveForLater = (itemKey) => {
    const item = items.find((entry) => entry.key === itemKey)
    if (!item) return
    setStoredItems((current) => current.filter((entry) => productKey(entry.product) !== itemKey))
    setStoredSavedItems((current) =>
      current.some((entry) => productKey(entry.product) === itemKey)
        ? current
        : [...current, { product: item.product }],
    )
  }

  const moveToCart = (itemKey) => {
    const item = savedItems.find((entry) => entry.key === itemKey)
    if (!item || Number(item.product.stock) <= 0) return false
    add(item.product, 1)
    return true
  }

  const removeSaved = (itemKey) =>
    setStoredSavedItems((current) => current.filter((item) => productKey(item.product) !== itemKey))

  const removeUnavailable = () =>
    setStoredItems((current) => current.filter((item) =>
      !Array.isArray(liveProducts) || Boolean(resolveLiveProduct(item.product, liveProducts)),
    ))

  const clear = () => setStoredItems([])

  const hydrate = useCallback((account = {}) => {
    const productFor = (productId, variantId = '') => {
      const liveProduct = liveProducts?.find(
        (product) => String(product.id) === String(productId),
      )
      if (!liveProduct) return { id: productId, selectedVariantId: variantId || '' }
      return variantId ? productForVariant(liveProduct, variantId) || {
        id: productId,
        selectedVariantId: variantId,
      } : liveProduct
    }
    setStoredItems((account.cartItems || []).map((item) => ({
      product: productFor(item.productId, item.variantId),
      quantity: Math.max(1, Number(item.quantity) || 1),
    })))
    setStoredSavedItems((account.savedCartItems || []).map((item) => ({
      product: productFor(item.productId || item, item.variantId),
    })))
  }, [liveProducts])

  const persistence = useMemo(
    () => ({
      cartItems: storedItems.map((item) => ({
        productId: item.product.id,
        ...(item.product.selectedVariantId ? { variantId: item.product.selectedVariantId } : {}),
        quantity: item.quantity,
      })),
      savedCartItems: storedSavedItems.map((item) => ({
        productId: item.product.id,
        ...(item.product.selectedVariantId ? { variantId: item.product.selectedVariantId } : {}),
      })),
    }),
    [storedItems, storedSavedItems],
  )

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )
  const subtotal = useMemo(
    () => items.reduce(
      (sum, item) => sum + parsePrice(item.product.price) * item.quantity,
      0,
    ),
    [items],
  )
  const issues = useMemo(
    () => ({
      removedProductCount,
      hasOutOfStock: items.some(({ product }) => Number(product.stock) <= 0),
      hasPriceChanges: items.some((item) => item.priceChanged),
      hasQuantityAdjustments: items.some((item) => item.quantityAdjusted),
    }),
    [items, removedProductCount],
  )

  return {
    items,
    savedItems,
    count,
    subtotal,
    issues,
    add,
    changeQuantity,
    remove,
    saveForLater,
    moveToCart,
    removeSaved,
    removeUnavailable,
    clear,
    hydrate,
    persistence,
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hasValidPrice } from '../utils/currency'
import {
  productForVariant,
  productHasVariants,
  variantCartKey,
} from '../../utils/productVariants'
import { calculateProductUnitPrice } from '../../utils/productPricing'
import {
  clampProductQuantity,
  getProductMinimumOrderQuantity,
} from '../../utils/productMoq'

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
  const liveProductsRef = useRef(liveProducts)
  useEffect(() => {
    liveProductsRef.current = liveProducts
  }, [liveProducts])
  const [storedItems, setStoredItems] = useState(
    initialProduct
      ? [{
          product: initialProduct,
          quantity: getProductMinimumOrderQuantity(initialProduct),
        }]
      : [],
  )
  const [storedSavedItems, setStoredSavedItems] = useState([])

  const items = useMemo(
    () => storedItems.flatMap((item) => {
      const liveProduct = resolveLiveProduct(item.product, liveProducts)
      if (!liveProduct) return []
      const stock = Math.max(0, Number(liveProduct.stock) || 0)
      const purchaseLimit = Math.min(stock, 100)
      const minimumOrderQuantity = getProductMinimumOrderQuantity(liveProduct)
      const quantity = stock > 0
        ? clampProductQuantity(liveProduct, item.quantity, purchaseLimit)
        : Math.max(minimumOrderQuantity, item.quantity)
      return [{
        key: productKey(liveProduct),
        product: liveProduct,
        quantity,
        priceChanged:
          calculateProductUnitPrice(item.product, quantity) !==
          calculateProductUnitPrice(liveProduct, quantity),
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
    if (!stock || !hasValidPrice(liveProduct.price)) return false
    const purchaseLimit = Math.min(stock, 100)
    const minimumOrderQuantity = getProductMinimumOrderQuantity(liveProduct)
    if (purchaseLimit < minimumOrderQuantity) return false
    const key = productKey(liveProduct)

    setStoredItems((current) => {
      const exists = current.find((item) => productKey(item.product) === key)
      return exists
        ? current.map((item) => productKey(item.product) === key
          ? {
              product: liveProduct,
              quantity: clampProductQuantity(
                liveProduct,
                item.quantity + quantity,
                purchaseLimit,
              ),
            }
          : item)
        : [...current, {
            product: liveProduct,
            quantity: clampProductQuantity(liveProduct, quantity, purchaseLimit),
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
        const purchaseLimit = Math.min(stock, 100)
        const minimumOrderQuantity = getProductMinimumOrderQuantity(liveProduct)
        const currentQuantity = stock > 0
          ? clampProductQuantity(liveProduct, item.quantity, purchaseLimit)
          : Math.max(minimumOrderQuantity, item.quantity)
        const nextQuantity = currentQuantity + amount
        return {
          product: liveProduct,
          quantity: stock > 0
            ? clampProductQuantity(liveProduct, nextQuantity, purchaseLimit)
            : Math.max(minimumOrderQuantity, nextQuantity),
        }
      })
      .filter((item) => item.quantity > 0))
  }

  const remove = (itemKey) =>
    setStoredItems((current) => current.filter((item) => productKey(item.product) !== itemKey))

  const removeMany = (itemKeys) => {
    const keys = new Set(itemKeys)
    setStoredItems((current) =>
      current.filter((item) => !keys.has(productKey(item.product))),
    )
  }

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
    return add(item.product, 1)
  }

  const removeSaved = (itemKey) =>
    setStoredSavedItems((current) => current.filter((item) => productKey(item.product) !== itemKey))

  const removeUnavailable = () =>
    setStoredItems((current) => current.filter((item) =>
      !Array.isArray(liveProducts) || Boolean(resolveLiveProduct(item.product, liveProducts)),
    ))

  const clear = () => setStoredItems([])

  const hydrate = useCallback((account = {}) => {
    const currentProducts = liveProductsRef.current
    const productFor = (productId, variantId = '') => {
      const liveProduct = currentProducts?.find(
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
      quantity: Math.max(
        getProductMinimumOrderQuantity(productFor(item.productId, item.variantId)),
        Number(item.quantity) || 1,
      ),
    })))
    setStoredSavedItems((account.savedCartItems || []).map((item) => ({
      product: productFor(item.productId || item, item.variantId),
    })))
  }, [])

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

  const count = items.length
  const subtotal = useMemo(
    () => items.reduce(
      (sum, item) => sum + calculateProductUnitPrice(item.product, item.quantity) * item.quantity,
      0,
    ),
    [items],
  )
  const issues = useMemo(
    () => ({
      removedProductCount,
      hasOutOfStock: items.some(({ product }) => Number(product.stock) <= 0),
      hasInvalidPrice: items.some(({ product }) => !hasValidPrice(product.price)),
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
    removeMany,
    saveForLater,
    moveToCart,
    removeSaved,
    removeUnavailable,
    clear,
    hydrate,
    persistence,
  }
}

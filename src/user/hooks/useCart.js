import { useMemo, useState } from 'react'
import { parsePrice } from '../utils/currency'

const resolveLiveProduct = (storedProduct, liveProducts) => {
  if (!Array.isArray(liveProducts)) return storedProduct
  return liveProducts.find((product) => product.id === storedProduct.id) || null
}

export function useCart(initialProduct, liveProducts = null) {
  const [storedItems, setStoredItems] = useState(
    initialProduct ? [{ product: initialProduct, quantity: 1 }] : [],
  )
  const [storedSavedItems, setStoredSavedItems] = useState([])

  const items = useMemo(
    () =>
      storedItems.flatMap((item) => {
        const liveProduct = resolveLiveProduct(item.product, liveProducts)
        if (!liveProduct) return []
        const stock = Math.max(0, Number(liveProduct.stock) || 0)
        const quantity =
          stock > 0 ? Math.min(Math.max(1, item.quantity), stock) : item.quantity
        return [
          {
            product: liveProduct,
            quantity,
            priceChanged:
              parsePrice(item.product.price) !== parsePrice(liveProduct.price),
            quantityAdjusted: quantity !== item.quantity,
          },
        ]
      }),
    [liveProducts, storedItems],
  )

  const savedItems = useMemo(
    () =>
      storedSavedItems.flatMap(({ product }) => {
        const liveProduct = resolveLiveProduct(product, liveProducts)
        return liveProduct ? [{ product: liveProduct }] : []
      }),
    [liveProducts, storedSavedItems],
  )

  const removedProductCount = useMemo(
    () =>
      Array.isArray(liveProducts)
        ? storedItems.filter(
            (item) =>
              !liveProducts.some((product) => product.id === item.product.id),
          ).length
        : 0,
    [liveProducts, storedItems],
  )

  const add = (product, quantity = 1) => {
    const liveProduct = resolveLiveProduct(product, liveProducts)
    if (!liveProduct) return false
    const stock = Math.max(0, Number(liveProduct.stock) || 0)
    if (!stock) return false

    setStoredItems((current) => {
      const exists = current.find((item) => item.product.id === liveProduct.id)
      return exists
        ? current.map((item) =>
            item.product.id === liveProduct.id
              ? {
                  product: liveProduct,
                  quantity: Math.min(item.quantity + quantity, stock),
                }
              : item,
          )
        : [
            ...current,
            {
              product: liveProduct,
              quantity: Math.min(Math.max(1, quantity), stock),
            },
          ]
    })
    setStoredSavedItems((current) =>
      current.filter((item) => item.product.id !== liveProduct.id),
    )
    return true
  }

  const changeQuantity = (productId, amount) => {
    const liveProduct = liveProducts?.find(
      (product) => product.id === productId,
    )
    setStoredItems((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) return item
          const stock = Math.max(
            0,
            Number(liveProduct?.stock ?? item.product.stock) || 0,
          )
          const currentQuantity =
            stock > 0 ? Math.min(item.quantity, stock) : item.quantity
          const nextQuantity = currentQuantity + amount
          return {
            product: liveProduct || item.product,
            quantity: stock > 0 ? Math.min(nextQuantity, stock) : nextQuantity,
          }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  const remove = (productId) =>
    setStoredItems((current) =>
      current.filter((item) => item.product.id !== productId),
    )

  const saveForLater = (productId) => {
    const item = items.find(({ product }) => product.id === productId)
    if (!item) return
    setStoredItems((current) =>
      current.filter(({ product }) => product.id !== productId),
    )
    setStoredSavedItems((current) =>
      current.some(({ product }) => product.id === productId)
        ? current
        : [...current, { product: item.product }],
    )
  }

  const moveToCart = (productId) => {
    const item = savedItems.find(({ product }) => product.id === productId)
    if (!item || Number(item.product.stock) <= 0) return false
    add(item.product, 1)
    return true
  }

  const removeSaved = (productId) =>
    setStoredSavedItems((current) =>
      current.filter((item) => item.product.id !== productId),
    )

  const removeUnavailable = () =>
    setStoredItems((current) =>
      current.filter((item) =>
        !Array.isArray(liveProducts) ||
          liveProducts.some((product) => product.id === item.product.id),
      ),
    )

  const clear = () => setStoredItems([])

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  )
  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + parsePrice(item.product.price) * item.quantity,
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
  }
}

import { useMemo, useState } from 'react'
import { parsePrice } from '../utils/currency'

export function useCart(initialProduct) {
  const [items, setItems] = useState(initialProduct ? [{ product: initialProduct, quantity: 1 }] : [])

  const add = (product) => {
    setItems((current) => {
      const exists = current.find((item) => item.product.id === product.id)
      return exists
        ? current.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { product, quantity: 1 }]
    })
  }

  const changeQuantity = (productId, amount) => {
    setItems((current) => current
      .map((item) => item.product.id === productId ? { ...item, quantity: item.quantity + amount } : item)
      .filter((item) => item.quantity > 0))
  }

  const remove = (productId) => setItems((current) => current.filter((item) => item.product.id !== productId))
  const clear = () => setItems([])

  const count = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + parsePrice(item.product.price) * item.quantity, 0), [items])

  return { items, count, subtotal, add, changeQuantity, remove, clear }
}

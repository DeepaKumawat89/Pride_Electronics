const RESERVING_STATUSES = new Set(['Pending', 'Confirmed', 'Processing'])
const FULFILLED_STATUSES = new Set([
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Returned',
  'Refunded',
])

const itemQuantity = (item) => Math.max(0, Number(item.qty || item.quantity) || 0)

const findProduct = (products, item) =>
  products.find(
    (product) =>
      (item.productId != null && String(product.id) === String(item.productId)) ||
      (item.sku && product.sku === item.sku) ||
      product.name === item.productName,
  )

const historyEntry = ({
  product,
  action,
  quantity,
  stockBefore,
  stockAfter,
  reservedBefore,
  reservedAfter,
  reference,
  note,
  timestamp,
}) => ({
  id: `${timestamp}-${product.id}-${action}-${reference || 'manual'}`,
  productId: product.id,
  productName: product.name,
  sku: product.sku || `PE-${String(product.id).padStart(4, '0')}`,
  action,
  quantity,
  stockBefore,
  stockAfter,
  reservedBefore,
  reservedAfter,
  availableBefore: Math.max(0, stockBefore - reservedBefore),
  availableAfter: Math.max(0, stockAfter - reservedAfter),
  reference: reference || 'Manual adjustment',
  note: note || '',
  timestamp,
})

export const getAvailableStock = (product) =>
  Math.max(0, Number(product.stock) - Number(product.reservedStock || 0))

export function initializeInventory(products, orders) {
  const inventoryProducts = products.map((product) => ({
    ...product,
    reservedStock: 0,
  }))
  const inventoryOrders = orders.map((order) => ({
    ...order,
    inventoryState: RESERVING_STATUSES.has(order.status)
      ? 'reserved'
      : FULFILLED_STATUSES.has(order.status)
        ? 'fulfilled'
        : order.status === 'Cancelled'
          ? 'cancelled'
          : 'none',
  }))
  const history = []

  inventoryOrders.forEach((order) => {
    if (order.inventoryState !== 'reserved') return
    ;(order.items || []).forEach((item) => {
      const product = findProduct(inventoryProducts, item)
      if (!product) return
      const quantity = Math.min(itemQuantity(item), getAvailableStock(product))
      if (!quantity) return
      const reservedBefore = product.reservedStock
      product.reservedStock += quantity
      history.push(
        historyEntry({
          product,
          action: 'Order reserved',
          quantity,
          stockBefore: Number(product.stock),
          stockAfter: Number(product.stock),
          reservedBefore,
          reservedAfter: product.reservedStock,
          reference: order.id,
          note: 'Initial open-order reservation',
          timestamp: `${order.date || '2026-01-01'}T12:00:00.000Z`,
        }),
      )
    })
  })

  return { products: inventoryProducts, orders: inventoryOrders, history }
}

export function reserveOrderStock(products, order, timestamp = new Date().toISOString()) {
  const nextProducts = products.map((product) => ({ ...product }))
  const history = []
  ;(order.items || []).forEach((item) => {
    const product = findProduct(nextProducts, item)
    if (!product) return
    const quantity = itemQuantity(item)
    if (!quantity || quantity > getAvailableStock(product)) return
    const reservedBefore = Number(product.reservedStock || 0)
    product.reservedStock = reservedBefore + quantity
    history.push(
      historyEntry({
        product,
        action: 'Order reserved',
        quantity,
        stockBefore: Number(product.stock),
        stockAfter: Number(product.stock),
        reservedBefore,
        reservedAfter: product.reservedStock,
        reference: order.id,
        note: 'Stock reserved after order placement',
        timestamp,
      }),
    )
  })
  return { products: nextProducts, history }
}

export function transitionOrderInventory(
  products,
  order,
  nextStatus,
  returnDisposition,
  timestamp = new Date().toISOString(),
) {
  const nextProducts = products.map((product) => ({ ...product }))
  const history = []
  const previousState = order.inventoryState || 'none'
  let inventoryState = previousState

  ;(order.items || []).forEach((item) => {
    const product = findProduct(nextProducts, item)
    if (!product) return
    const quantity = itemQuantity(item)
    if (!quantity) return
    const stockBefore = Number(product.stock)
    const reservedBefore = Number(product.reservedStock || 0)
    let action = ''
    let note = ''

    if (nextStatus === 'Cancelled' && previousState === 'reserved') {
      product.reservedStock = Math.max(0, reservedBefore - quantity)
      action = 'Reservation released'
      note = 'Order cancelled before fulfillment'
    } else if (nextStatus === 'Cancelled' && previousState === 'fulfilled') {
      product.stock = stockBefore + quantity
      action = 'Stock restored'
      note = 'Order cancelled after stock deduction'
    } else if (
      FULFILLED_STATUSES.has(nextStatus) &&
      nextStatus !== 'Returned' &&
      nextStatus !== 'Refunded' &&
      previousState === 'reserved'
    ) {
      product.reservedStock = Math.max(0, reservedBefore - quantity)
      product.stock = Math.max(0, stockBefore - quantity)
      action = 'Order fulfilled'
      note = `Stock deducted when order moved to ${nextStatus}`
    } else if (nextStatus === 'Returned' && previousState === 'reserved') {
      product.reservedStock = Math.max(0, reservedBefore - quantity)
      action = 'Reservation released'
      note = 'Return accepted before stock fulfillment'
    } else if (nextStatus === 'Returned' && previousState === 'fulfilled') {
      if (returnDisposition === 'restock') {
        product.stock = stockBefore + quantity
        action = 'Return restocked'
        note = 'Returned product accepted back into sellable stock'
      } else {
        action = 'Return damaged'
        note = "Returned product marked damaged and wasn't restocked"
      }
    }

    if (!action) return
    history.push(
      historyEntry({
        product,
        action,
        quantity,
        stockBefore,
        stockAfter: Number(product.stock),
        reservedBefore,
        reservedAfter: Number(product.reservedStock || 0),
        reference: order.id,
        note,
        timestamp,
      }),
    )
  })

  if (nextStatus === 'Cancelled' && ['reserved', 'fulfilled'].includes(previousState)) {
    inventoryState = 'cancelled'
  } else if (
    FULFILLED_STATUSES.has(nextStatus) &&
    !['Returned', 'Refunded'].includes(nextStatus) &&
    previousState === 'reserved'
  ) {
    inventoryState = 'fulfilled'
  } else if (
    nextStatus === 'Returned' &&
    ['reserved', 'fulfilled'].includes(previousState)
  ) {
    inventoryState =
      returnDisposition === 'restock'
        ? 'returned_restocked'
        : 'returned_damaged'
  }

  return { products: nextProducts, inventoryState, history }
}

export function adjustProductStock(
  products,
  productId,
  adjustment,
  timestamp = new Date().toISOString(),
) {
  const nextProducts = products.map((product) => ({ ...product }))
  const product = nextProducts.find((item) => item.id === productId)
  if (!product) return { products, history: [], error: 'Product not found.' }

  const stockBefore = Number(product.stock)
  const reservedBefore = Number(product.reservedStock || 0)
  const quantity = Math.max(0, Number(adjustment.quantity) || 0)
  let stockAfter = stockBefore
  let action = ''

  if (adjustment.type === 'add') {
    if (!quantity) return { products, history: [], error: 'Enter stock to add.' }
    stockAfter += quantity
    action = 'Stock added'
  } else if (adjustment.type === 'remove') {
    if (!quantity) return { products, history: [], error: 'Enter stock to remove.' }
    if (quantity > getAvailableStock(product)) {
      return {
        products,
        history: [],
        error: 'Cannot remove stock that is reserved for open orders.',
      }
    }
    stockAfter -= quantity
    action = 'Stock removed'
  } else if (adjustment.type === 'adjust') {
    if (quantity < reservedBefore) {
      return {
        products,
        history: [],
        error: `Current stock cannot be lower than ${reservedBefore} reserved units.`,
      }
    }
    stockAfter = quantity
    action = 'Stock adjusted'
  }

  product.stock = stockAfter
  return {
    products: nextProducts,
    history: [
      historyEntry({
        product,
        action,
        quantity: Math.abs(stockAfter - stockBefore),
        stockBefore,
        stockAfter,
        reservedBefore,
        reservedAfter: reservedBefore,
        reference: 'Manual adjustment',
        note: adjustment.note,
        timestamp,
      }),
    ],
    error: '',
  }
}

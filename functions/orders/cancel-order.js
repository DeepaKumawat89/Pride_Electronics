const {
  db,
  HttpsError,
  onCall,
  callableOptions,
  requireActiveCustomer,
  cleanObject,
  assertOwnedOrder,
  normalizeOrderItems,
  inventoryForItem,
  syncVariantReservedStock,
  inventoryUpdateFor,
  indiaOrderMoment,
} = require('../shared/core')

async function cancelOrderHandler(request) {
  const uid = await requireActiveCustomer(request)
  const orderId = String(request.data?.orderId || '').trim()
  const orderReference = db.doc(`orders/${orderId}`)
  const now = new Date().toISOString()
  const savedOrder = await db.runTransaction(async (transaction) => {
    const orderDocument = await transaction.get(orderReference)
    const order = assertOwnedOrder(orderDocument, uid)
    if (!['Pending', 'Confirmed', 'Processing'].includes(order.status)) {
      throw new HttpsError('failed-precondition', 'This order can no longer be cancelled.')
    }
    const items = normalizeOrderItems(order.items)
    const productReferences = items.map((item) => db.doc(`products/${item.productId}`))
    const productDocuments = []
    for (const productReference of productReferences) {
      productDocuments.push(await transaction.get(productReference))
    }
    const inventoryUpdates = new Map()
    items.forEach((item, index) => {
      const productDocument = productDocuments[index]
      if (productDocument.exists && order.inventoryState === 'reserved') {
        const product = inventoryUpdates.get(productDocument.id) || cleanObject(productDocument.data())
        const inventory = inventoryForItem(product, item)
        if (!inventory) return
        const reservedBefore = Number(inventory.reservedStock || 0)
        const reservedAfter = Math.max(0, reservedBefore - item.qty)
        inventory.reservedStock = reservedAfter
        syncVariantReservedStock(product)
        inventoryUpdates.set(productDocument.id, product)
        const historyReference = db.collection('inventoryHistory').doc()
        transaction.create(historyReference, {
          productId: productDocument.id,
          variantId: item.variantId || '',
          variantName: item.variant || '',
          productName: product.name || item.productName || '',
          sku: item.sku || product.sku || '',
          action: 'Reservation released',
          quantity: item.qty,
          stockBefore: Number(inventory.stock || 0),
          stockAfter: Number(inventory.stock || 0),
          reservedBefore,
          reservedAfter,
          availableBefore: Math.max(0, Number(inventory.stock || 0) - reservedBefore),
          availableAfter: Math.max(0, Number(inventory.stock || 0) - reservedAfter),
          reference: orderId,
          note: 'Reservation released after customer cancellation',
          timestamp: now,
          createdAt: now,
          updatedAt: now,
        })
      }
    })
    inventoryUpdates.forEach((product, productId) => {
      transaction.update(
        db.doc(`products/${productId}`),
        inventoryUpdateFor(product, now),
      )
    })
    const paymentStatus = /cash|cod/i.test(order.paymentMethod || '')
      ? 'Cancelled'
      : 'Refund Pending'
    const cancelledMoment = indiaOrderMoment(now)
    const next = {
      ...order,
      status: 'Cancelled',
      paymentStatus,
      inventoryState: 'released',
      updatedAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        { status: 'Cancelled', ...cancelledMoment },
      ],
    }
    transaction.update(orderReference, cleanObject(next))
    return { ...next, id: orderId }
  })
  return { order: savedOrder }
}

const cancelOrder = onCall(callableOptions, cancelOrderHandler)


module.exports = { cancelOrder, cancelOrderHandler }


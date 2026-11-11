const {
  Timestamp,
  db,
  STOCK_RESERVATION_CLEANUP_LIMIT,
  STOCK_RESERVATION_CLEANUP_BATCHES,
  cleanObject,
  normalizeOrderItems,
  variantForItem,
  inventoryForItem,
  syncVariantReservedStock,
  inventoryUpdateFor,
} = require('../shared/core')

async function releaseStockReservation({
  reservationId,
  reason = 'Checkout ended before payment confirmation',
  expired = false,
}) {
  const reservationReference = db.doc(`stockReservations/${reservationId}`)
  const now = new Date().toISOString()

  return db.runTransaction(async (transaction) => {
    const reservationDocument = await transaction.get(reservationReference)
    if (!reservationDocument.exists) return { released: false, state: 'missing' }
    const reservation = reservationDocument.data()
    if (reservation.status !== 'active') {
      return { released: false, state: reservation.status }
    }

    let paymentIntentDocument = null
    if (reservation.paymentIntentId) {
      paymentIntentDocument = await transaction.get(
        db.doc(`paymentIntents/${reservation.paymentIntentId}`),
      )
    }
    const orderReference = db.doc(
      `orders/${String(reservation.orderId || reservationReference.id)}`,
    )
    const orderDocument = await transaction.get(orderReference)
    const intent = paymentIntentDocument?.data()
    if (intent?.consumed === true || orderDocument.exists) {
      transaction.update(reservationReference, {
        status: 'consumed',
        orderId: String(intent?.consumedByOrderId || orderDocument.id),
        updatedAt: Timestamp.now(),
      })
      if (paymentIntentDocument?.exists) {
        transaction.update(paymentIntentDocument.ref, {
          reservationStatus: 'consumed',
          updatedAt: now,
        })
      }
      return { released: false, state: 'consumed' }
    }
    if (intent?.verified === true) {
      transaction.update(reservationReference, {
        status: 'payment-verified',
        updatedAt: Timestamp.now(),
      })
      transaction.update(paymentIntentDocument.ref, {
        reservationStatus: 'payment-verified',
        updatedAt: now,
      })
      return { released: false, state: 'payment-verified' }
    }

    const items = normalizeOrderItems(reservation.items)
    const productReferences = [
      ...new Map(
        items.map((item) => [item.productId, db.doc(`products/${item.productId}`)]),
      ).values(),
    ]
    const productDocuments = await Promise.all(
      productReferences.map((reference) => transaction.get(reference)),
    )
    const productDocumentsById = new Map(
      productDocuments.map((document) => [document.id, document]),
    )
    const inventoryUpdates = new Map()

    items.forEach((item) => {
      const productDocument = productDocumentsById.get(item.productId)
      if (!productDocument?.exists) return
      const product = inventoryUpdates.get(item.productId) || cleanObject(productDocument.data())
      const inventory = inventoryForItem(product, item)
      if (!inventory) return
      const stock = Number(inventory.stock || 0)
      const reservedBefore = Number(inventory.reservedStock || 0)
      const reservedAfter = Math.max(0, reservedBefore - item.qty)
      inventory.reservedStock = reservedAfter
      syncVariantReservedStock(product)
      inventoryUpdates.set(item.productId, product)

      transaction.create(db.collection('inventoryHistory').doc(), {
        productId: item.productId,
        productName: product.name || '',
        variantId: item.variantId || '',
        variantName: variantForItem(product, item)?.name || '',
        sku: inventory.sku || product.sku || '',
        action: expired ? 'Checkout reservation expired' : 'Checkout reservation released',
        quantity: item.qty,
        stockBefore: stock,
        stockAfter: stock,
        reservedBefore,
        reservedAfter,
        availableBefore: Math.max(0, stock - reservedBefore),
        availableAfter: Math.max(0, stock - reservedAfter),
        reference: reservationReference.id,
        note: String(reason).slice(0, 300),
        timestamp: now,
        createdAt: now,
        updatedAt: now,
      })
    })

    inventoryUpdates.forEach((product, productId) => {
      transaction.update(
        db.doc(`products/${productId}`),
        inventoryUpdateFor(product, now),
      )
    })
    transaction.update(reservationReference, {
      status: expired ? 'expired' : 'released',
      releaseReason: String(reason).slice(0, 300),
      releasedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    if (paymentIntentDocument?.exists) {
      transaction.update(paymentIntentDocument.ref, {
        reservationStatus: expired ? 'expired' : 'released',
        updatedAt: now,
      })
    }
    return { released: true, state: expired ? 'expired' : 'released' }
  })
}

async function releaseExpiredStockReservationsHandler() {
  const cleanupStartedAt = Timestamp.now()
  let cursor = null
  let attempted = 0
  const failures = []
  for (let batch = 0; batch < STOCK_RESERVATION_CLEANUP_BATCHES; batch += 1) {
    let expiredQuery = db
      .collection('stockReservations')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', cleanupStartedAt)
      .orderBy('expiresAt')
      .limit(STOCK_RESERVATION_CLEANUP_LIMIT)
    if (cursor) expiredQuery = expiredQuery.startAfter(cursor)
    const expiredReservations = await expiredQuery.get()
    if (expiredReservations.empty) break
    attempted += expiredReservations.size
    const results = await Promise.allSettled(
      expiredReservations.docs.map((document) =>
        releaseStockReservation({
          reservationId: document.id,
          reason: 'Payment was not verified before the reservation timeout',
          expired: true,
        }),
      ),
    )
    failures.push(...results.filter((result) => result.status === 'rejected'))
    cursor = expiredReservations.docs[expiredReservations.docs.length - 1]
    if (expiredReservations.size < STOCK_RESERVATION_CLEANUP_LIMIT) break
  }
  if (failures.length) {
    console.error('Some expired stock reservations could not be released', {
      attempted,
      failed: failures.length,
    })
    throw new Error('Expired reservation cleanup was only partially successful.')
  }
}

module.exports = { releaseExpiredStockReservationsHandler }

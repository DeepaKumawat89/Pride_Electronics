const { db } = require('../shared/core')

const couponReservationReferenceForOrder = (orderId) =>
  db.doc(`couponReservations/${orderId}`)

async function loadCouponReservation(transaction, orderId) {
  const reservationReference = couponReservationReferenceForOrder(orderId)
  const reservationDocument = await transaction.get(reservationReference)
  if (!reservationDocument.exists || reservationDocument.data().status !== 'reserved') {
    return { reservationReference, reservationDocument, active: false }
  }
  const reservation = reservationDocument.data()
  const couponReference = db.doc(`coupons/${reservation.couponId}`)
  const usageReference = db.doc(`couponUsages/${reservation.couponId}_${reservation.userId}`)
  const [couponDocument, usageDocument] = await Promise.all([
    transaction.get(couponReference),
    transaction.get(usageReference),
  ])
  return {
    active: true,
    reservation,
    reservationReference,
    couponDocument,
    usageDocument,
    couponReference,
    usageReference,
  }
}

function releaseCouponReservation(transaction, reservationState, now) {
  if (!reservationState?.active) return false
  const { reservation, reservationReference, couponDocument, usageDocument, couponReference, usageReference } = reservationState
  if (couponDocument.exists) {
    transaction.update(couponReference, {
      reservedUsageCount: Math.max(0, Number(couponDocument.data().reservedUsageCount || 0) - 1),
      updatedAt: now,
    })
  }
  if (usageDocument.exists) {
    transaction.update(usageReference, {
      reservedCount: Math.max(0, Number(usageDocument.data().reservedCount || 0) - 1),
      updatedAt: now,
    })
  }
  transaction.update(reservationReference, {
    status: 'released',
    releasedAt: now,
    updatedAt: now,
  })
  return true
}

function confirmCouponReservation(transaction, reservationState, now) {
  if (!reservationState?.active) return false
  const { reservation, reservationReference, couponDocument, usageDocument, couponReference, usageReference } = reservationState
  if (couponDocument.exists) {
    const coupon = couponDocument.data()
    transaction.update(couponReference, {
      usageCount: Number(coupon.usageCount || 0) + 1,
      reservedUsageCount: Math.max(0, Number(coupon.reservedUsageCount || 0) - 1),
      updatedAt: now,
    })
  }
  const usage = usageDocument.exists ? usageDocument.data() : {}
  transaction.set(usageReference, {
    couponId: reservation.couponId,
    code: reservation.code,
    userId: reservation.userId,
    count: Number(usage.count || 0) + 1,
    reservedCount: Math.max(0, Number(usage.reservedCount || 0) - 1),
    updatedAt: now,
  }, { merge: true })
  transaction.update(reservationReference, {
    status: 'confirmed',
    confirmedAt: now,
    updatedAt: now,
  })
  return true
}

module.exports = {
  couponReservationReferenceForOrder,
  loadCouponReservation,
  releaseCouponReservation,
  confirmCouponReservation,
}

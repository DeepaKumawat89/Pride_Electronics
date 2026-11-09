const {
  db,
  HttpsError,
  onCall,
  callableOptions,
  requireActiveCustomer,
  cleanObject,
  assertOwnedOrder,
} = require('../shared/core')

async function createReturnHandler(request) {
  const uid = await requireActiveCustomer(request)
  const orderId = String(request.data?.orderId || '').trim()
  if (!orderId) throw new HttpsError('invalid-argument', 'An order is required.')
  const details = cleanObject(request.data?.details)
  const orderReference = db.doc(`orders/${orderId}`)
  const returnReference = db.collection('returns').doc()
  const now = new Date().toISOString()

  const returnRequest = await db.runTransaction(async (transaction) => {
    const orderDocument = await transaction.get(orderReference)
    const order = assertOwnedOrder(orderDocument, uid)
    if (!['Delivered', 'Returned'].includes(order.status)) {
      throw new HttpsError('failed-precondition', 'This order is not eligible for return.')
    }
    const existing = await transaction.get(
      db.collection('returns').where('orderId', '==', orderId).where('userId', '==', uid),
    )
    if (existing.docs.some((item) => !['Completed', 'Rejected'].includes(item.data().status))) {
      throw new HttpsError('already-exists', 'A return is already open for this order.')
    }
    const value = {
      id: returnReference.id,
      orderId,
      userId: uid,
      customer: order.customer,
      email: order.email,
      amount: order.total,
      items: order.items || [],
      reason: String(details.reason || '').slice(0, 200),
      images: Array.isArray(details.images) ? details.images.slice(0, 3) : [],
      status: 'Requested',
      resolution: '',
      refundStatus: 'Not Requested',
      inspectionResult: '',
      requestedAt: now,
      updatedAt: now,
      history: [
        { status: 'Requested', timestamp: now, note: 'Return request submitted' },
      ],
    }
    transaction.create(returnReference, cleanObject(value))
    return value
  })
  return { returnRequest }
}

const createReturn = onCall(callableOptions, createReturnHandler)


module.exports = { createReturn, createReturnHandler }


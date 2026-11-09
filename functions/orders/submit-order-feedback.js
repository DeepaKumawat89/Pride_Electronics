const {
  db,
  HttpsError,
  onCall,
  callableOptions,
  requireActiveCustomer,
  cleanObject,
  assertOwnedOrder,
} = require('../shared/core')

async function recalculateProductRatingStats(productId) {
  if (!productId) return { rating: 0, reviewsCount: 0 }
  const productReference = db.doc(`products/${productId}`)
  const publishedReviewsSnapshot = await db
    .collection('reviews')
    .where('productId', '==', productId)
    .where('status', '==', 'Published')
    .get()

  const reviews = publishedReviewsSnapshot.docs.map((doc) => doc.data())
  const count = reviews.length
  const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0)
  const average = count > 0 ? Math.round((total / count) * 10) / 10 : 0

  await productReference.set(
    {
      rating: average,
      reviewsCount: count,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )

  return { rating: average, reviewsCount: count }
}

async function submitOrderFeedbackHandler(request) {  
  const uid = await requireActiveCustomer(request)
  const orderId = String(request.data?.orderId || '').trim()
  const explicitProductId = String(request.data?.productId || '').trim()
  const feedback = cleanObject(request.data?.feedback)
  const rating = Math.max(1, Math.min(5, Math.round(Number(feedback.rating))))
  const reviewText = String(feedback.review || feedback.text || '').trim().slice(0, 2000)
  if (!rating || !reviewText) {
    throw new HttpsError('invalid-argument', 'A rating and review are required.')
  }

  let orderData = null
  let orderReference = null
  if (orderId) {
    orderReference = db.doc(`orders/${orderId}`)
    const orderDoc = await orderReference.get()
    if (orderDoc.exists) {
      orderData = assertOwnedOrder(orderDoc, uid)
    }
  }

  const productId = explicitProductId || orderData?.items?.[0]?.productId || ''
  if (!productId) {
    throw new HttpsError('invalid-argument', 'A product ID is required to submit a review.')
  }

  const productName =
    orderData?.items?.find((item) => String(item.productId) === String(productId))?.productName ||
    orderData?.items?.[0]?.productName ||
    'Pride product'

  const name = orderData?.customer || request.auth.token.name || 'Pride customer'
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const reviewDocId = `${uid}_${productId}`
  const reviewReference = db.doc(`reviews/${reviewDocId}`)
  const now = new Date().toISOString()

  const review = await db.runTransaction(async (transaction) => {
    const existingReviewDoc = await transaction.get(reviewReference)
    const isEdit = existingReviewDoc.exists

    const value = {
      id: reviewDocId,
      orderId: orderId || (isEdit ? existingReviewDoc.data().orderId || '' : ''),
      userId: uid,
      productId,
      productName,
      name,
      initials,
      rating,
      date: now.slice(0, 10),
      title: `Review for ${productName}`,
      text: reviewText,
      status: 'Published',
      tone: 'bg-[#dcebdd] text-[#366643]',
      createdAt: isEdit ? existingReviewDoc.data().createdAt || now : now,
      updatedAt: now,
    }

    transaction.set(reviewReference, cleanObject(value), { merge: true })

    if (orderReference && orderData) {
      transaction.update(orderReference, {
        feedback: { rating, review: reviewText, productId },
        updatedAt: now,
      })
    }

    return value
  })

  // Recalculate product average rating and reviews count
  await recalculateProductRatingStats(productId)

  return { review }
}

const submitOrderFeedback = onCall(
  callableOptions,
  submitOrderFeedbackHandler,
)


module.exports = { submitOrderFeedback, submitOrderFeedbackHandler }


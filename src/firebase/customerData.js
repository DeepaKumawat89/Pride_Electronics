import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { userAuth, userFunctions, userStorage } from './firebase'

const operationGateway = httpsCallable(userFunctions, 'updateUserProfile')
const callOperation = (operation, payload = {}) =>
  operationGateway({ operation, payload })

const messageFor = (error, fallback) => {
  const messages = {
    'functions/failed-precondition':
      'The order could not be completed because product availability changed.',
    'functions/permission-denied': 'You do not have access to this order.',
    'functions/unauthenticated': 'Please sign in again to continue.',
    'functions/not-found': 'The requested order was not found.',
    'functions/resource-exhausted':
      'One or more products no longer have enough stock.',
  }
  return new Error(messages[error?.code] || error?.message || fallback)
}

export async function placeCustomerOrder(order) {
  try {
    const result = await callOperation('placeOrder', { order })
    return result.data.order
  } catch (error) {
    throw messageFor(error, 'Unable to place the order. Please try again.')
  }
}

export async function createCustomerReturn(orderId, details) {
  try {
    const uid = userAuth.currentUser?.uid
    if (!uid) throw new Error('Please sign in again to continue.')
    const images = await Promise.all(
      (details?.images || []).slice(0, 3).map(async (image, index) => {
        const response = await fetch(image.url)
        const blob = await response.blob()
        if (!blob.type.startsWith('image/') || blob.size > 8 * 1024 * 1024) {
          throw new Error('Return images must be valid images smaller than 8 MB.')
        }
        const path = `returns/${uid}/${orderId}/${Date.now()}-${index + 1}`
        const imageReference = ref(userStorage, path)
        await uploadBytes(imageReference, blob, {
          contentType: blob.type,
          customMetadata: { originalName: String(image.name || 'return-image') },
        })
        return { name: image.name || 'Return image', path, url: await getDownloadURL(imageReference) }
      }),
    )
    const result = await callOperation('createReturn', {
      orderId,
      details: { ...details, images },
    })
    return result.data.returnRequest
  } catch (error) {
    throw messageFor(error, 'Unable to create the return request.')
  }
}

export async function cancelCustomerOrder(orderId) {
  try {
    const result = await callOperation('cancelOrder', { orderId })
    return result.data.order
  } catch (error) {
    throw messageFor(error, 'Unable to cancel the order.')
  }
}

export async function submitCustomerOrderFeedback(orderId, feedback) {
  try {
    const result = await callOperation('submitOrderFeedback', {
      orderId,
      feedback,
    })
    return result.data.review
  } catch (error) {
    throw messageFor(error, 'Unable to submit your feedback.')
  }
}

export async function getCustomerCouponUsage() {
  try {
    const result = await callOperation('getCouponUsage')
    return result.data.usage || {}
  } catch (error) {
    throw messageFor(error, 'Unable to load coupon usage.')
  }
}

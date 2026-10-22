import { httpsCallable } from 'firebase/functions'
import { userFunctions } from '../../firebase/firebase'

let razorpayScriptPromise

const customerMessage = (value) =>
  String(value || '').replace(/\s*\[400\]\s*$/, '').trim()

const operationFor = {
  orders: httpsCallable(userFunctions, 'createRazorpayOrder', { timeout: 30000 }),
  verify: httpsCallable(userFunctions, 'verifyRazorpayPayment', { timeout: 30000 }),
  release: httpsCallable(userFunctions, 'releaseRazorpayReservation', { timeout: 10000 }),
}

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true)
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise((resolve) => {
    const existingScript = document.querySelector(
      'script[data-pride-razorpay-checkout]',
    )
    if (existingScript) existingScript.remove()
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.prideRazorpayCheckout = 'true'
    script.onload = () => resolve(Boolean(window.Razorpay))
    script.onerror = () => {
      script.remove()
      razorpayScriptPromise = undefined
      resolve(false)
    }
    document.body.appendChild(script)
  })
  return razorpayScriptPromise
}

export async function postRazorpayApi(path, payload) {
  const paymentGateway = operationFor[path]
  if (!paymentGateway) throw new Error('Unsupported Razorpay request.')
  try {
    const response = await paymentGateway(payload)
    const data = response.data || {}
    if (
      path === 'orders' &&
      (
        !data.order ||
        !Number.isFinite(data.order.amount) ||
        !data.keyId ||
        !['test', 'live'].includes(data.environment)
      )
    ) {
      throw new Error('Razorpay returned an invalid order. Please try again.')
    }
    return data
  } catch (error) {
    const safeBackendCodes = new Set([
      'functions/aborted',
      'functions/already-exists',
      'functions/failed-precondition',
      'functions/invalid-argument',
      'functions/permission-denied',
      'functions/resource-exhausted',
      'app/payment-error',
    ])
    const firebaseMessages = {
      'functions/unauthenticated': 'Your session expired. Sign in again before continuing payment.',
      'functions/deadline-exceeded': 'The payment request timed out. Please try again.',
      'functions/unavailable': 'The payment service is temporarily unavailable. Check your connection and try again.',
      'functions/data-loss': 'Payment verification returned inconsistent details. No order was placed.',
      'functions/internal': 'The payment provider could not complete the request. Please try again.',
    }
    const message = firebaseMessages[error.code] || (
      safeBackendCodes.has(error.code)
        ? customerMessage(error.message)
        : 'The payment request could not be completed. Please try again.'
    )
    throw new Error(
      message,
      { cause: error },
    )
  }
}

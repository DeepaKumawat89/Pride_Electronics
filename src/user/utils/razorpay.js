import { httpsCallable } from 'firebase/functions'
import { userFunctions } from '../../firebase/firebase'

let razorpayScriptPromise

const paymentGateway = httpsCallable(userFunctions, 'updateUserProfile', {
  timeout: 20000,
})

const operationFor = {
  orders: 'createRazorpayOrder',
  verify: 'verifyRazorpayPayment',
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
  const operation = operationFor[path]
  if (!operation) throw new Error('Unsupported Razorpay request.')
  try {
    const response = await paymentGateway({ operation, payload })
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
      'functions/already-exists',
      'functions/failed-precondition',
      'functions/invalid-argument',
      'functions/permission-denied',
      'functions/resource-exhausted',
      'app/payment-error',
    ])
    const message = error.code === 'functions/deadline-exceeded'
      ? 'The payment request timed out. Please try again.'
      : error.code === 'functions/unavailable'
        ? 'The payment service is temporarily unavailable. Check your connection and try again.'
        : safeBackendCodes.has(error.code)
          ? error.message
          : 'The payment request could not be completed. Please try again.'
    throw new Error(
      message,
      { cause: error },
    )
  }
}

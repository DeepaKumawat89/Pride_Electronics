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
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(Boolean(window.Razorpay))
    script.onerror = () => resolve(false)
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
    if (path === 'orders' && (!data.order || !Number.isFinite(data.order.amount))) {
      throw new Error('Razorpay returned an invalid order. Please try again.')
    }
    return data
  } catch (error) {
    throw new Error(
      error.code === 'functions/deadline-exceeded'
        ? 'The payment request timed out. Please try again.'
        : error.message || 'Razorpay request failed. Please try again.',
      { cause: error },
    )
  }
}

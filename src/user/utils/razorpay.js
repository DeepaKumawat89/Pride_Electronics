let razorpayScriptPromise

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
  let response
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 20000)
  try {
    response = await fetch(`/api/razorpay/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error) {
    throw new Error(
      error.name === 'AbortError'
        ? 'The payment request timed out. Please try again.'
        : 'Network error. Check your connection and try again.',
      { cause: error },
    )
  } finally {
    window.clearTimeout(timeout)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Razorpay request failed. Please try again.')
  return data
}

const methodSettings = [
  ['upiEnabled', 'upi'],
  ['cardsEnabled', 'card'],
  ['netBankingEnabled', 'netbanking'],
  ['walletsEnabled', 'wallet'],
]

export function enabledRazorpayMethods(paymentSettings = {}) {
  return methodSettings.flatMap(([setting, method]) =>
    paymentSettings[setting] === true ? [method] : [],
  )
}

export function createRazorpayDisplayConfig(paymentSettings = {}) {
  const instruments = enabledRazorpayMethods(paymentSettings).map((method) => ({
    method,
  }))
  return {
    display: {
      blocks: {
        checkout: {
          name: 'Pay securely',
          instruments,
        },
      },
      sequence: ['block.checkout'],
      preferences: { show_default_blocks: false },
    },
  }
}

export function preferredRazorpayMethod(payment, paymentSettings = {}) {
  const preferred = payment?.type === 'UPI'
    ? 'upi'
    : payment?.type?.includes('Card')
      ? 'card'
      : ''
  return enabledRazorpayMethods(paymentSettings).includes(preferred)
    ? preferred
    : ''
}

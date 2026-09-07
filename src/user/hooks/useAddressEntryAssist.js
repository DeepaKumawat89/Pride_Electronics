import { useEffect, useState } from 'react'
import { lookupIndianPincode } from '../services/addressLookup'
import { getCanonicalIndianState } from '../utils/indianLocations'

const idleState = { status: 'idle', message: '', suggestions: [] }

const isCancelledRequest = (error) => error?.name === 'AbortError'

export function useAddressEntryAssist(form, setForm, enabled = true) {
  const [pincodeLookup, setPincodeLookup] = useState(idleState)

  useEffect(() => {
    if (!enabled) return undefined
    const pincode = String(form.pincode || '').trim()
    if (pincode.length < 6) {
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setPincodeLookup({ status: 'loading', message: '', suggestions: [] })
      lookupIndianPincode(pincode, { signal: controller.signal })
        .then((result) => {
          const state = getCanonicalIndianState(result.state) || result.state
          setForm((current) => {
            if (String(current.pincode || '').trim() !== result.pincode) {
              return current
            }
            return {
              ...current,
              city: result.city,
              state,
              line1: '',
            }
          })
          setPincodeLookup({
            status: 'success',
            message: `PIN code verified for ${result.city}, ${state}.`,
            suggestions: [],
            result: { ...result, state },
            invalid: false,
          })
        })
        .catch((error) => {
          if (isCancelledRequest(error)) return
          setPincodeLookup({
            status: 'error',
            message: error.message,
            suggestions: [],
            invalid: true,
          })
        })
    }, 150)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, form.pincode])

  const updateStreet = (street) => {
    setForm((current) => ({
      ...current,
      street,
      line1: '',
    }))
  }

  const updatePincode = (pincode) => {
    setPincodeLookup(idleState)
    setForm((current) => ({
      ...current,
      pincode,
      city: '',
      state: '',
    }))
  }

  const verifiedPincode = pincodeLookup.result
  const isPincodeVerified = Boolean(
    pincodeLookup.status === 'success' &&
      verifiedPincode &&
      String(form.pincode || '').trim() === verifiedPincode.pincode &&
      String(form.city || '').trim().toLowerCase() ===
        verifiedPincode.city.toLowerCase() &&
      getCanonicalIndianState(form.state).toLowerCase() ===
        getCanonicalIndianState(verifiedPincode.state).toLowerCase(),
  )

  const getPincodeValidationMessage = () => {
    const pincode = String(form.pincode || '').trim()
    if (!/^[1-8]\d{5}$/.test(pincode)) {
      return 'Enter a valid 6-digit Indian PIN code.'
    }
    if (pincodeLookup.status === 'loading') {
      return 'Please wait while the PIN code is being verified.'
    }
    if (pincodeLookup.status === 'error') return pincodeLookup.message
    if (!isPincodeVerified) {
      return 'The PIN code, city, and state do not match. Enter the PIN code again to fetch the correct city and state.'
    }
    return ''
  }

  const reset = () => {
    setPincodeLookup(idleState)
  }

  return {
    pincodeLookup,
    isPincodeVerified,
    getPincodeValidationMessage,
    updateStreet,
    updatePincode,
    reset,
  }
}

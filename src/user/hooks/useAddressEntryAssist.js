import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getBrowserCoordinates,
  isGeoapifyConfigured,
  lookupIndianPincode,
  reverseGeocodeIndianCoordinates,
  searchIndianAddresses,
} from '../services/addressLookup'
import {
  getCanonicalIndianState,
  getIndianCities,
  INDIAN_STATES,
  isCityInIndianState,
} from '../utils/indianLocations'

const idleState = { status: 'idle', message: '', suggestions: [] }

const isCancelledRequest = (error) => error?.name === 'AbortError'

export function useAddressEntryAssist(form, setForm, enabled = true) {
  const [addressLookup, setAddressLookup] = useState(idleState)
  const [pincodeLookup, setPincodeLookup] = useState(idleState)
  const [locationLookup, setLocationLookup] = useState({
    status: 'idle',
    message: '',
  })
  const skipAddressLookup = useRef('')
  const locationController = useRef(null)
  const canonicalState = getCanonicalIndianState(form.state)
  const cityOptions = useMemo(
    () => getIndianCities(canonicalState),
    [canonicalState],
  )

  useEffect(
    () => () => {
      locationController.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (!enabled) return undefined
    const query = String(form.street || '').trim()
    if (skipAddressLookup.current === query) {
      skipAddressLookup.current = ''
      return undefined
    }
    if (query.length < 3) {
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setAddressLookup({ status: 'loading', message: '', suggestions: [] })
      searchIndianAddresses(query, {
        signal: controller.signal,
        bias: form.coordinates,
      })
        .then((suggestions) => {
          setAddressLookup({
            status: suggestions.length ? 'success' : 'empty',
            message: suggestions.length
              ? ''
              : 'No matching Indian addresses found.',
            suggestions,
          })
        })
        .catch((error) => {
          if (isCancelledRequest(error)) return
          setAddressLookup({
            status: 'error',
            message: error.message,
            suggestions: [],
          })
        })
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, form.coordinates, form.street])

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
        .then((suggestions) => {
          setPincodeLookup({
            status: suggestions.length ? 'success' : 'empty',
            message: suggestions.length
              ? ''
              : 'No post offices were found for this PIN code.',
            suggestions,
          })
        })
        .catch((error) => {
          if (isCancelledRequest(error)) return
          setPincodeLookup({
            status: 'error',
            message: error.message,
            suggestions: [],
            invalid:
              error.code === 'invalid_pincode' ||
              error.code === 'pincode_not_found',
          })
        })
    }, 150)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, form.pincode])

  const updateStreet = (street) => {
    setAddressLookup(idleState)
    setForm((current) => ({
      ...current,
      street,
      line1: '',
      coordinates: null,
      latitude: null,
      longitude: null,
    }))
  }

  const updatePincode = (pincode) => {
    setPincodeLookup(idleState)
    setForm((current) => ({
      ...current,
      pincode,
      coordinates: null,
      latitude: null,
      longitude: null,
    }))
  }

  const selectAddress = (suggestion) => {
    skipAddressLookup.current = suggestion.street
    setForm((current) => ({
      ...current,
      houseFlat: suggestion.houseFlat || current.houseFlat,
      street: suggestion.street || current.street,
      area: suggestion.area || current.area,
      city: suggestion.city || current.city,
      state: suggestion.state
        ? getCanonicalIndianState(suggestion.state)
        : current.state,
      pincode: suggestion.pincode || current.pincode,
      line1: '',
      coordinates: suggestion.coordinates,
      latitude: suggestion.coordinates?.latitude ?? current.latitude ?? null,
      longitude: suggestion.coordinates?.longitude ?? current.longitude ?? null,
    }))
    setAddressLookup(idleState)
    setPincodeLookup(idleState)
  }

  const selectPincode = (suggestion) => {
    setForm((current) => ({
      ...current,
      area: suggestion.locality || current.area,
      city: suggestion.city || current.city,
      state: suggestion.state
        ? getCanonicalIndianState(suggestion.state)
        : current.state,
      pincode: suggestion.pincode,
      line1: '',
    }))
    setPincodeLookup(idleState)
  }

  const selectState = (state) => {
    const nextState = getCanonicalIndianState(state)
    setForm((current) => {
      const stateChanged =
        getCanonicalIndianState(current.state) !== nextState
      return {
        ...current,
        state: nextState,
        city:
          !stateChanged || isCityInIndianState(current.city, nextState)
            ? current.city
            : '',
        pincode: stateChanged ? '' : current.pincode,
        line1: '',
        coordinates: stateChanged ? null : current.coordinates,
        latitude: stateChanged ? null : current.latitude,
        longitude: stateChanged ? null : current.longitude,
      }
    })
    setPincodeLookup(idleState)
  }

  const selectCity = (city) => {
    setForm((current) => {
      const cityChanged = current.city !== city
      return {
        ...current,
        city,
        pincode: cityChanged ? '' : current.pincode,
        line1: '',
        coordinates: cityChanged ? null : current.coordinates,
        latitude: cityChanged ? null : current.latitude,
        longitude: cityChanged ? null : current.longitude,
      }
    })
    setPincodeLookup(idleState)
  }

  const useCurrentLocation = async () => {
    if (!isGeoapifyConfigured()) {
      setLocationLookup({
        status: 'error',
        message:
          'Current-location address lookup is not configured. Please enter the address manually.',
      })
      return
    }
    locationController.current?.abort()
    const controller = new AbortController()
    locationController.current = controller
    setLocationLookup({ status: 'loading', message: '' })
    try {
      const coordinates = await getBrowserCoordinates()
      if (controller.signal.aborted) return
      const suggestion = await reverseGeocodeIndianCoordinates(
        coordinates.latitude,
        coordinates.longitude,
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return
      const resolvedCoordinates = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy,
      }
      skipAddressLookup.current = suggestion.street
      setForm((current) => ({
        ...current,
        houseFlat: suggestion.houseFlat || current.houseFlat,
        street: suggestion.street || current.street,
        area: suggestion.area || current.area,
        city: suggestion.city || current.city,
        state: suggestion.state
          ? getCanonicalIndianState(suggestion.state)
          : current.state,
        pincode: suggestion.pincode || current.pincode,
        line1: '',
        coordinates: resolvedCoordinates,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }))
      setAddressLookup(idleState)
      setPincodeLookup(idleState)
      setLocationLookup({
        status: 'success',
        message: 'Current location added. Please verify the address details.',
      })
    } catch (error) {
      if (controller.signal.aborted || isCancelledRequest(error)) return
      setLocationLookup({ status: 'error', message: error.message })
    } finally {
      if (locationController.current === controller) {
        locationController.current = null
      }
    }
  }

  const reset = () => {
    locationController.current?.abort()
    locationController.current = null
    skipAddressLookup.current = ''
    setAddressLookup(idleState)
    setPincodeLookup(idleState)
    setLocationLookup({ status: 'idle', message: '' })
  }

  return {
    addressLookup,
    pincodeLookup,
    locationLookup,
    updateStreet,
    updatePincode,
    selectAddress,
    selectPincode,
    selectState,
    selectCity,
    locationOptions: {
      states: INDIAN_STATES,
      cities: cityOptions,
      hasSelectedState: INDIAN_STATES.includes(canonicalState),
    },
    useCurrentLocation,
    reset,
  }
}

import { httpsCallable } from 'firebase/functions'
import { userFunctions } from '../../firebase/firebase.js'

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function isValidGstinFormat(gstin) {
  if (!gstin) return false
  const clean = String(gstin).trim().toUpperCase()
  return GSTIN_REGEX.test(clean)
}

const userProfileCallable = httpsCallable(userFunctions, 'updateUserProfile', {
  timeout: 15000,
})

export async function verifyGstinWithCashfree(gstin) {
  const cleanGstin = String(gstin || '').trim().toUpperCase()
  if (!cleanGstin) {
    throw new Error('Please enter a GSTIN number.')
  }
  if (!isValidGstinFormat(cleanGstin)) {
    throw new Error('Invalid GSTIN format. Example format: 22AAAAA0000A1Z5')
  }

  try {
    const response = await userProfileCallable({
      operation: 'verifyGstin',
      payload: { gstin: cleanGstin },
    })
    const data = response.data || {}
    if (!data.valid) {
      throw new Error(data.message || 'GSTIN verification failed.')
    }
    return {
      gstin: cleanGstin,
      legalName: data.legalName || data.registeredName || '',
      tradeName: data.tradeName || '',
      status: data.status || data.gstinStatus || 'Active',
      taxpayerType: data.taxpayerType || 'Regular',
      registrationDate: data.registrationDate || '',
      address: data.address || '',
      verifiedAt: data.verifiedAt || new Date().toISOString(),
      verificationProvider: data.verificationProvider || 'cashfree',
      verificationReferenceId: data.verificationReferenceId || '',
      verificationStatus: data.verificationStatus || 'verified',
    }
  } catch (error) {
    const errorMessages = {
      'functions/unauthenticated': 'Please sign in to verify your GSTIN.',
      'functions/invalid-argument': error.message || 'Invalid GSTIN details provided.',
      'functions/not-found': 'GSTIN details not found on Cashfree verification system.',
      'functions/resource-exhausted': 'Too many verification attempts. Please wait a moment and try again.',
      'functions/unavailable': 'Cashfree GST verification service is currently unavailable. Please try again.',
    }
    const message = errorMessages[error?.code] || error.message || 'GSTIN verification failed. Please check your GSTIN and try again.'
    throw new Error(message, { cause: error })
  }
}

export async function saveUserGstDetails(gstin) {
  const value = typeof gstin === 'string' ? gstin : gstin?.gstin
  if (!value) {
    throw new Error('Valid GST details are required.')
  }

  try {
    const response = await userProfileCallable({
      operation: 'saveVerifiedGstDetails',
      payload: { gstin: value },
    })
    return response.data || { success: true }
  } catch (error) {
    throw new Error(error.message || 'Failed to save GST details to profile.', {
      cause: error,
    })
  }
}

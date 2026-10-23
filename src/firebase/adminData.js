import { httpsCallable } from 'firebase/functions'
import { adminFunctions } from './firebase'

const updateCustomerStatusRecord = httpsCallable(
  adminFunctions,
  'updateCustomerStatus',
)
const updateInvoiceSettingsRecord = httpsCallable(
  adminFunctions,
  'updateInvoiceSettings',
)

export async function updateCustomerAccountStatus(userId, status) {
  const result = await updateCustomerStatusRecord({
    userId,
    status,
  })
  return result.data
}

export async function updateInvoiceSettings(settings) {
  try {
    const result = await updateInvoiceSettingsRecord({ settings })
    return result.data?.settings
  } catch (error) {
    const messages = {
      'functions/invalid-argument': error?.message || 'Review the business and tax details, then try again.',
      'functions/unauthenticated': 'Please sign in again to save these details.',
      'functions/permission-denied': 'Only an authorized administrator can update these details.',
      'functions/unavailable': 'Unable to save changes. Check your connection and try again.',
      'functions/deadline-exceeded': 'Saving took too long. Please try again.',
    }
    throw new Error(
      messages[error?.code] || 'Unable to save the tax and business details. Please try again.',
      { cause: error },
    )
  }
}

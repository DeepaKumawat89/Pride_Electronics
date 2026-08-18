import { httpsCallable } from 'firebase/functions'
import { adminFunctions } from './firebase'

const updateCustomerStatusRecord = httpsCallable(
  adminFunctions,
  'updateUserProfile',
)

export async function updateCustomerAccountStatus(userId, status) {
  const result = await updateCustomerStatusRecord({
    operation: 'updateCustomerStatus',
    payload: { userId, status },
  })
  return result.data
}

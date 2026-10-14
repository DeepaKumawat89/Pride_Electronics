import { httpsCallable } from 'firebase/functions'
import { adminFunctions } from './firebase'

const updateCustomerStatusRecord = httpsCallable(
  adminFunctions,
  'updateCustomerStatus',
)

export async function updateCustomerAccountStatus(userId, status) {
  const result = await updateCustomerStatusRecord({
    userId,
    status,
  })
  return result.data
}

import { httpsCallable } from 'firebase/functions'
import { adminFunctions } from './firebase'

const updateCustomerStatusRecord = httpsCallable(
  adminFunctions,
  'updateUserProfile',
)
const getOrderInvoiceRecord = httpsCallable(adminFunctions, 'getOrderInvoice')

export async function updateCustomerAccountStatus(userId, status) {
  const result = await updateCustomerStatusRecord({
    operation: 'updateCustomerStatus',
    payload: { userId, status },
  })
  return result.data
}

export async function getAdminOrderInvoice(orderId) {
  const result = await getOrderInvoiceRecord({ orderId })
  return result.data.invoice
}

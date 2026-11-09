const {
  FieldValue,
  db,
  adminAuth,
  HttpsError,
  onCall,
  callableOptions,
  requireAdmin,
} = require('../shared/core')

async function updateCustomerStatusHandler(request) {
  await requireAdmin(request)
  const userId = String(request.data?.userId || '').trim()
  const status = String(request.data?.status || '').trim()
  if (!userId || !['Active', 'Disabled'].includes(status)) {
    throw new HttpsError('invalid-argument', 'A valid customer status is required.')
  }
  const userReference = db.doc(`users/${userId}`)
  const [authUser, profileDocument] = await Promise.all([
    adminAuth.getUser(userId),
    userReference.get(),
  ])
  if (
    !profileDocument.exists ||
    profileDocument.data()?.uid !== userId ||
    profileDocument.data()?.role !== 'customer' ||
    authUser.customClaims?.admin === true
  ) {
    throw new HttpsError('failed-precondition', 'A valid customer account is required.')
  }
  const disabled = status === 'Disabled'
  await adminAuth.updateUser(userId, { disabled })
  if (disabled) await adminAuth.revokeRefreshTokens(userId)
  await userReference.set(
    { status, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  )
  return { success: true, status }
}

const updateCustomerStatus = onCall(
  callableOptions,
  updateCustomerStatusHandler,
)


module.exports = { updateCustomerStatus, updateCustomerStatusHandler }


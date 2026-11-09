const {
  FieldValue,
  db,
  HttpsError,
  onCall,
  callableOptions,
  requireActiveCustomer,
  sanitizeAccountState,
} = require('../shared/core')

async function saveAccountStateHandler(request) {
  const uid = await requireActiveCustomer(request)
  let account
  try {
    account = sanitizeAccountState(request.data)
  } catch {
    throw new HttpsError('invalid-argument', 'The account changes are invalid.')
  }
  const userReference = db.doc(`users/${uid}`)
  await db.runTransaction(async (transaction) => {
    const userDocument = await transaction.get(userReference)
    const userData = userDocument.data()
    if (!userDocument.exists || userData?.uid !== uid || userData?.role !== 'customer') {
      throw new HttpsError('failed-precondition', 'Your customer profile is unavailable.')
    }
    transaction.set(
      userReference,
      {
        ...account,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })
  return { success: true }
}

const saveAccountState = onCall(callableOptions, saveAccountStateHandler)


module.exports = { saveAccountState, saveAccountStateHandler }


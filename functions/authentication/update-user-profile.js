const {
  FieldValue,
  db,
  adminAuth,
  HttpsError,
  onCall,
  callableOptions,
  requireActiveCustomer,
  validateProfile,
} = require('../shared/core')
const { placeOrderHandler } = require('../orders/place-order-handler')
const { saveAccountStateHandler } = require('../account/save-account-state')
const { removeCartItemsHandler } = require('../account/remove-cart-items')
const { getMyCouponUsageHandler } = require('../account/get-my-coupon-usage')
const { createReturnHandler } = require('../orders/create-return')
const { cancelOrderHandler } = require('../orders/cancel-order')
const { submitOrderFeedbackHandler } = require('../orders/submit-order-feedback')

const updateUserProfile = onCall(callableOptions, async (request) => {
  const operation = String(request.data?.operation || '')
  const operationRequest = operation
    ? { ...request, data: request.data?.payload || {} }
    : request
  if (operation === 'placeOrder') return placeOrderHandler(operationRequest)
  if (operation === 'getCouponUsage') return getMyCouponUsageHandler(operationRequest)
  if (operation === 'saveAccountState') {
    return saveAccountStateHandler(operationRequest)
  }
  if (operation === 'removeCartItems') {
    return removeCartItemsHandler(operationRequest)
  }
  if (operation === 'createReturn') return createReturnHandler(operationRequest)
  if (operation === 'cancelOrder') return cancelOrderHandler(operationRequest)
  if (operation === 'submitOrderFeedback') {
    return submitOrderFeedbackHandler(operationRequest)
  }
  if (operation) {
    throw new HttpsError('invalid-argument', 'Unsupported account operation.')
  }
  const { uid, authUser } = await requireActiveCustomer(request, {
    includeAuthUser: true,
  })
  const profile = validateProfile(request.data)
  const userReference = db.doc(`users/${uid}`)
  const nextPhoneReference = db.doc(`_authPhoneIndex/${profile.phone}`)

  await db.runTransaction(async (transaction) => {
    const [currentProfile, nextPhone] = await Promise.all([
      transaction.get(userReference),
      transaction.get(nextPhoneReference),
    ])
    if (!currentProfile.exists) {
      throw new HttpsError('not-found', 'The user profile was not found.')
    }
    if (nextPhone.exists && nextPhone.data().uid !== uid) {
      throw new HttpsError('already-exists', 'The phone number is already used.')
    }

    const previousPhone = currentProfile.data().phoneNormalized
    let previousPhoneReference = null
    let previousPhoneDocument = null
    if (previousPhone && previousPhone !== profile.phone) {
      previousPhoneReference = db.doc(`_authPhoneIndex/${previousPhone}`)
      previousPhoneDocument = await transaction.get(previousPhoneReference)
    }

    transaction.set(
      nextPhoneReference,
      { uid, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    if (
      previousPhoneReference &&
      previousPhoneDocument?.exists &&
      previousPhoneDocument.data().uid === uid
    ) {
      transaction.delete(previousPhoneReference)
    }
    transaction.set(
      userReference,
      {
        name: profile.name,
        phone: profile.phone,
        phoneNormalized: profile.phone,
        dob: profile.dob,
        gender: profile.gender,
        photo: profile.photo,
        email: String(authUser.email || '').toLowerCase(),
        emailVerified: authUser.emailVerified,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })
  if (profile.name !== authUser.displayName) {
    await adminAuth.updateUser(uid, { displayName: profile.name })
  }
  return { success: true }
})


module.exports = { updateUserProfile }

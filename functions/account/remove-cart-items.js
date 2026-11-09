const {
  FieldValue,
  db,
  HttpsError,
  onCall,
  callableOptions,
  requireActiveCustomer,
  removePurchasedCartItems,
} = require('../shared/core')

async function removeCartItemsHandler(request) {
  const uid = await requireActiveCustomer(request)
  const requestedItems = Array.isArray(request.data?.items)
    ? request.data.items.map((item) => ({
        productId: String(item?.productId || '').trim(),
        variantId: String(item?.variantId || '').trim(),
      }))
    : Array.isArray(request.data?.productIds)
      ? request.data.productIds.map((productId) => ({
          productId: String(productId || '').trim(),
          variantId: '',
        }))
    : []
  if (
    !requestedItems.length ||
    requestedItems.length > 50 ||
    requestedItems.some(({ productId, variantId }) =>
      !/^[a-zA-Z0-9_-]{1,100}$/.test(productId) ||
      (variantId && !/^[a-zA-Z0-9_-]{1,100}$/.test(variantId)),
    )
  ) {
    throw new HttpsError('invalid-argument', 'Select valid cart products.')
  }
  const userReference = db.doc(`users/${uid}`)
  const cartItems = await db.runTransaction(async (transaction) => {
    const userDocument = await transaction.get(userReference)
    const userData = userDocument.data()
    if (!userDocument.exists || userData?.uid !== uid || userData?.role !== 'customer') {
      throw new HttpsError('failed-precondition', 'Your customer profile is unavailable.')
    }
    const remainingCartItems = removePurchasedCartItems(
      userData.cartItems,
      requestedItems,
    )
    transaction.update(userReference, {
      cartItems: remainingCartItems,
      updatedAt: FieldValue.serverTimestamp(),
    })
    return remainingCartItems
  })
  return { cartItems }
}

const removeCartItems = onCall(callableOptions, removeCartItemsHandler)


module.exports = { removeCartItems, removeCartItemsHandler }


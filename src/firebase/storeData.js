import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, userDb, userFunctions } from './firebase'

const accountStateGateway = httpsCallable(userFunctions, 'updateUserProfile')
const removeCartItemsGateway = httpsCallable(userFunctions, 'removeCartItems')

const withoutId = (value) => {
  const serialized = JSON.parse(JSON.stringify(value || {}))
  delete serialized.id
  return serialized
}

const byNewest = (values) =>
  [...values].sort((first, second) =>
    String(second.updatedAt || second.createdAt || second.date || '').localeCompare(
      String(first.updatedAt || first.createdAt || first.date || ''),
    ),
  )

const documentsFrom = (snapshot, sort = false) => {
  const values = snapshot.docs.map((snapshotDocument) => ({
    ...snapshotDocument.data(),
    id: snapshotDocument.id,
  }))
  return sort ? byNewest(values) : values
}

export function subscribeToCollection(
  collectionName,
  onValues,
  onError,
  { sort = false, database = db, constraints = [] } = {},
) {
  const source = constraints.length
    ? query(collection(database, collectionName), ...constraints)
    : collection(database, collectionName)
  return onSnapshot(
    source,
    (snapshot) => onValues(documentsFrom(snapshot, sort)),
    onError,
  )
}

export const subscribeToPublishedReviews = (onValues, onError) =>
  subscribeToCollection('reviews', onValues, onError, {
    sort: true,
    constraints: [where('status', '==', 'Published')],
  })

export function subscribeToSetting(settingName, onValue, onError) {
  return onSnapshot(
    doc(db, 'settings', settingName),
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null),
    onError,
  )
}

export async function saveRecord(collectionName, value, { merge = false } = {}) {
  const reference = value?.id
    ? doc(db, collectionName, String(value.id))
    : doc(collection(db, collectionName))
  const saved = {
    ...value,
    id: reference.id,
    updatedAt: new Date().toISOString(),
  }
  if (!value?.createdAt) saved.createdAt = saved.updatedAt
  await setDoc(reference, withoutId(saved), { merge })
  return saved
}

export const saveRecords = (collectionName, values) =>
  Promise.all(values.map((value) => saveRecord(collectionName, value, { merge: true })))

export const removeRecord = (collectionName, id) =>
  deleteDoc(doc(db, collectionName, String(id)))

export const saveSetting = (settingName, value) =>
  setDoc(
    doc(db, 'settings', settingName),
    {
      ...JSON.parse(JSON.stringify(value)),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )

export function subscribeToUserOrders(uid, onValues, onError) {
  return subscribeToCollection('orders', onValues, onError, {
    database: userDb,
    sort: true,
    constraints: [where('userId', '==', uid)],
  })
}

export function subscribeToUserReturns(uid, onValues, onError) {
  return subscribeToCollection('returns', onValues, onError, {
    database: userDb,
    sort: true,
    constraints: [where('userId', '==', uid)],
  })
}

export function subscribeToUserAccount(uid, onValue, onError) {
  return onSnapshot(
    doc(userDb, 'users', uid),
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : {}),
    onError,
  )
}

export const saveUserAccount = async (_uid, values) => {
  try {
    await accountStateGateway({
      operation: 'saveAccountState',
      payload: JSON.parse(JSON.stringify(values)),
    })
  } catch (error) {
    const messages = {
      'functions/invalid-argument':
        'One of your account changes is invalid. Review it and try again.',
      'functions/unauthenticated': 'Please sign in again to save your changes.',
      'functions/failed-precondition':
        'Your customer profile is unavailable. Sign in again and retry.',
      'functions/permission-denied':
        'Your account does not permit this change. Contact support if this is unexpected.',
      'functions/unavailable':
        'Unable to save your changes. Check your connection and try again.',
      'functions/deadline-exceeded':
        'Saving took too long. Check your connection and try again.',
    }
    throw new Error(
      messages[error?.code] || 'Unable to save your account changes. Please try again.',
      { cause: error },
    )
  }
}

export const removeUserCartItems = async (items) => {
  try {
    const normalizedItems = items.map((item) =>
      typeof item === 'object' && item !== null
        ? item
        : { productId: item },
    )
    const result = await removeCartItemsGateway({ items: normalizedItems })
    return result.data?.cartItems || []
  } catch (error) {
    const messages = {
      'functions/invalid-argument': 'This cart item is invalid.',
      'functions/unauthenticated': 'Please sign in again to update your cart.',
      'functions/failed-precondition':
        'Your customer profile is unavailable. Sign in again and retry.',
      'functions/permission-denied':
        'Your account does not permit this change. Contact support if this is unexpected.',
      'functions/unavailable':
        'Unable to update your cart. Check your connection and try again.',
      'functions/deadline-exceeded':
        'Updating your cart took too long. Please try again.',
    }
    throw new Error(
      messages[error?.code] || 'Unable to remove this item. Please try again.',
      { cause: error },
    )
  }
}

export const removeUserCartItem = (productId, variantId = '') =>
  removeUserCartItems([{ productId, ...(variantId ? { variantId } : {}) }])

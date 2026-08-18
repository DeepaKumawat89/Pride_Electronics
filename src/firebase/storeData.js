import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { db, userDb } from './firebase'

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

export const saveUserAccount = (uid, values) =>
  setDoc(
    doc(userDb, 'users', uid),
    {
      ...JSON.parse(JSON.stringify(values)),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  )

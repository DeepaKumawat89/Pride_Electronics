import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'

const maintenanceReference = doc(db, 'settings', 'maintenance')

export function subscribeToMaintenanceMode(onValue, onError) {
  return onSnapshot(
    maintenanceReference,
    (snapshot) => onValue(snapshot.exists() && snapshot.data()?.enabled === true),
    onError,
  )
}

export async function updateMaintenanceMode(enabled) {
  const normalizedEnabled = enabled === true
  await setDoc(
    maintenanceReference,
    { enabled: normalizedEnabled },
    { merge: true },
  )
  return normalizedEnabled
}

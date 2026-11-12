import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { doc as liteDoc, getDoc as liteGetDoc } from 'firebase/firestore/lite'
import { db, publicDb } from './firebase'

const maintenanceReference = doc(db, 'settings', 'maintenance')
const MAINTENANCE_CACHE_KEY = 'pride_maintenance_status'
const MAINTENANCE_CACHE_TTL_MS = 5 * 60 * 1000

const readMaintenanceCache = () => {
  try {
    const cached = JSON.parse(
      window.localStorage.getItem(MAINTENANCE_CACHE_KEY) || 'null',
    )
    if (
      !cached ||
      typeof cached.enabled !== 'boolean' ||
      !Number.isFinite(cached.updatedAt) ||
      Date.now() - cached.updatedAt > MAINTENANCE_CACHE_TTL_MS
    ) {
      window.localStorage.removeItem(MAINTENANCE_CACHE_KEY)
      return null
    }
    return cached.enabled
  } catch {
    return null
  }
}

const writeMaintenanceCache = (enabled) => {
  try {
    window.localStorage.setItem(
      MAINTENANCE_CACHE_KEY,
      JSON.stringify({ enabled: enabled === true, updatedAt: Date.now() }),
    )
  } catch {
    // Local caching is an optimization; Firebase remains the source of truth.
  }
}

export function getInitialMaintenanceState() {
  const cachedEnabled = readMaintenanceCache()
  return {
    enabled: false,
    loading: cachedEnabled !== false,
  }
}

export function subscribeToMaintenanceMode(onValue, onError) {
  return onSnapshot(
    maintenanceReference,
    (snapshot) => {
      const enabled = snapshot.exists() && snapshot.data()?.enabled === true
      writeMaintenanceCache(enabled)
      onValue(enabled)
    },
    onError,
  )
}

export async function getMaintenanceMode() {
  const snapshot = await liteGetDoc(liteDoc(publicDb, 'settings', 'maintenance'))
  const enabled = snapshot.exists() && snapshot.data()?.enabled === true
  writeMaintenanceCache(enabled)
  return enabled
}

export async function updateMaintenanceMode(enabled) {
  const normalizedEnabled = enabled === true
  await setDoc(
    maintenanceReference,
    { enabled: normalizedEnabled },
    { merge: true },
  )
  writeMaintenanceCache(normalizedEnabled)
  return normalizedEnabled
}

import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCniVo3kJxHiq1pIO-apKxvx2xayaXmYus',
  authDomain: 'ecommerce-78081.firebaseapp.com',
  projectId: 'ecommerce-78081',
  storageBucket: 'ecommerce-78081.firebasestorage.app',
  messagingSenderId: '434764316635',
  appId: '1:434764316635:web:bc0d7ca394801cc70231fe',
  measurementId: 'G-KV5GF131X3',
}

const app = getApps().some((firebaseApp) => firebaseApp.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig)
const userApp = getApps().some(
  (firebaseApp) => firebaseApp.name === 'pride-user-auth',
)
  ? getApp('pride-user-auth')
  : initializeApp(firebaseConfig, 'pride-user-auth')

const viteEnvironment = import.meta.env || {}
const appCheckSiteKey = viteEnvironment.VITE_FIREBASE_APP_CHECK_SITE_KEY
if (typeof window !== 'undefined' && appCheckSiteKey) {
  const debugToken = viteEnvironment.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN
  if (viteEnvironment.DEV && debugToken) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
  initializeAppCheck(userApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
export const userAuth = getAuth(userApp)
export const userFunctions = getFunctions(userApp, 'asia-south1')
export const adminFunctions = getFunctions(app, 'asia-south1')
export const db = getFirestore(app)
export const userDb = getFirestore(userApp)
export const storage = getStorage(app)
export const userStorage = getStorage(userApp)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

export default app

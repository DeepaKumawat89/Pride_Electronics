import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyDF4djFtrqwozdqnPA0iOhhJ08PZvpCauc',
  authDomain: 'iplteams-6eb14.firebaseapp.com',
  projectId: 'iplteams-6eb14',
  storageBucket: 'iplteams-6eb14.firebasestorage.app',
  messagingSenderId: '29343418210',
  appId: '1:29343418210:web:e4954f777ba1df5cc80e3b',
}

const app = getApps().some((firebaseApp) => firebaseApp.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(firebaseConfig)
const userApp = getApps().some(
  (firebaseApp) => firebaseApp.name === 'pride-user-auth',
)
  ? getApp('pride-user-auth')
  : initializeApp(firebaseConfig, 'pride-user-auth')

export const auth = getAuth(app)
export const userAuth = getAuth(userApp)
export const userFunctions = getFunctions(userApp, 'asia-south1')
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app

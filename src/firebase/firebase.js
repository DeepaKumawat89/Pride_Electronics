import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyDF4djFtrqwozdqnPA0iOhhJ08PZvpCauc',
  authDomain: 'iplteams-6eb14.firebaseapp.com',
  projectId: 'iplteams-6eb14',
  storageBucket: 'iplteams-6eb14.firebasestorage.app',
  messagingSenderId: '29343418210',
  appId: '1:29343418210:web:e4954f777ba1df5cc80e3b',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app

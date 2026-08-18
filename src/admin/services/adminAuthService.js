import {
  browserSessionPersistence,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../../firebase/firebase'

const ADMIN_SESSION_KEY = 'pride_admin_session'
const ADMIN_ACCOUNT_KEY = 'pride_admin_account'

export const demoAdmin = {
  email: 'admin@pride.com',
  password: 'admin123',
  name: 'Pride Admin',
  role: 'Store Administrator',
}

const getStoredAdminProfile = () => {
  try {
    const account = JSON.parse(localStorage.getItem(ADMIN_ACCOUNT_KEY) || '{}')
    return {
      name: account.name || demoAdmin.name,
      role: account.role || demoAdmin.role,
    }
  } catch {
    return { name: demoAdmin.name, role: demoAdmin.role }
  }
}

const storeAdminSession = (session) => {
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(
    ADMIN_ACCOUNT_KEY,
    JSON.stringify({
      name: session.name,
      email: session.email,
      role: session.role,
    }),
  )
  return session
}

const createAdminSession = async (user) => {
  const profile = getStoredAdminProfile()
  const token = await user.getIdTokenResult()
  return storeAdminSession({
    uid: user.uid,
    name: user.displayName || profile.name,
    email: user.email || '',
    role:
      token.claims.role ||
      (token.claims.admin ? 'Store Administrator' : profile.role),
  })
}

const getAuthErrorMessage = (error) => {
  const messages = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/user-not-found': 'Incorrect email or password.',
    'auth/wrong-password': 'Incorrect email or password.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/user-disabled': 'This administrator account has been disabled.',
    'auth/too-many-requests':
      'Too many unsuccessful attempts. Please wait and try again.',
    'auth/network-request-failed':
      'Unable to reach Firebase. Check your internet connection and try again.',
    'auth/requires-recent-login':
      'Please sign out, sign in again, and retry this security-sensitive change.',
    'auth/email-already-in-use':
      'That email address is already used by another Firebase account.',
    'auth/weak-password': 'The new password does not meet Firebase requirements.',
  }
  return new Error(
    messages[error?.code] || 'Authentication failed. Please try again.',
  )
}

export const getAdminCredentials = () => demoAdmin

export async function signInAdmin(email, password) {
  try {
    await setPersistence(auth, browserSessionPersistence)
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    )
    return await createAdminSession(credential.user)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

export function observeAdminSession(onChange) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
      onChange(null)
      return
    }
    try {
      onChange(await createAdminSession(user))
    } catch {
      sessionStorage.removeItem(ADMIN_SESSION_KEY)
      onChange(null)
    }
  })
}

export async function updateAdminProfile(profile) {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Your admin session has expired. Please sign in again.')
  }
  try {
    if (profile.name !== user.displayName) {
      await updateProfile(user, { displayName: profile.name.trim() })
    }
    if (profile.email.toLowerCase() !== String(user.email).toLowerCase()) {
      await updateEmail(user, profile.email.trim().toLowerCase())
    }
    return await createAdminSession(user)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

export async function updateAdminPassword(currentPassword, nextPassword) {
  const user = auth.currentUser
  if (!user?.email) {
    throw new Error('Your admin session has expired. Please sign in again.')
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    await updatePassword(user, nextPassword)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

export async function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
  await signOut(auth)
}

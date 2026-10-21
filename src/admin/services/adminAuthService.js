import {
  browserSessionPersistence,
  onIdTokenChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth } from '../../firebase/firebase'
import {
  createUserFacingAuthError,
  toUserFacingAuthError,
} from '../../firebase/authErrors'

const bestEffortAdminSignOut = async () => {
  try {
    await signOut(auth)
  } catch {
    // Keep authorization failures deterministic even if cleanup fails.
  }
}

const createAdminSession = async (user, forceRefresh = false) => {
  const token = await user.getIdTokenResult(forceRefresh)
  if (token.claims.admin !== true) {
    await bestEffortAdminSignOut()
    throw createUserFacingAuthError(
      'This Firebase account is not authorized for admin access.',
    )
  }
  return {
    uid: user.uid,
    name: user.displayName || 'Pride Admin',
    email: user.email || '',
    role: 'Store Administrator',
    permissions: ['*'],
  }
}

export async function requestAdminPasswordReset(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw createUserFacingAuthError('Enter a valid email address.')
  }
  try {
    await sendPasswordResetEmail(auth, normalizedEmail)
    return 'If that administrator account exists, Firebase has sent a password reset link.'
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return 'If that administrator account exists, Firebase has sent a password reset link.'
    }
    throw getAuthErrorMessage(error)
  }
}

const getAuthErrorMessage = (error) => {
  const adminMessages = {
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
  return toUserFacingAuthError(error, adminMessages)
}

export async function signInAdmin(email, password) {
  try {
    await setPersistence(auth, browserSessionPersistence)
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    )
    return await createAdminSession(credential.user, true)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

export function observeAdminSession(onChange) {
  return onIdTokenChanged(auth, async (user) => {
    if (!user) {
      onChange(null)
      return
    }
    try {
      onChange(await createAdminSession(user))
    } catch {
      await bestEffortAdminSignOut()
      onChange(null)
    }
  })
}

export async function clearAdminSession() {
  try {
    await signOut(auth)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

import {
  browserSessionPersistence,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase/firebase'
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

const createAdminSession = async (user) => {
  const token = await user.getIdTokenResult(true)
  if (token.claims.admin !== true) {
    await bestEffortAdminSignOut()
    throw createUserFacingAuthError(
      'This Firebase account is not authorized for admin access.',
    )
  }
  const profileDocument = await getDoc(doc(db, 'admins', user.uid))
  const profile = profileDocument.data() || {}
  return {
    uid: user.uid,
    name: user.displayName || profile.name || 'Pride Admin',
    email: user.email || '',
    role: profile.role || token.claims.role || 'Store Administrator',
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
    return await createAdminSession(credential.user)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

export function observeAdminSession(onChange) {
  return onAuthStateChanged(auth, async (user) => {
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

export async function updateAdminProfile(profile) {
  const user = auth.currentUser
  if (!user) {
    throw createUserFacingAuthError(
      'Your admin session has expired. Please sign in again.',
    )
  }
  try {
    if (profile.name !== user.displayName) {
      await updateProfile(user, { displayName: profile.name.trim() })
    }
    if (profile.email.toLowerCase() !== String(user.email).toLowerCase()) {
      await updateEmail(user, profile.email.trim().toLowerCase())
    }
    await setDoc(
      doc(db, 'admins', user.uid),
      {
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )
    return await createAdminSession(user)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

export async function updateAdminPassword(currentPassword, nextPassword) {
  const user = auth.currentUser
  if (!user?.email) {
    throw createUserFacingAuthError(
      'Your admin session has expired. Please sign in again.',
    )
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
  try {
    await signOut(auth)
  } catch (error) {
    throw getAuthErrorMessage(error)
  }
}

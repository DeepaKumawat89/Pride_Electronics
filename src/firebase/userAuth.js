import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { userAuth, userFunctions, userStorage } from './firebase'

const createUserProfile = httpsCallable(userFunctions, 'createUserProfile')
const getUserProfileRecord = httpsCallable(userFunctions, 'getUserProfile')
const updateUserProfileRecord = httpsCallable(
  userFunctions,
  'updateUserProfile',
)
const signInUserWithPhone = httpsCallable(
  userFunctions,
  'signInUserWithPhone',
)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[6-9]\d{9}$/

export const normalizeUserPhone = (value) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(-10)

const nameFromEmail = (email) =>
  String(email || '')
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Pride Customer'

const mapUser = (firebaseUser, profile = {}) => ({
  uid: firebaseUser.uid,
  name:
    profile.name ||
    firebaseUser.displayName ||
    nameFromEmail(firebaseUser.email),
  email: firebaseUser.email || profile.email || '',
  mobile: profile.phone || profile.mobile || '',
  phone: profile.phone || profile.mobile || '',
  emailVerified: firebaseUser.emailVerified,
  photo: firebaseUser.photoURL || profile.photo || '',
  dob: profile.dob || '',
  gender: profile.gender || '',
  role: 'customer',
})

const getErrorMessage = (error) => {
  const messages = {
    'auth/email-already-in-use':
      'An account already exists with this email address.',
    'auth/invalid-credential': 'Incorrect login details.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'Incorrect login details.',
    'auth/wrong-password': 'Incorrect login details.',
    'auth/weak-password': 'Use a stronger password with at least 8 characters.',
    'auth/too-many-requests':
      'Too many unsuccessful attempts. Please wait and try again.',
    'auth/network-request-failed':
      'Unable to reach Firebase. Check your connection and try again.',
    'auth/requires-recent-login':
      'Please sign out, sign in again, and retry this security-sensitive change.',
    'functions/already-exists':
      'An account already exists with this phone number.',
    'functions/failed-precondition':
      'Verify your email address before signing in with your phone number.',
    'functions/invalid-argument': 'Check the information and try again.',
    'functions/not-found': 'Incorrect login details.',
    'functions/resource-exhausted':
      'Too many unsuccessful attempts. Please wait and try again.',
    'functions/unauthenticated': 'Incorrect login details.',
    'functions/unavailable':
      'Authentication is temporarily unavailable. Please try again.',
  }
  return new Error(
    messages[error?.code] ||
      error?.message ||
      'Authentication failed. Please try again.',
  )
}

const wait = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

async function loadUser(firebaseUser, retries = 0) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const profile = await getUserProfileRecord()
      return mapUser(firebaseUser, profile.data)
    } catch (error) {
      if (error?.code !== 'functions/not-found' || attempt === retries) {
        throw error
      }
      await wait(350)
    }
  }
  throw new Error('Unable to load the user profile.')
}

export async function signUpUser({ name, phone, email, password }) {
  const normalizedName = String(name || '').trim()
  const normalizedPhone = normalizeUserPhone(phone)
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    throw new Error('Enter your full name.')
  }
  if (!PHONE_PATTERN.test(normalizedPhone)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.')
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.')
  }
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      'Use at least 8 characters with uppercase, lowercase, and a number.',
    )
  }

  let credential
  try {
    await setPersistence(userAuth, browserLocalPersistence)
    credential = await createUserWithEmailAndPassword(
      userAuth,
      normalizedEmail,
      password,
    )
    await updateProfile(credential.user, { displayName: normalizedName })
    await createUserProfile({ name: normalizedName, phone: normalizedPhone })
  } catch (error) {
    if (credential?.user) {
      try {
        await deleteUser(credential.user)
      } catch {
        await signOut(userAuth)
      }
    }
    throw getErrorMessage(error)
  }

  let verificationEmailSent = false
  try {
    await sendEmailVerification(credential.user)
    verificationEmailSent = true
  } catch {
    // The account is valid even if sending the optional email must be retried.
  }
  return {
    ...mapUser(credential.user, {
      name: normalizedName,
      phone: normalizedPhone,
    }),
    verificationEmailSent,
  }
}

export async function signInUser(identifier, password) {
  const normalizedIdentifier = String(identifier || '').trim().toLowerCase()
  let credential
  try {
    await setPersistence(userAuth, browserLocalPersistence)
    const phone = normalizeUserPhone(normalizedIdentifier)
    if (!normalizedIdentifier.includes('@') && PHONE_PATTERN.test(phone)) {
      const result = await signInUserWithPhone({ phone, password })
      credential = await signInWithEmailAndPassword(
        userAuth,
        result.data.email,
        password,
      )
    } else {
      if (!EMAIL_PATTERN.test(normalizedIdentifier)) {
        throw new Error('Enter a valid email address or 10-digit mobile number.')
      }
      credential = await signInWithEmailAndPassword(
        userAuth,
        normalizedIdentifier,
        password,
      )
    }
    await reload(credential.user)
    let verificationEmailSent = false
    if (!credential.user.emailVerified) {
      try {
        await sendEmailVerification(credential.user)
        verificationEmailSent = true
      } catch {
        // Firebase rate limits repeated verification emails automatically.
      }
    }
    return {
      ...(await loadUser(credential.user)),
      verificationEmailSent,
    }
  } catch (error) {
    if (credential?.user) await signOut(userAuth)
    if (error instanceof Error && !error.code) throw error
    throw getErrorMessage(error)
  }
}

export function observeUserSession(onUser, onError) {
  return onAuthStateChanged(
    userAuth,
    async (firebaseUser) => {
      if (!firebaseUser) {
        onUser(null)
        return
      }
      try {
        await reload(firebaseUser)
        onUser(await loadUser(firebaseUser, 8))
      } catch (error) {
        if (userAuth.currentUser?.uid !== firebaseUser.uid) return
        await signOut(userAuth)
        onError?.(getErrorMessage(error))
      }
    },
    (error) => onError?.(getErrorMessage(error)),
  )
}

export async function saveUserProfile(profile) {
  const firebaseUser = userAuth.currentUser
  if (!firebaseUser) throw new Error('Please sign in again to update your profile.')
  const name = String(profile.name || '').trim()
  const phone = normalizeUserPhone(profile.mobile || profile.phone)
  try {
    let photo = profile.photo || firebaseUser.photoURL || ''
    if (String(photo).startsWith('data:image/')) {
      const response = await fetch(photo)
      const blob = await response.blob()
      if (blob.size > 8 * 1024 * 1024) {
        throw new Error('Profile photos must be smaller than 8 MB.')
      }
      const photoReference = ref(
        userStorage,
        `users/${firebaseUser.uid}/profile/photo`,
      )
      await uploadBytes(photoReference, blob, { contentType: blob.type })
      photo = await getDownloadURL(photoReference)
    }
    const emailChanged =
      profile.email &&
      profile.email.trim().toLowerCase() !==
        String(firebaseUser.email || '').toLowerCase()
    if (emailChanged) {
      if (!EMAIL_PATTERN.test(profile.email.trim().toLowerCase())) {
        throw new Error('Enter a valid email address.')
      }
      await verifyBeforeUpdateEmail(
        firebaseUser,
        profile.email.trim().toLowerCase(),
      )
    }
    if (name !== firebaseUser.displayName || photo !== firebaseUser.photoURL) {
      await updateProfile(firebaseUser, { displayName: name, photoURL: photo || null })
    }
    await updateUserProfileRecord({
      name,
      phone,
      dob: profile.dob || '',
      gender: profile.gender || '',
      photo,
    })
    const savedUser = await loadUser(firebaseUser)
    return { ...savedUser, emailChangePending: Boolean(emailChanged) }
  } catch (error) {
    if (error instanceof Error && !error.code) throw error
    throw getErrorMessage(error)
  }
}

export const signOutUser = () => signOut(userAuth)

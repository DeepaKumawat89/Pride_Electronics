import {
  browserLocalPersistence,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  linkWithCredential,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  validatePassword,
  verifyPasswordResetCode,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { userAuth, userFunctions, userStorage } from './firebase'
import {
  createUserFacingAuthError,
  toUserFacingAuthError,
} from './authErrors'

const createUserProfile = httpsCallable(userFunctions, 'createUserProfile')
const ensureGoogleUserProfileRecord = httpsCallable(
  userFunctions,
  'ensureGoogleUserProfile',
)
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
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
let registrationInProgress = null
let signInInProgress = false
let googleSignInInProgress = null
let pendingGoogleLink = null
let passwordResetRequestInProgress = false

const bestEffortSignOut = async () => {
  try {
    await signOut(userAuth)
  } catch {
    // Preserve the original, user-friendly authentication failure.
  }
}

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
  gstDetails: profile.gstDetails || null,
  gstProfiles: Array.isArray(profile.gstProfiles) ? profile.gstProfiles : [],
  role: 'customer',
})

const getErrorMessage = (error) => toUserFacingAuthError(error)

const joinRequirements = (requirements) =>
  requirements.length < 2
    ? requirements[0] || 'the configured security requirements'
    : `${requirements.slice(0, -1).join(', ')}, and ${requirements.at(-1)}`

const passwordPolicyMessage = (status) => {
  const requirements = []
  const policy = status.passwordPolicy?.customStrengthOptions || {}
  if (status.meetsMinPasswordLength === false) {
    requirements.push(`at least ${policy.minPasswordLength || 6} characters`)
  }
  if (status.meetsMaxPasswordLength === false) {
    requirements.push(`no more than ${policy.maxPasswordLength || 4096} characters`)
  }
  if (status.containsLowercaseLetter === false) {
    requirements.push('a lowercase letter')
  }
  if (status.containsUppercaseLetter === false) {
    requirements.push('an uppercase letter')
  }
  if (status.containsNumericCharacter === false) {
    requirements.push('a number')
  }
  if (status.containsNonAlphanumericCharacter === false) {
    requirements.push('a special character')
  }
  return `Use a password with ${joinRequirements(requirements)}.`
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
  throw createUserFacingAuthError('Unable to load the user profile.')
}

export async function signUpUser({ name, phone, email, password }) {
  const normalizedName = String(name || '').trim()
  const normalizedPhone = normalizeUserPhone(phone)
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedPassword = String(password || '')
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    throw new Error('Enter your full name.')
  }
  if (!PHONE_PATTERN.test(normalizedPhone)) {
    throw new Error('Enter a valid 10-digit Indian mobile number.')
  }
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.')
  }
  if (!normalizedPassword) throw new Error('Enter a password.')
  if (registrationInProgress || signInInProgress || googleSignInInProgress) {
    throw new Error('Authentication is already in progress. Please wait.')
  }

  let settleRegistration
  registrationInProgress = new Promise((resolve) => {
    settleRegistration = resolve
  })

  let credential
  try {
    await setPersistence(userAuth, browserLocalPersistence)
    const passwordStatus = await validatePassword(userAuth, normalizedPassword)
    if (!passwordStatus.isValid) {
      throw createUserFacingAuthError(passwordPolicyMessage(passwordStatus))
    }
    credential = await createUserWithEmailAndPassword(
      userAuth,
      normalizedEmail,
      normalizedPassword,
    )
    await updateProfile(credential.user, { displayName: normalizedName })
    await createUserProfile({ name: normalizedName, phone: normalizedPhone })
  } catch (error) {
    if (credential?.user) {
      try {
        await deleteUser(credential.user)
      } catch {
        await bestEffortSignOut()
      }
    }
    throw getErrorMessage(error)
  } finally {
    settleRegistration()
    registrationInProgress = null
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
  const normalizedPassword = String(password || '')
  if (!normalizedIdentifier) {
    throw new Error('Enter your email address or 10-digit mobile number.')
  }
  if (!normalizedPassword) {
    throw new Error('Enter your password.')
  }
  if (normalizedPassword.length > 4096) {
    throw new Error('Incorrect login details.')
  }
  if (signInInProgress || registrationInProgress || googleSignInInProgress) {
    throw new Error('Authentication is already in progress. Please wait.')
  }
  signInInProgress = true
  let credential
  try {
    await setPersistence(userAuth, browserLocalPersistence)
    const phone = normalizeUserPhone(normalizedIdentifier)
    if (!normalizedIdentifier.includes('@') && PHONE_PATTERN.test(phone)) {
      const result = await signInUserWithPhone({
        phone,
        password: normalizedPassword,
      })
      credential = await signInWithEmailAndPassword(
        userAuth,
        result.data.email,
        normalizedPassword,
      )
    } else {
      if (!EMAIL_PATTERN.test(normalizedIdentifier)) {
        throw createUserFacingAuthError(
          'Enter a valid email address or 10-digit mobile number.',
        )
      }
      credential = await signInWithEmailAndPassword(
        userAuth,
        normalizedIdentifier,
        normalizedPassword,
      )
    }
    await reload(credential.user)
    if (pendingGoogleLink) {
      const signedInEmail = String(credential.user.email || '').toLowerCase()
      if (signedInEmail !== pendingGoogleLink.email) {
        throw createUserFacingAuthError(
          `Sign in with ${pendingGoogleLink.email} to connect that Google account.`,
        )
      }
      try {
        await linkWithCredential(credential.user, pendingGoogleLink.credential)
        pendingGoogleLink = null
      } catch (linkError) {
        if (linkError?.code === 'auth/provider-already-linked') {
          pendingGoogleLink = null
        } else {
          if (linkError?.code === 'auth/credential-already-in-use') {
            pendingGoogleLink = null
          }
          throw linkError
        }
      }
      await ensureGoogleUserProfileRecord()
      await reload(credential.user)
    }
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
    if (credential?.user) await bestEffortSignOut()
    throw getErrorMessage(error)
  } finally {
    signInInProgress = false
  }
}

export async function signInUserWithGoogle() {
  if (googleSignInInProgress || registrationInProgress || signInInProgress) {
    throw new Error('Authentication is already in progress. Please wait.')
  }

  let settleGoogleSignIn
  googleSignInInProgress = new Promise((resolve) => {
    settleGoogleSignIn = resolve
  })
  let result
  let isNewUser = false
  try {
    await setPersistence(userAuth, browserLocalPersistence)
    result = await signInWithPopup(userAuth, googleProvider)
    isNewUser = Boolean(getAdditionalUserInfo(result)?.isNewUser)
    await ensureGoogleUserProfileRecord()
    await reload(result.user)
    return {
      ...(await loadUser(result.user, 8)),
      isNewUser,
    }
  } catch (error) {
    if (error?.code === 'auth/account-exists-with-different-credential') {
      const credential = GoogleAuthProvider.credentialFromError(error)
      const email = String(error.customData?.email || '').trim().toLowerCase()
      if (credential && EMAIL_PATTERN.test(email)) {
        pendingGoogleLink = { credential, email }
        const linkingError = new Error(
          `An account already exists for ${email}. Sign in with its email and password below to securely link Google and keep the same account.`,
        )
        linkingError.code = 'account-linking-required'
        linkingError.email = email
        throw linkingError
      }
    }
    if (result?.user) {
      if (isNewUser) {
        try {
          await deleteUser(result.user)
        } catch {
          await bestEffortSignOut()
        }
      } else {
        await bestEffortSignOut()
      }
    }
    throw getErrorMessage(error)
  } finally {
    settleGoogleSignIn()
    googleSignInInProgress = null
  }
}

export function clearPendingGoogleLink() {
  pendingGoogleLink = null
}

export async function requestUserPasswordReset(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new Error('Enter a valid email address.')
  }
  if (passwordResetRequestInProgress) {
    throw new Error('A password reset request is already in progress. Please wait.')
  }
  passwordResetRequestInProgress = true
  try {
    await sendPasswordResetEmail(userAuth, normalizedEmail)
    return {
      message:
        'If an account exists for that email, Firebase has sent a password reset link.',
    }
  } catch (error) {
    // Avoid revealing whether a Firebase account exists for an email address.
    if (error?.code === 'auth/user-not-found') {
      return {
        message:
          'If an account exists for that email, Firebase has sent a password reset link.',
      }
    }
    throw getErrorMessage(error)
  } finally {
    passwordResetRequestInProgress = false
  }
}

export async function verifyUserPasswordResetCode(actionCode) {
  if (!String(actionCode || '').trim()) {
    throw new Error('This password reset link is invalid or incomplete.')
  }
  try {
    return await verifyPasswordResetCode(userAuth, actionCode)
  } catch (error) {
    throw getErrorMessage(error)
  }
}

export async function completeUserPasswordReset(actionCode, nextPassword) {
  const password = String(nextPassword || '')
  if (!password) throw new Error('Enter a new password.')
  try {
    const passwordStatus = await validatePassword(userAuth, password)
    if (!passwordStatus.isValid) {
      throw createUserFacingAuthError(passwordPolicyMessage(passwordStatus))
    }
    await confirmPasswordReset(userAuth, actionCode, password)
  } catch (error) {
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
        const pendingProfileSetup =
          registrationInProgress || googleSignInInProgress
        if (pendingProfileSetup) await pendingProfileSetup
        if (userAuth.currentUser?.uid !== firebaseUser.uid) return
        await reload(firebaseUser)
        onUser(await loadUser(firebaseUser, 40))
      } catch (error) {
        if (userAuth.currentUser?.uid !== firebaseUser.uid) return
        await bestEffortSignOut()
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
        throw createUserFacingAuthError(
          'Profile photos must be smaller than 8 MB.',
        )
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
        throw createUserFacingAuthError('Enter a valid email address.')
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
    throw getErrorMessage(error)
  }
}

export async function signOutUser() {
  clearPendingGoogleLink()
  try {
    await signOut(userAuth)
  } catch (error) {
    throw getErrorMessage(error)
  }
}

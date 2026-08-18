const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')
const { HttpsError, onCall } = require('firebase-functions/v2/https')

initializeApp()

const db = getFirestore()
const adminAuth = getAuth()
const firebaseWebApiKey =
  process.env.FIREBASE_WEB_API_KEY ||
  'AIzaSyDF4djFtrqwozdqnPA0iOhhJ08PZvpCauc'
const region = 'asia-south1'
const callableOptions = { region, invoker: 'public' }
const PHONE_PATTERN = /^[6-9]\d{9}$/

const normalizePhone = (value) =>
  String(value || '')
    .replace(/\D/g, '')
    .slice(-10)

const validateProfile = (data = {}) => {
  const name = String(data.name || '').trim()
  const phone = normalizePhone(data.phone)
  if (name.length < 2 || name.length > 80) {
    throw new HttpsError('invalid-argument', 'Enter a valid full name.')
  }
  if (!PHONE_PATTERN.test(phone)) {
    throw new HttpsError('invalid-argument', 'Enter a valid mobile number.')
  }
  return {
    name,
    phone,
    dob: String(data.dob || '').slice(0, 10),
    gender: String(data.gender || '').slice(0, 30),
  }
}

const requireUser = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.')
  }
  return request.auth.uid
}

exports.createUserProfile = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const profile = validateProfile(request.data)
  const authUser = await adminAuth.getUser(uid)
  if (!authUser.email) {
    throw new HttpsError('failed-precondition', 'An email address is required.')
  }

  const userReference = db.doc(`users/${uid}`)
  const phoneReference = db.doc(`_authPhoneIndex/${profile.phone}`)
  await db.runTransaction(async (transaction) => {
    const [existingProfile, existingPhone] = await Promise.all([
      transaction.get(userReference),
      transaction.get(phoneReference),
    ])
    if (existingProfile.exists) {
      throw new HttpsError('already-exists', 'The user profile already exists.')
    }
    if (existingPhone.exists && existingPhone.data().uid !== uid) {
      throw new HttpsError('already-exists', 'The phone number is already used.')
    }
    transaction.set(phoneReference, {
      uid,
      createdAt: FieldValue.serverTimestamp(),
    })
    transaction.set(userReference, {
      uid,
      name: profile.name,
      phone: profile.phone,
      phoneNormalized: profile.phone,
      email: authUser.email.toLowerCase(),
      emailVerified: authUser.emailVerified,
      role: 'customer',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  return { success: true }
})

exports.getUserProfile = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const authUser = await adminAuth.getUser(uid)
  const userReference = db.doc(`users/${uid}`)
  const userDocument = await userReference.get()
  if (!userDocument.exists) {
    throw new HttpsError('not-found', 'The user profile was not found.')
  }
  const profile = userDocument.data()
  await userReference.set(
    {
      email: String(authUser.email || '').toLowerCase(),
      emailVerified: authUser.emailVerified,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  return {
    uid,
    name: profile.name || authUser.displayName || 'Pride Customer',
    phone: profile.phone || '',
    email: String(authUser.email || '').toLowerCase(),
    emailVerified: authUser.emailVerified,
    dob: profile.dob || '',
    gender: profile.gender || '',
    role: 'customer',
  }
})

exports.updateUserProfile = onCall(callableOptions, async (request) => {
  const uid = requireUser(request)
  const profile = validateProfile(request.data)
  const authUser = await adminAuth.getUser(uid)
  const userReference = db.doc(`users/${uid}`)
  const nextPhoneReference = db.doc(`_authPhoneIndex/${profile.phone}`)

  await db.runTransaction(async (transaction) => {
    const [currentProfile, nextPhone] = await Promise.all([
      transaction.get(userReference),
      transaction.get(nextPhoneReference),
    ])
    if (!currentProfile.exists) {
      throw new HttpsError('not-found', 'The user profile was not found.')
    }
    if (nextPhone.exists && nextPhone.data().uid !== uid) {
      throw new HttpsError('already-exists', 'The phone number is already used.')
    }

    const previousPhone = currentProfile.data().phoneNormalized
    let previousPhoneReference = null
    let previousPhoneDocument = null
    if (previousPhone && previousPhone !== profile.phone) {
      previousPhoneReference = db.doc(`_authPhoneIndex/${previousPhone}`)
      previousPhoneDocument = await transaction.get(previousPhoneReference)
    }

    transaction.set(
      nextPhoneReference,
      { uid, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    if (
      previousPhoneReference &&
      previousPhoneDocument?.exists &&
      previousPhoneDocument.data().uid === uid
    ) {
      transaction.delete(previousPhoneReference)
    }
    transaction.set(
      userReference,
      {
        name: profile.name,
        phone: profile.phone,
        phoneNormalized: profile.phone,
        dob: profile.dob,
        gender: profile.gender,
        email: String(authUser.email || '').toLowerCase(),
        emailVerified: authUser.emailVerified,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })
  if (profile.name !== authUser.displayName) {
    await adminAuth.updateUser(uid, { displayName: profile.name })
  }
  return { success: true }
})

exports.signInUserWithPhone = onCall(callableOptions, async (request) => {
  if (request.auth) {
    throw new HttpsError('failed-precondition', 'Sign out before signing in.')
  }
  const phone = normalizePhone(request.data?.phone)
  const password = String(request.data?.password || '')
  if (!PHONE_PATTERN.test(phone) || !password || password.length > 128) {
    throw new HttpsError('invalid-argument', 'Invalid login details.')
  }

  const phoneDocument = await db.doc(`_authPhoneIndex/${phone}`).get()
  if (!phoneDocument.exists) {
    throw new HttpsError('unauthenticated', 'Invalid login details.')
  }
  const uid = phoneDocument.data().uid
  const authUser = await adminAuth.getUser(uid)
  if (!authUser.email || !authUser.emailVerified || authUser.disabled) {
    throw new HttpsError(
      authUser.emailVerified ? 'unauthenticated' : 'failed-precondition',
      'Invalid login details.',
    )
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseWebApiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: authUser.email,
        password,
        returnSecureToken: true,
      }),
    },
  )
  const result = await response.json()
  if (!response.ok || result.localId !== uid) {
    const tooManyAttempts = String(result?.error?.message || '').includes(
      'TOO_MANY_ATTEMPTS',
    )
    throw new HttpsError(
      tooManyAttempts ? 'resource-exhausted' : 'unauthenticated',
      'Invalid login details.',
    )
  }
  // The client completes a normal Firebase email/password sign-in with this
  // verified address. This avoids requiring the runtime service account to
  // sign a custom token while keeping phone-to-email lookup protected by the
  // user's password.
  return { email: authUser.email }
})

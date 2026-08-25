import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { after, before, beforeEach, test } from 'node:test'
import { deleteApp as deleteClientApp, initializeApp } from 'firebase/app'
import {
  confirmPasswordReset,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  verifyPasswordResetCode,
} from 'firebase/auth'

const require = createRequire(new URL('../functions/package.json', import.meta.url))
const {
  deleteApp: deleteAdminApp,
  initializeApp: initializeAdminApp,
} = require('firebase-admin/app')
const { getAuth: getAdminAuth } = require('firebase-admin/auth')

const projectId = 'demo-pride-electronics'
const emulatorOrigin = 'http://127.0.0.1:9099'
let app
let auth
let adminApp
let adminAuth

before(() => {
  app = initializeApp({ apiKey: 'demo-api-key', projectId }, 'auth-reset-tests')
  auth = getAuth(app)
  connectAuthEmulator(auth, emulatorOrigin, { disableWarnings: true })
  adminApp = initializeAdminApp({ projectId }, 'auth-reset-admin-tests')
  adminAuth = getAdminAuth(adminApp)
})

beforeEach(async () => {
  await fetch(`${emulatorOrigin}/emulator/v1/projects/${projectId}/accounts`, {
    method: 'DELETE',
  })
})

after(async () => {
  await Promise.all([deleteClientApp(app), deleteAdminApp(adminApp)])
})

test('an administrator can sign in and receives the server-assigned admin claim', async () => {
  const email = 'administrator@example.com'
  const password = 'AdminPassword1!'
  const credential = await createUserWithEmailAndPassword(auth, email, password)

  await adminAuth.setCustomUserClaims(credential.user.uid, {
    admin: true,
    role: 'Store Administrator',
  })
  await signOut(auth)

  const adminCredential = await signInWithEmailAndPassword(auth, email, password)
  const token = await adminCredential.user.getIdTokenResult(true)
  assert.equal(token.claims.admin, true)
  assert.equal(token.claims.role, 'Store Administrator')
  await signOut(auth)
  assert.equal(auth.currentUser, null)
})

test('password reset replaces the old password and rejects a reused code', async () => {
  const email = 'reset-user@example.com'
  const oldPassword = 'OldPassword1!'
  const newPassword = 'NewPassword2!'

  await createUserWithEmailAndPassword(auth, email, oldPassword)
  await signOut(auth)
  await sendPasswordResetEmail(auth, email)

  const response = await fetch(
    `${emulatorOrigin}/emulator/v1/projects/${projectId}/oobCodes`,
  )
  const { oobCodes } = await response.json()
  const resetRequest = oobCodes.find(
    (item) => item.requestType === 'PASSWORD_RESET' && item.email === email,
  )

  assert.ok(resetRequest?.oobCode, 'Firebase should generate a reset action code')
  assert.equal(await verifyPasswordResetCode(auth, resetRequest.oobCode), email)
  await confirmPasswordReset(auth, resetRequest.oobCode, newPassword)

  await assert.rejects(signInWithEmailAndPassword(auth, email, oldPassword))
  await assert.doesNotReject(signInWithEmailAndPassword(auth, email, newPassword))
  await signOut(auth)
  await assert.rejects(verifyPasswordResetCode(auth, resetRequest.oobCode))
})

test('invalid reset email and action codes are rejected', async () => {
  await assert.rejects(sendPasswordResetEmail(auth, 'not-an-email'))
  await assert.rejects(verifyPasswordResetCode(auth, 'invalid-action-code'))
  await assert.rejects(
    confirmPasswordReset(auth, 'invalid-action-code', 'NewPassword2!'),
  )
})

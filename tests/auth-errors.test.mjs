import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createUserFacingAuthError,
  getUserFacingAuthMessage,
  toUserFacingAuthError,
  USER_FACING_AUTH_ERROR_CODE,
} from '../src/firebase/authErrors.js'

const cases = [
  ['auth/invalid-credential', 'Unable to sign in. Please check your email and password.'],
  ['auth/invalid-email', 'Enter a valid email address.'],
  ['auth/email-already-in-use', 'An account already exists with this email address.'],
  ['auth/weak-password', 'The password does not meet the required security policy.'],
  ['auth/user-disabled', 'This account has been disabled. Please contact support.'],
  ['auth/too-many-requests', 'Too many unsuccessful attempts. Please wait and try again.'],
  ['auth/network-request-failed', 'Unable to reach Firebase. Check your connection and try again.'],
  ['auth/popup-closed-by-user', 'Google sign-in was cancelled before it finished.'],
  ['auth/popup-blocked', 'Your browser blocked the Google sign-in popup. Allow popups and try again.'],
  ['auth/invalid-oauth-provider', 'Google sign-in is temporarily unavailable. Please use another sign-in method.'],
  ['auth/account-exists-with-different-credential', 'An account already uses this email. Sign in with your email and password to link Google safely.'],
  ['auth/internal-error', 'Authentication is temporarily unavailable. Please try again.'],
  ['functions/internal', 'Authentication is temporarily unavailable. Please try again.'],
]

for (const [code, expected] of cases) {
  test(`maps ${code} to a user-friendly message`, () => {
    const error = Object.assign(new Error('FirebaseError: internal diagnostic'), {
      code,
    })
    assert.equal(getUserFacingAuthMessage(error), expected)
  })
}

test('does not expose unexpected technical error messages', () => {
  const mapped = toUserFacingAuthError(
    new Error('FirebaseError: backend stack, project identifier, and internals'),
  )
  assert.equal(mapped.message, 'Authentication failed. Please try again.')
  assert.equal(mapped.code, USER_FACING_AUTH_ERROR_CODE)
})

test('preserves explicitly-created safe validation messages', () => {
  const safeError = createUserFacingAuthError('Enter your password.')
  assert.equal(toUserFacingAuthError(safeError), safeError)
})

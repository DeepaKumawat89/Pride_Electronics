export const USER_FACING_AUTH_ERROR_CODE = 'app/user-facing-auth-error'

const DEFAULT_MESSAGE = 'Authentication failed. Please try again.'
const INVALID_CREDENTIALS_MESSAGE =
  'Unable to sign in. Please check your email and password.'

const AUTH_ERROR_MESSAGES = {
  'auth/email-already-in-use':
    'An account already exists with this email address.',
  'auth/account-exists-with-different-credential':
    'An account already uses this email. Sign in with your email and password to link Google safely.',
  'auth/credential-already-in-use':
    'This Google account is already connected to another account.',
  'auth/provider-already-linked':
    'Google is already connected to this account.',
  'auth/invalid-credential': INVALID_CREDENTIALS_MESSAGE,
  'auth/invalid-login-credentials': INVALID_CREDENTIALS_MESSAGE,
  'auth/user-not-found': INVALID_CREDENTIALS_MESSAGE,
  'auth/wrong-password': INVALID_CREDENTIALS_MESSAGE,
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter your email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/weak-password':
    'The password does not meet the required security policy.',
  'auth/password-does-not-meet-requirements':
    'The password does not meet the required security policy.',
  'auth/too-many-requests':
    'Too many unsuccessful attempts. Please wait and try again.',
  'auth/quota-exceeded':
    'Authentication is temporarily busy. Please wait and try again.',
  'auth/network-request-failed':
    'Unable to reach Firebase. Check your connection and try again.',
  'auth/timeout': 'The request timed out. Check your connection and try again.',
  'auth/internal-error':
    'Authentication is temporarily unavailable. Please try again.',
  'auth/cancelled-popup-request':
    'The previous Google sign-in request was cancelled.',
  'auth/popup-blocked':
    'Your browser blocked the Google sign-in popup. Allow popups and try again.',
  'auth/popup-closed-by-user':
    'Google sign-in was cancelled before it finished.',
  'auth/unauthorized-domain':
    'Google sign-in is not authorized on this domain. Please contact support.',
  'auth/app-not-authorized':
    'Google sign-in is not configured for this application. Please contact support.',
  'auth/web-storage-unsupported':
    'Google sign-in needs browser storage. Enable it or try another browser.',
  'auth/operation-not-supported-in-this-environment':
    'Google sign-in is unavailable in this browser or environment.',
  'auth/invalid-provider-id':
    'Google sign-in is temporarily unavailable. Please use another sign-in method.',
  'auth/invalid-oauth-provider':
    'Google sign-in is temporarily unavailable. Please use another sign-in method.',
  'auth/operation-not-allowed':
    'This sign-in method is not enabled. Please contact support.',
  'auth/expired-action-code':
    'This password reset link has expired. Request a new one and try again.',
  'auth/invalid-action-code':
    'This password reset link is invalid or has already been used.',
  'auth/requires-recent-login':
    'Please sign out, sign in again, and retry this security-sensitive change.',
  'functions/already-exists':
    'An account already exists with this phone number.',
  'functions/failed-precondition':
    'Verify your email address before signing in with your phone number.',
  'functions/invalid-argument': 'Check the information and try again.',
  'functions/not-found': INVALID_CREDENTIALS_MESSAGE,
  'functions/resource-exhausted':
    'Too many unsuccessful attempts. Please wait and try again.',
  'functions/unauthenticated': INVALID_CREDENTIALS_MESSAGE,
  'functions/permission-denied':
    'This account is unavailable. Please contact support.',
  'functions/unavailable':
    'Authentication is temporarily unavailable. Please try again.',
  'functions/internal':
    'Authentication is temporarily unavailable. Please try again.',
  'functions/unknown':
    'Authentication is temporarily unavailable. Please try again.',
  'functions/deadline-exceeded':
    'The request timed out. Check your connection and try again.',
}

export const createUserFacingAuthError = (
  message,
  code = USER_FACING_AUTH_ERROR_CODE,
) => {
  const error = new Error(message)
  error.code = code
  return error
}

export const toUserFacingAuthError = (error, overrides = {}) => {
  if (
    error?.code === USER_FACING_AUTH_ERROR_CODE ||
    error?.code === 'account-linking-required'
  ) {
    return error
  }

  const message =
    overrides[error?.code] || AUTH_ERROR_MESSAGES[error?.code] || DEFAULT_MESSAGE
  return createUserFacingAuthError(message)
}

export const getUserFacingAuthMessage = (error, overrides) =>
  toUserFacingAuthError(error, overrides).message

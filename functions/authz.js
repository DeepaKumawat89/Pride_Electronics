const { HttpsError } = require('firebase-functions/v2/https')

const requireUser = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.')
  }
  return request.auth.uid
}

const requireAdmin = (request) => {
  const uid = requireUser(request)
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Administrator access is required.')
  }
  return uid
}

module.exports = { requireAdmin, requireUser }

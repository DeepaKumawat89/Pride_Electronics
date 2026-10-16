const { HttpsError } = require('firebase-functions/v2/https')

const requireUser = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.')
  }
  return request.auth.uid
}

const isAdmin = (token = {}) => token.admin === true

const requireAdmin = (request) => {
  const uid = requireUser(request)
  if (!isAdmin(request.auth.token)) {
    throw new HttpsError('permission-denied', 'Administrator access is required.')
  }
  return uid
}

module.exports = { isAdmin, requireAdmin, requireUser }

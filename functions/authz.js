const { HttpsError } = require('firebase-functions/v2/https')

const requireUser = (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required.')
  }
  return request.auth.uid
}

const hasAdminPermission = (token = {}, permission) => {
  if (token.admin !== true) return false
  if (token.role === 'Store Administrator') return true
  const permissions = Array.isArray(token.permissions) ? token.permissions : []
  return permissions.includes('*') || permissions.includes(permission)
}

const requireAdmin = (request, permission) => {
  const uid = requireUser(request)
  if (!hasAdminPermission(request.auth.token, permission)) {
    throw new HttpsError('permission-denied', 'Administrator access is required.')
  }
  return uid
}

module.exports = { hasAdminPermission, requireAdmin, requireUser }

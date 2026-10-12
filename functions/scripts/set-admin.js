const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { FieldValue, getFirestore } = require('firebase-admin/firestore')

const email = String(process.argv[2] || '').trim().toLowerCase()
const role = String(process.argv[3] || 'Store Administrator').trim()
const rolePermissions = {
  'Store Administrator': ['*'],
  'Order Manager': ['dashboard', 'orders', 'payments', 'returns', 'users', 'reports'],
  'Catalog Manager': ['dashboard', 'products', 'categories', 'inventory', 'offers', 'coupons', 'reviews'],
}
const permissions = String(process.argv[4] || '')
  .split(',')
  .map((permission) => permission.trim())
  .filter(Boolean)
const trustedPermissions = permissions.length ? permissions : rolePermissions[role]

if (!email) {
  throw new Error('Usage: npm run set-admin -- admin@example.com "Store Administrator" "permission-one,permission-two"')
}
if (!trustedPermissions?.length) {
  throw new Error('Custom roles require a comma-separated permissions argument.')
}

initializeApp()

async function setAdmin() {
  const user = await getAuth().getUserByEmail(email)
  await getAuth().setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    admin: true,
    role,
    permissions: trustedPermissions,
  })
  await getFirestore().doc(`admins/${user.uid}`).set(
    {
      uid: user.uid,
      name: user.displayName || 'Pride Admin',
      email,
      role,
      permissions: trustedPermissions,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
  process.stdout.write(`Admin access granted to ${email}. Sign in again to refresh claims.\n`)
}

setAdmin().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})

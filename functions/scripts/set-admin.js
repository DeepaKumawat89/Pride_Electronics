const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'ecommerce-78081'
const defaultAdminEmail = 'admin@prideelectronics.in'
const email = String(process.argv[2] || defaultAdminEmail).trim().toLowerCase()

if (!email) {
  throw new Error('Usage: npm run set-admin -- admin@prideelectronics.in')
}

initializeApp({ projectId })

const withoutLegacyAdminClaims = (claims = {}) => {
  const nextClaims = { ...claims }
  delete nextClaims.admin
  delete nextClaims.role
  delete nextClaims.permissions
  return nextClaims
}

async function removeOtherAdmins(auth, selectedUid, pageToken) {
  const page = await auth.listUsers(1000, pageToken)
  let removedCount = 0
  for (const user of page.users) {
    if (user.uid === selectedUid || user.customClaims?.admin !== true) continue
    await auth.setCustomUserClaims(
      user.uid,
      withoutLegacyAdminClaims(user.customClaims),
    )
    await auth.revokeRefreshTokens(user.uid)
    removedCount += 1
  }
  if (page.pageToken) {
    removedCount += await removeOtherAdmins(auth, selectedUid, page.pageToken)
  }
  return removedCount
}

async function setAdmin() {
  const auth = getAuth()
  const user = await auth.getUserByEmail(email)
  const removedCount = await removeOtherAdmins(auth, user.uid)
  await auth.setCustomUserClaims(user.uid, {
    ...withoutLegacyAdminClaims(user.customClaims),
    admin: true,
  })
  await auth.revokeRefreshTokens(user.uid)
  process.stdout.write(
    `Sole administrator access granted to ${email}; removed ${removedCount} other admin claim(s). Sign in again to refresh the ID token.\n`,
  )
  if (removedCount > 0) {
    process.stdout.write(
      'Allow up to one hour for previously issued Firebase ID tokens to expire.\n',
    )
  }
}

setAdmin().catch((error) => {
  const missingCredentials =
    error?.code === 'app/invalid-credential' ||
    /default credentials|credential/i.test(String(error?.message || ''))
  process.stderr.write(
    missingCredentials
      ? `Google Application Default Credentials are unavailable for ${projectId}. Set GOOGLE_APPLICATION_CREDENTIALS to a secure service-account key with the Firebase Authentication Admin role, then retry.\n`
      : `${error.message}\n`,
  )
  process.exitCode = 1
})

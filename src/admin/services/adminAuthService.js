const ADMIN_SESSION_KEY = 'pride_admin_session'
const ADMIN_ACCOUNT_KEY = 'pride_admin_account'

export const demoAdmin = {
  email: 'admin@pride.com',
  password: 'admin123',
  name: 'Pride Admin',
  role: 'Store Administrator',
}

const getAdminAccount = () => {
  try {
    return {
      ...demoAdmin,
      ...JSON.parse(localStorage.getItem(ADMIN_ACCOUNT_KEY) || '{}'),
    }
  } catch {
    return demoAdmin
  }
}

export const getAdminCredentials = () => getAdminAccount()

export async function signInAdmin(email, password) {
  await new Promise((resolve) => setTimeout(resolve, 550))
  if (
    email.trim().toLowerCase() !== getAdminAccount().email.toLowerCase() ||
    password !== getAdminAccount().password
  ) {
    throw new Error('Incorrect credentials. Use the demo account shown below.')
  }
  const account = getAdminAccount()
  const session = { name: account.name, email: account.email, role: account.role }
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
  return session
}

export function updateAdminProfile(profile) {
  const account = { ...getAdminAccount(), ...profile }
  localStorage.setItem(ADMIN_ACCOUNT_KEY, JSON.stringify(account))
  const session = { name: account.name, email: account.email, role: account.role }
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
  return session
}

export function updateAdminPassword(currentPassword, nextPassword) {
  const account = getAdminAccount()
  if (currentPassword !== account.password) {
    throw new Error('Current password is incorrect.')
  }
  if (nextPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.')
  }
  localStorage.setItem(
    ADMIN_ACCOUNT_KEY,
    JSON.stringify({ ...account, password: nextPassword }),
  )
}

export function getAdminSession() {
  try {
    return JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
}

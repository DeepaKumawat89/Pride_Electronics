const ADMIN_SESSION_KEY = 'pride_admin_session'

export const demoAdmin = {
  email: 'admin@pride.com',
  password: 'admin123',
  name: 'Pride Admin',
  role: 'Store Administrator',
}

export async function signInAdmin(email, password) {
  await new Promise((resolve) => setTimeout(resolve, 550))
  if (
    email.trim().toLowerCase() !== demoAdmin.email ||
    password !== demoAdmin.password
  ) {
    throw new Error('Incorrect credentials. Use the demo account shown below.')
  }
  const session = {
    name: demoAdmin.name,
    email: demoAdmin.email,
    role: demoAdmin.role,
  }
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session))
  return session
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

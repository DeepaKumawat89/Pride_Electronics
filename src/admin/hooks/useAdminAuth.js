import { useState } from 'react'
import {
  clearAdminSession,
  getAdminSession,
  signInAdmin,
} from '../services/adminAuthService'

export function useAdminAuth() {
  const [admin, setAdmin] = useState(getAdminSession)
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    setLoading(true)
    try {
      const session = await signInAdmin(email, password)
      setAdmin(session)
      return session
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearAdminSession()
    setAdmin(null)
  }

  return { admin, loading, login, logout }
}

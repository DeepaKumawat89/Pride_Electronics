import { useCallback, useEffect, useState } from 'react'
import {
  clearAdminSession,
  observeAdminSession,
  requestAdminPasswordReset,
  signInAdmin,
} from '../services/adminAuthService'

export function useAdminAuth() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = observeAdminSession((session) => {
      setAdmin(session)
      setLoading(false)
    })
    return unsubscribe
  }, [])

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

  const logout = useCallback(async () => {
    setAdmin(null)
    await clearAdminSession()
  }, [])

  const resetPassword = (email) => requestAdminPasswordReset(email)

  return {
    admin,
    loading,
    login,
    logout,
    resetPassword,
  }
}

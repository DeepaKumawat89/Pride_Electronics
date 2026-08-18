import { useState } from 'react'
import {
  clearAdminSession,
  getAdminSession,
  signInAdmin,
  updateAdminPassword,
  updateAdminProfile,
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

  const updateProfile = (profile) => {
    const session = updateAdminProfile(profile)
    setAdmin(session)
    return session
  }

  const changePassword = (currentPassword, nextPassword) =>
    updateAdminPassword(currentPassword, nextPassword)

  return { admin, loading, login, logout, updateProfile, changePassword }
}

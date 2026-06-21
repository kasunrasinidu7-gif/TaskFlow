// src/context/AuthContext.jsx
// Global authentication context.
// Now also tracks RequirePasswordChange so ProtectedRoute can gate access.

import React, { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const navigate = useNavigate()

  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user,  setUser]  = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  /**
   * Called after a successful login.
   * If RequirePasswordChange is true, navigate to /change-password instead of /dashboard.
   */
  function login(token, user) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
    if (user.RequirePasswordChange) {
      navigate('/change-password')
    } else {
      navigate('/dashboard')
    }
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  function hasRole(...roles) {
    return user ? roles.includes(user.RoleName) : false
  }

  /**
   * Called after the forced password change completes.
   * Updates the stored user object to clear the flag without a full re-login.
   */
  function clearPasswordChangeFlag() {
    const updated = { ...user, RequirePasswordChange: false }
    localStorage.setItem('user', JSON.stringify(updated))
    setUser(updated)
    navigate('/dashboard')
  }

  const value = {
    user,
    token,
    login,
    logout,
    hasRole,
    clearPasswordChangeFlag,
    isLoggedIn:             !!token,
    requirePasswordChange:  !!(user?.RequirePasswordChange),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

// src/context/AuthContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global Authentication Context
//
// WHY USE CONTEXT?
//   The logged-in user's info (name, role, token) is needed in many places:
//   the sidebar shows the username, the RBAC logic hides/shows buttons,
//   the Axios interceptor attaches the token.
//
//   Instead of passing this data as props through every component (prop drilling),
//   we store it in a Context. Any component can read it with useAuth().
//
// WHAT IT STORES:
//   user  — the decoded user object { UserID, Name, Email, RoleName }
//   token — the JWT string
//   login() — saves the token and user, redirects to dashboard
//   logout() — clears everything, redirects to login
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Create the context object
const AuthContext = createContext(null)

/**
 * AuthProvider wraps the whole app (in App.jsx).
 * It reads the token from localStorage on first load so the user
 * stays logged in after a page refresh.
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate()

  // Initialise state from localStorage (persists across refreshes)
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
   * Stores the token and user in both state and localStorage.
   */
  function login(token, user) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setToken(token)
    setUser(user)
    navigate('/dashboard')
  }

  /**
   * Clears all auth data and redirects to login.
   */
  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  /**
   * Helper: check if the current user has one of the allowed roles.
   * Usage: hasRole('Admin') or hasRole('Admin', 'Project Manager')
   */
  function hasRole(...roles) {
    return user ? roles.includes(user.RoleName) : false
  }

  const value = { user, token, login, logout, hasRole, isLoggedIn: !!token }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Custom hook — any component can call useAuth() to access the context.
 * Usage: const { user, logout, hasRole } = useAuth()
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

// src/components/layout/ProtectedRoute.jsx
// Route guard. If user is logged in but RequirePasswordChange is true,
// ALL routes except /change-password redirect there first.

import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { isLoggedIn, hasRole, requirePasswordChange } = useAuth()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  // Force password change — block all other pages
  if (requirePasswordChange) {
    return <Navigate to="/change-password" replace />
  }

  if (roles && !hasRole(...roles)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen" style={{ background: 'var(--bg-page)' }}>
        <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-12 text-center max-w-sm">
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="font-display font-bold text-xl text-[var(--text-dark)] mb-2">Access Denied</h1>
          <p className="text-[var(--text-light)] text-sm">You don't have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return children ? children : <Outlet />
}

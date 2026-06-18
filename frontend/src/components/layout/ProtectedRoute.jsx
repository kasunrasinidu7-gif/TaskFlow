// src/components/layout/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Route guard that redirects unauthenticated users to /login.
// Optionally checks for specific roles and shows a 403 page.
//
// TWO USAGE PATTERNS:
//   1. As a layout route (wraps a group of routes with <Outlet>):
//      <Route element={<ProtectedRoute />}>
//        <Route path="/dashboard" element={<Dashboard />} />
//      </Route>
//
//   2. As a wrapper around a single element (uses children):
//      <ProtectedRoute roles={['Admin']}>
//        <AdminPage />
//      </ProtectedRoute>
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { isLoggedIn, hasRole } = useAuth()

  // Not logged in → redirect to login page
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role → show access denied
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

  // If children are passed, render them. Otherwise render the nested <Route> via <Outlet>.
  return children ? children : <Outlet />
}

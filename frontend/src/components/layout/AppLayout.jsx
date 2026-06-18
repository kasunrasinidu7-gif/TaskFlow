// src/components/layout/AppLayout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The main application layout used by all authenticated pages.
// Renders the Sidebar on the left and the page content on the right.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Sidebar from './Sidebar'
import { useNotifications } from '../../hooks/useNotifications'

export default function AppLayout({ children }) {
  const { unreadCount } = useNotifications()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <Sidebar unreadCount={unreadCount} />
      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-[220px] p-6 min-h-screen">
        {children}
      </main>
    </div>
  )
}

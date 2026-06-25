// src/components/layout/AppLayout.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The main application layout used by all authenticated pages.
// Renders the Sidebar on the left and the page content on the right.
// Also renders real-time notification toasts in the bottom-right corner.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import Sidebar from './Sidebar'
import { useNotifications } from '../../hooks/useNotifications'
import NotificationToast from '../ui/NotificationToast'

export default function AppLayout({ children }) {
  const { unreadCount, toasts, dismissToast } = useNotifications()

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <Sidebar unreadCount={unreadCount} />

      {/* Main content — offset by sidebar width */}
      <main className="flex-1 ml-[220px] p-6 min-h-screen">
        {children}
      </main>

      {/* ── Real-time notification toasts ────────────────────────────────────
          Renders a stack of popups in the bottom-right corner.
          Each toast auto-dismisses after 5s or can be closed manually. */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
          {toasts.map(toast => (
            <NotificationToast
              key={toast.toastId}
              notification={toast}
              onClose={() => dismissToast(toast.toastId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

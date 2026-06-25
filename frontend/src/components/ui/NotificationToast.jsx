// src/components/ui/NotificationToast.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Real-time notification popup toast.
// Appears in the bottom-right corner when a new notification arrives via Socket.io.
// Clicking the toast navigates to /notifications.
// Auto-dismisses after 5 seconds. Has a manual close button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function NotificationToast({ notification, onClose }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => handleClose(), 5000)
    return () => clearTimeout(t)
  }, [])

  function handleClose() {
    setLeaving(true)
    setTimeout(() => onClose(), 300)
  }

  function handleClick() {
    handleClose()
    navigate('/notifications')
  }

  return (
    <div
      style={{
        transform: visible && !leaving ? 'translateY(0)' : 'translateY(120%)',
        opacity: visible && !leaving ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
      }}
      className="flex items-start gap-3 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-[340px] cursor-pointer group"
      onClick={handleClick}
    >
      {/* Bell icon */}
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">
          New Notification
        </p>
        <p className="text-sm text-gray-800 leading-snug line-clamp-2">
          {notification.Message}
        </p>
        {notification.TaskTitle && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            Task: {notification.TaskTitle}
          </p>
        )}
        <p className="text-[10px] text-primary/70 mt-1.5 font-medium group-hover:underline">
          View all notifications →
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); handleClose() }}
        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors mt-0.5"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

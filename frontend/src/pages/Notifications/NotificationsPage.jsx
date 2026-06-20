// src/pages/Notifications/NotificationsPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Notifications Page — available to ALL roles.
// Shows all notifications for the current user.
// Real-time updates via Socket.io (handled inside useNotifications hook).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { timeAgo } from '../../utils/helpers'

// ── Notification item ─────────────────────────────────────────────────────────
function NotifItem({ notif, onRead, onNavigate }) {
  const isUnread = !notif.IsRead

  return (
    <div
      onClick={() => {
        if (isUnread) onRead(notif.NotificationID)
        if (notif.TaskID) onNavigate(`/tasks/${notif.TaskID}`)
      }}
      className={`flex items-start gap-4 p-4 rounded-[var(--radius-sm)] border transition-all cursor-pointer
        ${isUnread
          ? 'bg-purple-50 border-purple-200 hover:bg-purple-100/70'
          : 'bg-white border-gray-100 hover:bg-gray-50'
        }`}
    >
      {/* Unread indicator dot */}
      <div className="mt-1 flex-shrink-0">
        {isUnread
          ? <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          : <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        }
      </div>

      {/* Icon */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
        ${isUnread ? 'bg-primary/10' : 'bg-gray-100'}`}
      >
        <svg
          className={`w-4 h-4 ${isUnread ? 'text-primary' : 'text-gray-400'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </div>

      {/* Message and meta */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isUnread ? 'text-[var(--text-dark)] font-medium' : 'text-[var(--text-mid)]'}`}>
          {notif.Message}
        </p>
        {notif.TaskTitle && (
          <p className="text-xs text-[var(--text-light)] mt-0.5 truncate">
            Task: {notif.TaskTitle}
          </p>
        )}
        <p className="text-[10px] text-[var(--text-light)] mt-1">{timeAgo(notif.CreatedAt)}</p>
      </div>

      {/* Click-to-task arrow */}
      {notif.TaskID && (
        <svg className="w-4 h-4 text-[var(--text-light)] flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )
}

export default function NotificationsPage() {
  const navigate  = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  const unread = notifications.filter(n => !n.IsRead)
  const read   = notifications.filter(n =>  n.IsRead)

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text-dark)]">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center bg-primary text-white text-xs font-bold rounded-full w-5 h-5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </h1>
          <p className="text-[var(--text-light)] text-sm mt-0.5">
            {notifications.length === 0 ? 'No notifications yet' : `${notifications.length} total · ${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {notifications.length === 0 && (
        <EmptyState
          icon={
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          }
          title="No notifications yet"
          description="You'll be notified when tasks are assigned to you or when someone comments on your tasks."
        />
      )}

      {/* ── Unread notifications ─────────────────────────────────────────── */}
      {unread.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-light)] mb-3">
            New · {unread.length}
          </p>
          <div className="flex flex-col gap-2">
            {unread.map(n => (
              <NotifItem
                key={n.NotificationID}
                notif={n}
                onRead={markRead}
                onNavigate={navigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Read notifications ───────────────────────────────────────────── */}
      {read.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-light)] mb-3">
            Earlier · {read.length}
          </p>
          <div className="flex flex-col gap-2">
            {read.map(n => (
              <NotifItem
                key={n.NotificationID}
                notif={n}
                onRead={markRead}
                onNavigate={navigate}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

// src/hooks/useNotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Custom hook that manages notification state.
// Connects to Socket.io for real-time updates AND polls the REST API on load.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { io } from 'socket.io-client'
import { notificationAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'

export function useNotifications() {
  const { token } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount,   setUnreadCount]   = useState(0)
  const [socket,        setSocket]        = useState(null)

  // ── Fetch notifications from the REST API ─────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!token) return
    try {
      const res = await notificationAPI.getAll()
      setNotifications(res.data.data.notifications || [])
      setUnreadCount(res.data.data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    }
  }, [token])

  // ── Connect to Socket.io when logged in ───────────────────────────────────
  useEffect(() => {
    if (!token) return

    // Connect to the backend Socket.io server with the JWT in auth
    const s = io('/', {
      auth: { token: `Bearer ${token}` },
      path: '/socket.io',
    })

    s.on('connect', () => console.log('Socket connected'))
    s.on('connect_error', (err) => console.error('Socket error:', err.message))

    // When a new notification arrives in real time, prepend it to the list
    s.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev])
      setUnreadCount(prev => prev + 1)
    })

    setSocket(s)

    // Fetch initial notifications from REST API
    fetchNotifications()

    // Cleanup: disconnect socket when the component unmounts
    return () => { s.disconnect() }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mark a single notification as read ───────────────────────────────────
  async function markRead(id) {
    try {
      await notificationAPI.markRead(id)
      setNotifications(prev =>
        prev.map(n => n.NotificationID === id ? { ...n, IsRead: 1 } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('markRead error:', err)
    }
  }

  // ── Mark all as read ──────────────────────────────────────────────────────
  async function markAllRead() {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, IsRead: 1 })))
      setUnreadCount(0)
    } catch (err) {
      console.error('markAllRead error:', err)
    }
  }

  return { notifications, unreadCount, markRead, markAllRead, socket, fetchNotifications }
}

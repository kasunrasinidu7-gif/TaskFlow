// src/components/ui/Toast.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Simple toast notification system.
// Usage:
//   import { useToast } from './Toast'
//   const toast = useToast()
//   toast.success('Saved!')
//   toast.error('Something went wrong')
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const add = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    // Auto-remove after 3.5s
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const remove = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  const icons = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
  }
  const colors = {
    success: 'bg-green-500',
    error:   'bg-red-500',
    info:    'bg-primary',
  }

  return (
    <ToastContext.Provider value={{ success: (m) => add(m, 'success'), error: (m) => add(m, 'error'), info: (m) => add(m, 'info') }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] text-white text-sm shadow-lg pointer-events-auto
              animate-[slideIn_0.2s_ease] ${colors[t.type]}`}
            style={{ minWidth: '260px' }}
          >
            <span className="font-bold text-base">{icons[t.type]}</span>
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100 ml-2">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be inside ToastProvider')
  return ctx
}

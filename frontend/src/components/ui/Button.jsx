// src/components/ui/Button.jsx
// Reusable button component with variant styles matching the design system.

import React from 'react'

/**
 * Variants:
 *   primary  — filled purple (default)
 *   secondary — white with purple border
 *   danger   — red fill
 *   ghost    — transparent, subtle hover
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-primary text-white hover:bg-primary-900 active:bg-primary-900 focus:ring-primary',
    secondary: 'bg-white text-primary border border-primary hover:bg-primary-50 focus:ring-primary',
    danger:    'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400',
    ghost:     'bg-transparent text-[var(--text-mid)] hover:bg-purple-50 focus:ring-primary',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  }

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
}

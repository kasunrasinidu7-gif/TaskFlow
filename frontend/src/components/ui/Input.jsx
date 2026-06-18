// src/components/ui/Input.jsx
import React from 'react'

/**
 * Reusable labelled input / select / textarea.
 * Props:
 *   label, error, type, as ('input' | 'select' | 'textarea'), ...rest
 */
export default function Input({ label, error, as: Tag = 'input', children, className = '', ...props }) {
  const base = `w-full px-3 py-2 text-sm rounded-sm border transition-colors
    bg-white text-[var(--text-dark)] placeholder-[var(--text-light)]
    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
    ${error ? 'border-red-400' : 'border-purple-200 hover:border-purple-400'}`

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">
          {label}
        </label>
      )}
      <Tag className={`${base} ${className}`} {...props}>
        {children}
      </Tag>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

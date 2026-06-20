// src/components/ui/Spinner.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Reusable loading spinner and full-page loader.
//
// EXPORTS:
//   export function Spinner   → small inline spinner (named export)
//   export function PageLoader → centred full-page spinner (named export)
//   export default Spinner    → also exported as default for convenience
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'

/**
 * Spinner — animated SVG ring.
 * @param {string} size      - 'sm' | 'md' | 'lg'
 * @param {string} className - extra Tailwind classes
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <svg
      className={`animate-spin text-primary ${sizes[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v8z"
      />
    </svg>
  )
}

/**
 * PageLoader — centred spinner used while a page fetches its data.
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )
}

// Also export as default so both import styles work:
//   import Spinner from '...'          ✅
//   import { Spinner } from '...'      ✅
export default Spinner

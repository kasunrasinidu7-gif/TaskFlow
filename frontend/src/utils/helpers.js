// src/utils/helpers.js
// ─────────────────────────────────────────────────────────────────────────────
// Reusable helper functions shared across components.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format a date string into a human-readable format.
 * e.g. "2024-06-10" → "Jun 10, 2024"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/**
 * Format a date into a relative time string.
 * e.g. "2 hours ago", "3 days ago"
 */
export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (seconds < 60)   return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

/**
 * Returns Tailwind classes for task priority badges.
 */
export function priorityBadge(priority) {
  const map = {
    Low:      'bg-green-100 text-green-700',
    Medium:   'bg-yellow-100 text-yellow-700',
    High:     'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  }
  return map[priority] || 'bg-gray-100 text-gray-600'
}

/**
 * Returns Tailwind classes for task status badges.
 */
export function statusBadge(status) {
  const map = {
    'To Do':       'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Completed':   'bg-green-100 text-green-700',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

/**
 * Returns Tailwind classes for project status badges.
 */
export function projectStatusBadge(status) {
  const map = {
    'Active':    'bg-purple-100 text-purple-700',
    'On Hold':   'bg-yellow-100 text-yellow-700',
    'Completed': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-600',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

/**
 * Returns initials from a full name.
 * "John Doe" → "JD"
 */
export function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/**
 * Extracts an error message from an Axios error response.
 */
export function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'An unexpected error occurred'
}

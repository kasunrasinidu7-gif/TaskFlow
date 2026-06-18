// src/components/ui/EmptyState.jsx
import React from 'react'

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="font-display font-semibold text-[var(--text-dark)] text-lg mb-2">{title}</h3>
      {description && <p className="text-[var(--text-light)] text-sm max-w-xs mb-6">{description}</p>}
      {action && action}
    </div>
  )
}

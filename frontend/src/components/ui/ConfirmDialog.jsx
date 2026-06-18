// src/components/ui/ConfirmDialog.jsx
import React from 'react'
import Modal from './Modal'
import Button from './Button'

/**
 * A reusable confirmation dialog for destructive actions.
 * Props: isOpen, onClose, onConfirm, title, message, confirmLabel, loading
 */
export default function ConfirmDialog({
  isOpen, onClose, onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-[var(--text-mid)] mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

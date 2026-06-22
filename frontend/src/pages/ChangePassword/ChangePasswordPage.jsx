// src/pages/ChangePassword/ChangePasswordPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Forced password change screen shown after first login with a temporary password.
//
// ACCESS RULES:
//   - Only accessible when isLoggedIn = true AND requirePasswordChange = true.
//   - ProtectedRoute redirects here automatically for users with the flag set.
//   - After successful change, clearPasswordChangeFlag() navigates to /dashboard.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../api/services'
import Button from '../../components/ui/Button'
import { getErrorMessage } from '../../utils/helpers'

export default function ChangePasswordPage() {
  const { isLoggedIn, requirePasswordChange, user, clearPasswordChangeFlag, logout } = useAuth()

  const [form, setForm]     = useState({ CurrentPassword: '', NewPassword: '', ConfirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [apiErr, setApiErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false })

  // If not logged in at all, send to login
  if (!isLoggedIn) return <Navigate to="/login" replace />

  // If logged in but password change not required, send to dashboard
  if (!requirePasswordChange) return <Navigate to="/dashboard" replace />

  function validate() {
    const e = {}
    if (!form.CurrentPassword)                          e.CurrentPassword  = 'Current password is required'
    if (!form.NewPassword)                              e.NewPassword      = 'New password is required'
    else if (form.NewPassword.length < 6)               e.NewPassword      = 'Minimum 6 characters'
    else if (form.NewPassword === form.CurrentPassword) e.NewPassword      = 'New password must differ from the temporary one'
    if (form.NewPassword !== form.ConfirmPassword)      e.ConfirmPassword  = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setApiErr('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await authAPI.changeFirstPassword({
        CurrentPassword: form.CurrentPassword,
        NewPassword:     form.NewPassword,
      })
      // Update local state — clears the flag and navigates to dashboard
      clearPasswordChangeFlag()
    } catch (err) {
      setApiErr(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function EyeBtn({ field }) {
    return (
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPwd(p => ({ ...p, [field]: !p[field] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-light)] hover:text-[var(--text-dark)]"
      >
        {showPwd[field] ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        )}
      </button>
    )
  }

  function PwdField({ id, label, field, placeholder }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">{label}</label>
        <div className="relative">
          <input
            type={showPwd[field] ? 'text' : 'password'}
            placeholder={placeholder}
            value={form[id]}
            onChange={e => setForm(p => ({ ...p, [id]: e.target.value }))}
            className={`w-full px-3 py-2 pr-10 text-sm rounded-sm border transition-colors bg-white
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              ${errors[id] ? 'border-red-400' : 'border-purple-200 hover:border-purple-400'}`}
          />
          <EyeBtn field={field} />
        </div>
        {errors[id] && <p className="text-xs text-red-500">{errors[id]}</p>}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="font-display font-bold text-2xl text-[var(--text-dark)]">
            Task<span className="text-primary">Flow</span>
          </div>
        </div>

        <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-8">

          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex gap-3 items-start">
            <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-0.5">Action Required</p>
              <p className="text-xs text-amber-600">
                You are logged in with a temporary password. You must set a permanent password before accessing TaskFlow.
              </p>
            </div>
          </div>

          <h1 className="font-display font-semibold text-xl text-[var(--text-dark)] mb-1">
            Set Your Password
          </h1>
          <p className="text-[var(--text-light)] text-sm mb-6">
            Welcome, {user?.Name}. Choose a strong permanent password to continue.
          </p>

          {apiErr && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[var(--radius-sm)] text-red-600 text-sm">
              {apiErr}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PwdField
              id="CurrentPassword" field="current"
              label="Temporary Password (from your email)"
              placeholder="Paste your temporary password"
            />
            <PwdField
              id="NewPassword" field="new"
              label="New Password"
              placeholder="At least 6 characters"
            />
            <PwdField
              id="ConfirmPassword" field="confirm"
              label="Confirm New Password"
              placeholder="Repeat new password"
            />

            <Button type="submit" className="w-full mt-2" loading={loading}>
              Set Password &amp; Continue
            </Button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={logout}
              className="text-xs text-[var(--text-light)] hover:text-primary"
            >
              Sign out and log in as someone else
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

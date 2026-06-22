// src/pages/Login/LoginPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Login page — the first screen users see.
// Handles form validation, API call, and stores the JWT on success.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../api/services'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { getErrorMessage } from '../../utils/helpers'

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth()

  const [form,    setForm]    = useState({ Email: '', Password: '' })
  const [errors,  setErrors]  = useState({})
  const [apiErr,  setApiErr]  = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  // Already logged in → go straight to dashboard
  if (isLoggedIn) return <Navigate to="/dashboard" replace />

  function validate() {
    const e = {}
    if (!form.Email)                          e.Email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.Email)) e.Email   = 'Enter a valid email'
    if (!form.Password)                        e.Password = 'Password is required'
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
      const res = await authAPI.login(form)
      login(res.data.data.token, res.data.data.user)
    } catch (err) {
      setApiErr(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-page)' }}>
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] p-12"
        style={{ background: '#1a0a2e' }}
      >
        <div>
          <div className="font-display font-bold text-3xl text-white tracking-tight">
            Task<span className="text-primary-600">Flow</span>
          </div>
          <div className="text-[11px] text-white/30 uppercase tracking-widest mt-1">Management System</div>
        </div>

        <div>
          <h2 className="font-display font-semibold text-white text-3xl leading-tight mb-4">
            Collaborate,<br />track, and deliver<br />with clarity.
          </h2>
          <p className="text-white/40 text-sm leading-relaxed max-w-xs">
            Manage projects, assign tasks, and track progress — all in one unified workspace built for teams.
          </p>
        </div>

        {/* Decorative stat pills */}
        <div className="flex flex-col gap-3">
          {[
            { label: 'Projects Tracked', value: '∞' },
            { label: 'Role-based Access', value: '3 Roles' },
            { label: 'Real-time Updates', value: 'Live' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 bg-white/[0.05] rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-primary-600" />
              <span className="text-white/50 text-xs">{s.label}</span>
              <span className="ml-auto text-white text-xs font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <div className="font-display font-bold text-2xl text-[var(--text-dark)]">
              Task<span className="text-primary">Flow</span>
            </div>
          </div>

          <h1 className="font-display font-semibold text-2xl text-[var(--text-dark)] mb-1">
            Welcome back
          </h1>
          <p className="text-[var(--text-light)] text-sm mb-8">Sign in to your account</p>

          {/* API error banner */}
          {apiErr && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[var(--radius-sm)] text-red-600 text-sm">
              {apiErr}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={form.Email}
              onChange={e => setForm(p => ({ ...p, Email: e.target.value }))}
              error={errors.Email}
              autoComplete="email"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.Password}
                  onChange={e => setForm(p => ({ ...p, Password: e.target.value }))}
                  autoComplete="current-password"
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-sm border transition-colors
                    bg-white text-[var(--text-dark)] placeholder-[var(--text-light)]
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    ${errors.Password ? 'border-red-400' : 'border-purple-200 hover:border-purple-400'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-light)] hover:text-[var(--text-dark)]"
                  tabIndex={-1}
                >
                  {showPwd ? (
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
              </div>
              {errors.Password && <p className="text-xs text-red-500">{errors.Password}</p>}
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" loading={loading}>
              Sign in
            </Button>

            <div className="text-center mt-4">
              <Link
                to="/forgot-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot your password?
              </Link>
            </div>
          </form>

          <p className="text-center text-xs text-[var(--text-light)] mt-8">
            Default admin: <span className="font-mono text-primary">admin@taskflow.com</span>
          </p>
        </div>
      </div>
    </div>
  )
}

// src/pages/ForgotPassword/ForgotPasswordPage.jsx
//
// ADDED: "Resend Email" button on the success screen so users don't have
//   to go back and re-enter their email if the email didn't arrive.
//   Includes a 30-second cooldown timer to prevent spamming.

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../../api/services'
import Button from '../../components/ui/Button'
import Input  from '../../components/ui/Input'
import { getErrorMessage } from '../../utils/helpers'

const COOLDOWN_SECONDS = 30 //cooldown seconds

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState('')
  const [emailErr,  setEmailErr]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [apiErr,    setApiErr]    = useState('')

  // Resend state
  const [resending,  setResending]  = useState(false)
  const [resendMsg,  setResendMsg]  = useState('')
  const [resendErr,  setResendErr]  = useState('')
  const [cooldown,   setCooldown]   = useState(0) // seconds remaining

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  function validate() {
    if (!email)                       return 'Email is required'
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email address'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setApiErr('')
    const err = validate()
    if (err) { setEmailErr(err); return }
    setEmailErr('')
    setLoading(true)
    try {
      await authAPI.forgotPassword({ Email: email })
      setSubmitted(true)
      setCooldown(COOLDOWN_SECONDS)
    } catch (err) {
      setApiErr(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return
    setResendMsg('')
    setResendErr('')
    setResending(true)
    try {
      await authAPI.forgotPassword({ Email: email })
      setResendMsg('Email resent! Check your inbox and spam folder.')
      setCooldown(COOLDOWN_SECONDS)
    } catch (err) {
      setResendErr(getErrorMessage(err))
    } finally {
      setResending(false)
    }
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
          {submitted ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>

              <h2 className="font-display font-semibold text-lg text-[var(--text-dark)] mb-2">
                Check your inbox
              </h2>
              <p className="text-sm text-[var(--text-light)] mb-2">
                A temporary password has been sent to
              </p>
              <p className="text-sm font-semibold text-[var(--text-dark)] mb-4 break-all">
                {email}
              </p>
              <p className="text-xs text-[var(--text-light)] mb-6">
                Check your spam folder if you don't see it within a minute.
              </p>

              {/* Resend feedback messages */}
              {resendMsg && (
                <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✅ {resendMsg}
                </div>
              )}
              {resendErr && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {resendErr}
                </div>
              )}

              {/* Resend button with cooldown */}
              <div className="mb-6">
                <p className="text-xs text-[var(--text-light)] mb-2">
                  Didn't receive it?
                </p>
                <Button
                  onClick={handleResend}
                  loading={resending}
                  disabled={cooldown > 0 || resending}
                  variant="outline"
                  className="w-full"
                >
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : 'Resend Email'
                  }
                </Button>
              </div>

              <div className="border-t border-purple-50 pt-4">
                <Link to="/login" className="text-sm text-primary hover:underline font-medium">
                  ← Back to Login
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h1 className="font-display font-semibold text-xl text-[var(--text-dark)] mb-1">
                Forgot Password
              </h1>
              <p className="text-[var(--text-light)] text-sm mb-6">
                Enter your email and we'll send you a temporary password.
              </p>

              {apiErr && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-[var(--radius-sm)] text-red-600 text-sm">
                  {apiErr}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Email address"
                  type="text"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr('') }}
                  error={emailErr}
                  autoComplete="email"
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Send Temporary Password
                </Button>
              </form>

              <div className="text-center mt-6">
                <Link to="/login" className="text-xs text-[var(--text-light)] hover:text-primary">
                  ← Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
// src/pages/Profile/ProfilePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Profile Page — available to ALL roles.
// Users can update their name/email and change their password.
// Role is read-only — only Admins can change roles (via Users page).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { profileAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'
import { getInitials, getErrorMessage } from '../../utils/helpers'

// ── Role badge colours ─────────────────────────────────────────────────────
const roleBadge = {
  'Admin':           'bg-purple-100 text-purple-700',
  'Project Manager': 'bg-blue-100 text-blue-700',
  'Collaborator':    'bg-green-100 text-green-700',
}

// ── Card wrapper ──────────────────────────────────────────────────────────
function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-6">
      <div className="mb-5">
        <h2 className="font-display font-semibold text-[var(--text-dark)] text-base">{title}</h2>
        {subtitle && <p className="text-xs text-[var(--text-light)] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const { user, login, token } = useAuth()
  const toast = useToast()

  // ── Profile form state ────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({ Name: user?.Name || '', Email: user?.Email || '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [profileLoading, setProfileLoading] = useState(false)

  // ── Password form state ───────────────────────────────────────────────────
  const [pwdForm, setPwdForm] = useState({ CurrentPassword: '', NewPassword: '', ConfirmPassword: '' })
  const [pwdErrors, setPwdErrors] = useState({})
  const [pwdLoading, setPwdLoading] = useState(false)
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false })

  // ── Validate profile fields ───────────────────────────────────────────────
  function validateProfile() {
    const e = {}
    if (!profileForm.Name.trim())           e.Name  = 'Name is required'
    if (!profileForm.Email.trim())          e.Email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(profileForm.Email)) e.Email = 'Enter a valid email'
    return e
  }

  // ── Validate password fields ──────────────────────────────────────────────
  function validatePwd() {
    const e = {}
    if (!pwdForm.CurrentPassword)                     e.CurrentPassword = 'Current password is required'
    if (!pwdForm.NewPassword)                         e.NewPassword     = 'New password is required'
    else if (pwdForm.NewPassword.length < 6)          e.NewPassword     = 'Minimum 6 characters'
    if (pwdForm.NewPassword !== pwdForm.ConfirmPassword) e.ConfirmPassword = 'Passwords do not match'
    return e
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  async function handleProfileSave(e) {
    e.preventDefault()
    const errs = validateProfile()
    if (Object.keys(errs).length) { setProfileErrors(errs); return }
    setProfileErrors({})
    setProfileLoading(true)
    try {
      await profileAPI.update(profileForm)
      // Update the stored user object so the sidebar name updates instantly
      const updatedUser = { ...user, Name: profileForm.Name, Email: profileForm.Email }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      login(token, updatedUser)
      toast.success('Profile updated successfully')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setProfileLoading(false)
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  async function handlePasswordChange(e) {
    e.preventDefault()
    const errs = validatePwd()
    if (Object.keys(errs).length) { setPwdErrors(errs); return }
    setPwdErrors({})
    setPwdLoading(true)
    try {
      await profileAPI.changePassword({
        CurrentPassword: pwdForm.CurrentPassword,
        NewPassword:     pwdForm.NewPassword,
      })
      setPwdForm({ CurrentPassword: '', NewPassword: '', ConfirmPassword: '' })
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPwdLoading(false)
    }
  }

  // ── Password field toggle helper ──────────────────────────────────────────
  function EyeToggle({ field }) {
    return (
      <button
        type="button"
        onClick={() => setShowPwd(p => ({ ...p, [field]: !p[field] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-light)] hover:text-[var(--text-dark)]"
        tabIndex={-1}
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

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-[var(--text-dark)]">My Profile</h1>
        <p className="text-[var(--text-light)] text-sm mt-0.5">Manage your personal information and security</p>
      </div>

      {/* ── Avatar + role banner ─────────────────────────────────────────── */}
      <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-6 mb-5 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold font-display flex-shrink-0">
          {getInitials(user?.Name)}
        </div>
        <div>
          <h2 className="font-display font-semibold text-[var(--text-dark)] text-lg">{user?.Name}</h2>
          <p className="text-[var(--text-light)] text-sm">{user?.Email}</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5 ${roleBadge[user?.RoleName] || 'bg-gray-100 text-gray-600'}`}>
            {user?.RoleName}
          </span>
        </div>
      </div>

      {/* ── Edit profile form ────────────────────────────────────────────── */}
      <Card title="Personal Information" subtitle="Update your name and email address">
        <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
          <Input
            label="Full Name"
            placeholder="Your full name"
            value={profileForm.Name}
            onChange={e => setProfileForm(p => ({ ...p, Name: e.target.value }))}
            error={profileErrors.Name}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={profileForm.Email}
            onChange={e => setProfileForm(p => ({ ...p, Email: e.target.value }))}
            error={profileErrors.Email}
          />
          {/* Role is read-only */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">
              Role <span className="normal-case text-[var(--text-light)] font-normal">(read-only — contact Admin to change)</span>
            </label>
            <input
              type="text"
              value={user?.RoleName || ''}
              readOnly
              className="w-full px-3 py-2 text-sm rounded-sm border border-purple-100 bg-purple-50/50 text-[var(--text-mid)] cursor-not-allowed"
            />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" loading={profileLoading}>Save Changes</Button>
          </div>
        </form>
      </Card>

      {/* ── Change password form ─────────────────────────────────────────── */}
      <div className="mt-5">
        <Card title="Change Password" subtitle="Choose a strong password with at least 6 characters">
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">

            {/* Current password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">Current Password</label>
              <div className="relative">
                <input
                  type={showPwd.current ? 'text' : 'password'}
                  placeholder="Your current password"
                  value={pwdForm.CurrentPassword}
                  onChange={e => setPwdForm(p => ({ ...p, CurrentPassword: e.target.value }))}
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-sm border transition-colors bg-white
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    ${pwdErrors.CurrentPassword ? 'border-red-400' : 'border-purple-200 hover:border-purple-400'}`}
                />
                <EyeToggle field="current" />
              </div>
              {pwdErrors.CurrentPassword && <p className="text-xs text-red-500">{pwdErrors.CurrentPassword}</p>}
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">New Password</label>
              <div className="relative">
                <input
                  type={showPwd.new ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={pwdForm.NewPassword}
                  onChange={e => setPwdForm(p => ({ ...p, NewPassword: e.target.value }))}
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-sm border transition-colors bg-white
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    ${pwdErrors.NewPassword ? 'border-red-400' : 'border-purple-200 hover:border-purple-400'}`}
                />
                <EyeToggle field="new" />
              </div>
              {pwdErrors.NewPassword && <p className="text-xs text-red-500">{pwdErrors.NewPassword}</p>}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPwd.confirm ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={pwdForm.ConfirmPassword}
                  onChange={e => setPwdForm(p => ({ ...p, ConfirmPassword: e.target.value }))}
                  className={`w-full px-3 py-2 pr-10 text-sm rounded-sm border transition-colors bg-white
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                    ${pwdErrors.ConfirmPassword ? 'border-red-400' : 'border-purple-200 hover:border-purple-400'}`}
                />
                <EyeToggle field="confirm" />
              </div>
              {pwdErrors.ConfirmPassword && <p className="text-xs text-red-500">{pwdErrors.ConfirmPassword}</p>}
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={pwdLoading}>Update Password</Button>
            </div>
          </form>
        </Card>
      </div>

    </div>
  )
}

// src/components/layout/Sidebar.jsx
import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../utils/helpers'

const Icon = {
  Dashboard: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/>
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2"/>
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  Projects: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18"/>
    </svg>
  ),
  Tasks: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
    </svg>
  ),
  Bell: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
    </svg>
  ),
  Profile: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
    </svg>
  ),
  Kanban: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/>
    </svg>
  ),
  Logout: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
  ),
}

export default function Sidebar({ unreadCount = 0 }) {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all w-full text-left
     ${isActive
       ? 'bg-primary text-white'
       : 'text-white/55 hover:bg-white/10 hover:text-white/85'}`

  return (
    <aside
      className="fixed top-0 left-0 bottom-0 w-[220px] z-30 flex flex-col"
      style={{ background: '#1a0a2e' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.07]">
        <div className="font-display font-bold text-xl text-white tracking-tight">
          Task<span style={{ color: '#9b4dca' }}>Flow</span>
        </div>
        <div className="text-[10px] text-white/30 font-normal tracking-widest uppercase mt-0.5">
          Management System
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium px-2 pt-2 pb-1">
          Main
        </p>

        <NavLink to="/dashboard" className={navItemClass}>
          <Icon.Dashboard /><span>Dashboard</span>
        </NavLink>

        {/* Admin only */}
        {hasRole('Admin') && (
          <NavLink to="/users" className={navItemClass}>
            <Icon.Users /><span>Users</span>
          </NavLink>
        )}

        <NavLink to="/projects" className={navItemClass}>
          <Icon.Projects /><span>Projects</span>
        </NavLink>

        {/* ── FIX 1: Tasks visible to ALL roles ─────────────────────────────
            Previously: hasRole('Admin', 'Project Manager') — Collaborators hidden
            Now: all authenticated users see Tasks (backend still scopes their data) */}
        <NavLink to="/tasks" className={navItemClass}>
          <Icon.Tasks /><span>Tasks</span>
        </NavLink>

        <NavLink to="/kanban" className={navItemClass}>
          <Icon.Kanban /><span>Kanban Board</span>
        </NavLink>

        <p className="text-[10px] text-white/30 uppercase tracking-widest font-medium px-2 pt-4 pb-1">
          Personal
        </p>

        <NavLink to="/notifications" className={navItemClass}>
          <Icon.Bell />
          <span className="flex-1">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>

        <NavLink to="/profile" className={navItemClass}>
          <Icon.Profile /><span>Profile</span>
        </NavLink>
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-white/[0.07]">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold font-display flex-shrink-0">
            {getInitials(user?.Name)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.Name}</p>
            <p className="text-white/35 text-[10px] truncate">{user?.RoleName}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-white/55 hover:bg-white/10 hover:text-white/85 transition-all w-full text-sm"
        >
          <Icon.Logout /><span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

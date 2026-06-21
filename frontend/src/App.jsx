// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Root application component.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider }          from './context/AuthContext'
import { ToastProvider }         from './components/ui/Toast'
import ProtectedRoute            from './components/layout/ProtectedRoute'
import AppLayout                 from './components/layout/AppLayout'

import LoginPage                 from './pages/Login/LoginPage'
import ForgotPasswordPage        from './pages/ForgotPassword/ForgotPasswordPage'
import ChangePasswordPage        from './pages/ChangePassword/ChangePasswordPage'
import DashboardPage             from './pages/Dashboard/DashboardPage'
import UsersPage                 from './pages/Users/UsersPage'
import ProjectsPage              from './pages/Projects/ProjectsPage'
import ProjectDetailPage         from './pages/Projects/ProjectDetailPage'
import TasksPage                 from './pages/Tasks/TasksPage'
import TaskDetailPage            from './pages/TaskDetail/TaskDetailPage'
import ProfilePage               from './pages/Profile/ProfilePage'
import NotificationsPage         from './pages/Notifications/NotificationsPage'
import KanbanPage                from './pages/Kanban/KanbanPage'

export default function App() {
  return (
    // ToastProvider must wrap everything so any page can call useToast()
    // AuthProvider must also wrap everything so any page can call useAuth()
    <AuthProvider>
      <ToastProvider>
        <Routes>

          {/* ── Public routes ─────────────────────────────────────────── */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Change password — needs a JWT but bypasses ProtectedRoute's dashboard redirect */}
          <Route path="/change-password" element={<ChangePasswordPage />} />

          {/* ── Protected routes — require valid JWT ──────────────────── */}
          <Route element={<ProtectedRoute />}>

            {/* Dashboard — all roles */}
            <Route path="/dashboard" element={
              <AppLayout><DashboardPage /></AppLayout>
            } />

            {/* User Management — Admin only */}
            <Route path="/users" element={
              <ProtectedRoute roles={['Admin']}>
                <AppLayout><UsersPage /></AppLayout>
              </ProtectedRoute>
            } />

            {/* Projects — all roles */}
            <Route path="/projects" element={
              <AppLayout><ProjectsPage /></AppLayout>
            } />

            {/* Project Detail — all roles */}
            <Route path="/projects/:id" element={
              <AppLayout><ProjectDetailPage /></AppLayout>
            } />

            {/* Tasks — all roles */}
            <Route path="/tasks" element={
              <AppLayout><TasksPage /></AppLayout>
            } />

            {/* Task Detail — all roles */}
            <Route path="/tasks/:id" element={
              <AppLayout><TaskDetailPage /></AppLayout>
            } />

            {/* Kanban Board — all roles */}
            <Route path="/kanban" element={
              <AppLayout><KanbanPage /></AppLayout>
            } />

            {/* Profile — all roles */}
            <Route path="/profile" element={
              <AppLayout><ProfilePage /></AppLayout>
            } />

            {/* Notifications — all roles */}
            <Route path="/notifications" element={
              <AppLayout><NotificationsPage /></AppLayout>
            } />

          </Route>

          {/* ── Fallback routes ──────────────────────────────────────── */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}

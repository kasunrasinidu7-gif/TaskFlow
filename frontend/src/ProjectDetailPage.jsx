// src/pages/Projects/ProjectDetailPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Project Detail Page — accessible by all roles.
// Collaborators are scoped by the backend (403 if not a member).
// Shows: project info, member list, task list for this project.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { projectAPI, taskAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import {
  formatDate, priorityBadge, statusBadge,
  projectStatusBadge, getInitials, getErrorMessage,
} from '../../utils/helpers'

// ── Small card wrapper ────────────────────────────────────────────────────────
function Card({ title, children, action }) {
  return (
    <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-[var(--text-dark)] text-sm">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value, color = 'text-[var(--text-dark)]' }) {
  return (
    <div className="bg-purple-50/60 rounded-lg px-4 py-3 text-center">
      <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-light)] mt-0.5">{label}</p>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { hasRole } = useAuth()
  const toast     = useToast()

  const [project, setProject] = useState(null)
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [projRes, taskRes] = await Promise.all([
        projectAPI.getOne(id),
        taskAPI.getByProject(id),
      ])
      setProject(projRes.data.data)
      setTasks(taskRes.data.data)
    } catch (err) {
      toast.error(getErrorMessage(err))
      navigate('/projects')   // Redirect if access denied or not found
    } finally {
      setLoading(false)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <PageLoader />

  // ── Task stats derived from the task list ──────────────────────────────────
  const todo       = tasks.filter(t => t.Status === 'To Do').length
  const inProgress = tasks.filter(t => t.Status === 'In Progress').length
  const completed  = tasks.filter(t => t.Status === 'Completed').length
  const overdue    = tasks.filter(t =>
    t.DueDate && new Date(t.DueDate) < new Date() && t.Status !== 'Completed'
  ).length

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 rounded-lg text-[var(--text-light)] hover:bg-purple-100 hover:text-[var(--text-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-xl text-[var(--text-dark)]">
              {project.ProjectName}
            </h1>
            <Badge className={projectStatusBadge(project.Status)}>{project.Status}</Badge>
          </div>
          <p className="text-[var(--text-light)] text-xs mt-0.5">
            Created by {project.CreatorName} · {formatDate(project.CreatedAt)}
          </p>
        </div>
        {/* Admins and PMs can jump to task management for this project */}
        {hasRole('Admin', 'Project Manager') && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/tasks?projectId=${id}`)}
          >
            Manage Tasks
          </Button>
        )}
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat label="To Do"       value={todo}       />
        <Stat label="In Progress" value={inProgress} color="text-blue-600" />
        <Stat label="Completed"   value={completed}  color="text-green-600" />
        <Stat label="Overdue"     value={overdue}    color={overdue > 0 ? 'text-red-500' : 'text-[var(--text-dark)]'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Tasks list ──────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card title={`Tasks (${tasks.length})`}>
            {tasks.length === 0 ? (
              <p className="text-[var(--text-light)] text-sm italic text-center py-4">
                No tasks in this project yet.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-purple-50">
                {tasks.map(t => (
                  <div
                    key={t.TaskID}
                    className="flex items-center gap-3 py-3 cursor-pointer hover:bg-purple-50/40 -mx-2 px-2 rounded transition-colors"
                    onClick={() => navigate(`/tasks/${t.TaskID}`)}
                  >
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      t.Status === 'Completed'  ? 'bg-green-500' :
                      t.Status === 'In Progress' ? 'bg-blue-500' : 'bg-gray-300'
                    }`} />

                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        t.Status === 'Completed'
                          ? 'text-[var(--text-light)] line-through'
                          : 'text-[var(--text-dark)]'
                      }`}>
                        {t.Title}
                      </p>
                      {t.AssignedUsers && (
                        <p className="text-[10px] text-[var(--text-light)] truncate">
                          Assigned: {t.AssignedUsers}
                        </p>
                      )}
                    </div>

                    {/* Priority badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${priorityBadge(t.Priority)}`}>
                      {t.Priority}
                    </span>

                    {/* Due date */}
                    {t.DueDate && (
                      <span className={`text-[10px] flex-shrink-0 ${
                        new Date(t.DueDate) < new Date() && t.Status !== 'Completed'
                          ? 'text-red-500 font-medium'
                          : 'text-[var(--text-light)]'
                      }`}>
                        {formatDate(t.DueDate)}
                      </span>
                    )}

                    {/* Arrow */}
                    <svg className="w-3.5 h-3.5 text-[var(--text-light)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: project info + members ─────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Description */}
          <Card title="About">
            <p className="text-sm text-[var(--text-mid)] leading-relaxed">
              {project.Description || (
                <span className="text-[var(--text-light)] italic">No description provided.</span>
              )}
            </p>
          </Card>

          {/* Members */}
          <Card title={`Members (${project.members?.length || 0})`}>
            {!project.members?.length ? (
              <p className="text-[var(--text-light)] text-sm italic">No members assigned.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {project.members.map(m => (
                  <div key={m.UserID} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold font-display flex items-center justify-center flex-shrink-0">
                      {getInitials(m.Name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-dark)] truncate">{m.Name}</p>
                      <p className="text-[10px] text-[var(--text-light)]">{m.RoleName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}

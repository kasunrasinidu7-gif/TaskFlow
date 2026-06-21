// src/pages/Dashboard/DashboardPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — analytics overview.
// No search or filtering per SRS — quick overview only.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import { formatDate, priorityBadge, statusBadge, getErrorMessage } from '../../utils/helpers'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent, sub }) {
  return (
    <div className="bg-white rounded-[var(--radius)] p-5 shadow-sm border border-purple-50 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-[var(--text-light)] text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="font-display font-bold text-2xl text-[var(--text-dark)] mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-[var(--text-light)] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-[var(--text-mid)] font-medium">{label}</span>
        <span className="text-[var(--text-light)]">
          {value} <span className="opacity-60">/ {total}</span>
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-[10px] text-[var(--text-light)] mt-0.5">{pct}%</p>
    </div>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────
// Pure SVG — no extra library needed.
// FIX: The previous version had a broken <text> rotation that showed "0112"
// instead of the actual total. This version uses two separate <text> elements
// positioned correctly without any rotation transform.
function DonutChart({ segments, label }) {
  const r            = 38
  const size         = 120
  const cx           = size / 2
  const cy           = size / 2
  const strokeWidth  = 14
  const circumference = 2 * Math.PI * r

  // Convert values to numbers (MySQL returns strings)
  const normalized = segments.map(s => ({ ...s, value: parseInt(s.value, 10) || 0 }))
  const total      = normalized.reduce((sum, s) => sum + s.value, 0)

  // Build arc segments
  let offset = 0
  const arcs = normalized.map(seg => {
    const pct   = total > 0 ? seg.value / total : 0
    const dash  = pct * circumference
    const arc   = { ...seg, dash, gap: circumference - dash, offset }
    offset += dash
    return arc
  })

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Coloured segments — start from top (rotate -90deg) */}
        <g style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}>
          {arcs.map((arc, i) => (
            arc.value > 0 && (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
              />
            )
          ))}
        </g>
        {/* Centre total — NO rotation, just plain centered text */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '20px', fontWeight: 700, fill: '#1a0a2e', fontFamily: 'Outfit, sans-serif' }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '9px', fill: '#9882b0', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {label}
        </text>
      </svg>
    </div>
  )
}

// ── Legend item ───────────────────────────────────────────────────────────────
function LegendItem({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-[var(--text-mid)] flex-1">{label}</span>
      <span className="text-xs font-semibold text-[var(--text-dark)]">{value ?? 0}</span>
    </div>
  )
}

export default function DashboardPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    dashboardAPI.getStats()
      .then(r  => setData(r.data.data))
      .catch(e => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  if (loading) return <PageLoader />

  // Safely parse all values as integers (MySQL returns strings)
  const t  = data?.tasks    || {}
  const p  = data?.projects || {}
  const taskTotal      = parseInt(t.total,      10) || 0
  const taskCompleted  = parseInt(t.completed,  10) || 0
  const taskInProgress = parseInt(t.inProgress, 10) || 0
  const taskTodo       = parseInt(t.todo,        10) || 0
  const taskOverdue    = parseInt(t.overdue,     10) || 0
  const projTotal      = parseInt(p.total,      10) || 0
  const projActive     = parseInt(p.active,     10) || 0
  const projCompleted  = parseInt(p.completed,  10) || 0
  const projOnHold     = parseInt(p.onHold,     10) || 0
  const projCancelled  = parseInt(p.cancelled,  10) || 0

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-7">
        <h1 className="font-display font-bold text-2xl text-[var(--text-dark)]">
          {greeting}, {user?.Name?.split(' ')[0]} 👋
        </h1>
        <p className="text-[var(--text-light)] text-sm mt-1">
          Here's what's happening across your workspace today.
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* ── Stat cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Projects" value={projTotal}
              icon="📁" accent="bg-purple-50"
              sub={`${projActive} active`}
            />
            <StatCard
              label="Total Tasks" value={taskTotal}
              icon="📋" accent="bg-blue-50"
              sub={`${taskTodo} to do`}
            />
            <StatCard
              label="Completed Tasks" value={taskCompleted}
              icon="✅" accent="bg-green-50"
              sub={taskTotal > 0 ? `${Math.round((taskCompleted / taskTotal) * 100)}% done` : '0% done'}
            />
            <StatCard
              label="Overdue Tasks" value={taskOverdue}
              icon="⚠️" accent="bg-red-50"
              sub={taskOverdue > 0 ? 'Needs attention' : 'All on track'}
            />
          </div>

          {/* ── Charts row ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

            {/* Task status donut */}
            <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-5">
              <h3 className="font-display font-semibold text-[var(--text-dark)] text-sm mb-4">
                Task Status
              </h3>
              <div className="flex items-center gap-5">
                <DonutChart
                  label="tasks"
                  segments={[
                    { value: taskTodo,       color: '#d1d5db' },
                    { value: taskInProgress, color: '#3b82f6' },
                    { value: taskCompleted,  color: '#22c55e' },
                  ]}
                />
                <div className="flex flex-col gap-2.5 flex-1">
                  <LegendItem color="#d1d5db" label="To Do"       value={taskTodo} />
                  <LegendItem color="#3b82f6" label="In Progress" value={taskInProgress} />
                  <LegendItem color="#22c55e" label="Completed"   value={taskCompleted} />
                </div>
              </div>
            </div>

            {/* Project status donut — all 4 statuses */}
            <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-5">
              <h3 className="font-display font-semibold text-[var(--text-dark)] text-sm mb-4">
                Project Status
              </h3>
              <div className="flex items-center gap-5">
                <DonutChart
                  label="projects"
                  segments={[
                    { value: projActive,    color: '#9b4dca' },
                    { value: projCompleted, color: '#22c55e' },
                    { value: projOnHold,    color: '#f59e0b' },
                    { value: projCancelled, color: '#ef4444' },
                  ]}
                />
                <div className="flex flex-col gap-2.5 flex-1">
                  <LegendItem color="#9b4dca" label="Active"    value={projActive} />
                  <LegendItem color="#22c55e" label="Completed" value={projCompleted} />
                  <LegendItem color="#f59e0b" label="On Hold"   value={projOnHold} />
                  <LegendItem color="#ef4444" label="Cancelled" value={projCancelled} />
                </div>
              </div>
            </div>

            {/* Progress bars */}
            <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-5">
              <h3 className="font-display font-semibold text-[var(--text-dark)] text-sm mb-4">
                Progress Overview
              </h3>
              <div className="flex flex-col gap-4">
                <ProgressBar
                  label="Tasks Completed"
                  value={taskCompleted} total={taskTotal}
                  color="bg-green-500"
                />
                <ProgressBar
                  label="Tasks In Progress"
                  value={taskInProgress} total={taskTotal}
                  color="bg-blue-500"
                />
                <ProgressBar
                  label="Projects Completed"
                  value={projCompleted} total={projTotal}
                  color="bg-purple-500"
                />
                <ProgressBar
                  label="Projects Active"
                  value={projActive} total={projTotal}
                  color="bg-amber-400"
                />
              </div>
            </div>
          </div>

          {/* ── Recent tasks ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50">
            <div className="px-6 py-4 border-b border-purple-50 flex items-center justify-between">
              <h2 className="font-display font-semibold text-[var(--text-dark)]">Recent Tasks</h2>
              <button
                onClick={() => navigate('/tasks')}
                className="text-xs text-primary hover:underline font-medium"
              >
                View all →
              </button>
            </div>

            {!data.recentTasks?.length ? (
              <div className="py-12 text-center text-[var(--text-light)] text-sm">
                No tasks yet
              </div>
            ) : (
              <div className="divide-y divide-purple-50">
                {data.recentTasks.map(task => (
                  <div
                    key={task.TaskID}
                    className="flex items-center gap-4 px-6 py-3.5 hover:bg-purple-50/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tasks/${task.TaskID}`)}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.Status === 'Completed'   ? 'bg-green-500' :
                      task.Status === 'In Progress' ? 'bg-blue-500'  : 'bg-gray-300'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-dark)] truncate">{task.Title}</p>
                      <p className="text-xs text-[var(--text-light)] mt-0.5">{task.ProjectName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={priorityBadge(task.Priority)}>{task.Priority}</Badge>
                      <Badge className={statusBadge(task.Status)}>{task.Status}</Badge>
                      <span className="text-xs text-[var(--text-light)] hidden md:block">
                        {formatDate(task.DueDate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

// src/pages/Kanban/KanbanPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Kanban Board
//
// CHANGED BEHAVIOUR:
//   Admin        — Kanban removed; redirected to /dashboard.
//   Project Manager / Collaborator — on mount, ALL tasks assigned to them
//     across every project are loaded automatically. The project dropdown
//     filters those tasks client-side (no extra fetch). Selecting "All
//     Projects" shows everything again.
//
// Real-time Socket.io updates still work: when any task in any of the user's
// projects is moved, the board updates live.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { taskAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { formatDate, priorityBadge, getInitials, getErrorMessage } from '../../utils/helpers'

// ── Column configuration ──────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'To Do',       label: 'To Do',       color: 'bg-gray-100',  headerColor: 'bg-gray-200 text-gray-700',  dot: 'bg-gray-400'  },
  { id: 'In Progress', label: 'In Progress',  color: 'bg-blue-50',   headerColor: 'bg-blue-100 text-blue-700',  dot: 'bg-blue-500'  },
  { id: 'Completed',   label: 'Completed',    color: 'bg-green-50',  headerColor: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
]

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, index, onClick }) {
  return (
    <Draggable draggableId={String(task.TaskID)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white rounded-xl border p-3.5 cursor-pointer select-none transition-all
            ${snapshot.isDragging
              ? 'shadow-lg border-primary/40 rotate-1 scale-[1.02]'
              : 'shadow-sm border-gray-100 hover:shadow-md hover:border-purple-200'
            }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge(task.Priority)}`}>
              {task.Priority}
            </span>
            {task.DueDate && (
              <span className={`text-[10px] ${
                new Date(task.DueDate) < new Date() && task.Status !== 'Completed'
                  ? 'text-red-500 font-semibold' : 'text-gray-400'
              }`}>
                {formatDate(task.DueDate)}
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">{task.Title}</p>
          <p className="text-[10px] text-gray-400 mb-3 truncate">{task.ProjectName}</p>

          {task.AssignedUsers && (
            <div className="flex items-center gap-1 flex-wrap">
              {task.AssignedUsers.split(', ').slice(0, 3).map((name, i) => (
                <div key={i} title={name}
                  className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">
                  {getInitials(name)}
                </div>
              ))}
              {task.AssignedUsers.split(', ').length > 3 && (
                <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center">
                  +{task.AssignedUsers.split(', ').length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────
function Column({ column, tasks, onTaskClick }) {
  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[340px]">
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 ${column.headerColor}`}>
        <div className={`w-2 h-2 rounded-full ${column.dot}`} />
        <span className="font-display font-semibold text-sm">{column.label}</span>
        <span className="ml-auto text-xs font-bold opacity-60">{tasks.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-xl p-2 flex flex-col gap-2 min-h-[400px] transition-colors
              ${snapshot.isDraggingOver ? 'bg-purple-50/60 ring-2 ring-primary/20' : column.color}`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.TaskID}
                task={task}
                index={index}
                onClick={() => onTaskClick(task.TaskID)}
              />
            ))}
            {provided.placeholder}
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-xs text-gray-400 italic">Drop tasks here</p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

// ── Main KanbanPage ───────────────────────────────────────────────────────────
export default function KanbanPage() {
  const { hasRole }    = useAuth()
  const { socket }     = useNotifications()
  const toast          = useToast()

  // Admin has no Kanban — redirect to dashboard
  if (hasRole('Admin')) return <Navigate to="/dashboard" replace />

  // All tasks fetched from backend (across all projects)
  const [allTasks,         setAllTasks]         = useState([])
  // The project filter value — '' means "All Projects"
  const [selectedProject,  setSelectedProject]  = useState('')
  // Derived columns after applying project filter
  const [columns,          setColumns]          = useState({ 'To Do': [], 'In Progress': [], 'Completed': [] })
  const [loading,          setLoading]          = useState(true)
  const joinedRoomsRef = useRef(new Set())

  // ── Distribute tasks into columns ─────────────────────────────────────────
  function buildColumns(tasks) {
    return {
      'To Do':       tasks.filter(t => t.Status === 'To Do'),
      'In Progress': tasks.filter(t => t.Status === 'In Progress'),
      'Completed':   tasks.filter(t => t.Status === 'Completed'),
    }
  }

  // ── Load all assigned tasks on mount ──────────────────────────────────────
  useEffect(() => {
    taskAPI.getMyTasks()
      .then(res => {
        const tasks = res.data.data || []
        setAllTasks(tasks)
        setColumns(buildColumns(tasks))
      })
      .catch(() => toast.error('Failed to load your tasks'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join socket rooms for all projects the user has tasks in ──────────────
  useEffect(() => {
    if (!socket || allTasks.length === 0) return
    const projectIds = [...new Set(allTasks.map(t => t.ProjectID))]
    projectIds.forEach(pid => {
      if (!joinedRoomsRef.current.has(pid)) {
        socket.emit('join_project_room', pid)
        joinedRoomsRef.current.add(pid)
      }
    })
    return () => {
      joinedRoomsRef.current.forEach(pid => socket.emit('leave_project_room', pid))
      joinedRoomsRef.current.clear()
    }
  }, [socket, allTasks])

  // ── Apply project filter client-side whenever selection changes ───────────
  useEffect(() => {
    const filtered = selectedProject
      ? allTasks.filter(t => String(t.ProjectID) === String(selectedProject))
      : allTasks
    setColumns(buildColumns(filtered))
  }, [selectedProject, allTasks])

  // ── Real-time: listen for task_updated from Socket.io ────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('task_updated', (updatedTask) => {
      setAllTasks(prev => {
        // Only care about tasks already in our list (assigned to us)
        const exists = prev.some(t => t.TaskID === updatedTask.TaskID)
        if (!exists) return prev
        return prev.map(t => t.TaskID === updatedTask.TaskID ? { ...t, ...updatedTask } : t)
      })
    })
    return () => { socket.off('task_updated') }
  }, [socket])

  // ── Drag end handler ──────────────────────────────────────────────────────
  async function onDragEnd(result) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceCol  = source.droppableId
    const destCol    = destination.droppableId
    const taskId     = parseInt(draggableId)
    const movingTask = columns[sourceCol].find(t => t.TaskID === taskId)
    if (!movingTask) return

    // Optimistic UI update
    const updatedTask  = { ...movingTask, Status: destCol }
    const newColumns   = { ...columns }
    const sourceList   = [...newColumns[sourceCol]]
    const destList     = sourceCol === destCol ? sourceList : [...newColumns[destCol]]

    sourceList.splice(source.index, 1)
    if (sourceCol === destCol) {
      sourceList.splice(destination.index, 0, updatedTask)
      newColumns[sourceCol] = sourceList
    } else {
      destList.splice(destination.index, 0, updatedTask)
      newColumns[sourceCol] = sourceList
      newColumns[destCol]   = destList
    }
    setColumns(newColumns)

    // Also update allTasks so the filter stays consistent
    setAllTasks(prev => prev.map(t => t.TaskID === taskId ? updatedTask : t))

    try {
      await taskAPI.updateStatus(taskId, destCol)
      if (socket) socket.emit('task_updated', updatedTask)
    } catch (err) {
      toast.error(getErrorMessage(err))
      // Rollback
      taskAPI.getMyTasks().then(res => {
        const tasks = res.data.data || []
        setAllTasks(tasks)
        const filtered = selectedProject
          ? tasks.filter(t => String(t.ProjectID) === String(selectedProject))
          : tasks
        setColumns(buildColumns(filtered))
      })
    }
  }

  function handleTaskClick(taskId) {
    window.location.href = `/tasks/${taskId}`
  }

  // ── Derive project list from loaded tasks for the dropdown ────────────────
  const projectOptions = [...new Map(
    allTasks.map(t => [t.ProjectID, { id: t.ProjectID, name: t.ProjectName }])
  ).values()]

  const totalVisible = Object.values(columns).reduce((sum, col) => sum + col.length, 0)

  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text-dark)]">Kanban Board</h1>
          <p className="text-[var(--text-light)] text-sm mt-0.5">
            {loading
              ? 'Loading your tasks…'
              : `${totalVisible} task${totalVisible !== 1 ? 's' : ''}${selectedProject ? ' in this project' : ' across all your projects'} · drag cards to update status`}
          </p>
        </div>

        {/* Project filter dropdown */}
        <div className="flex items-center gap-3">
          {socket && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          )}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px]"
            disabled={loading}
          >
            <option value="">— All Projects —</option>
            {projectOptions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <PageLoader />
      ) : allTasks.length === 0 ? (
        // Empty state — user has no assigned tasks at all
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <p className="text-[var(--text-mid)] font-medium">No tasks assigned to you yet</p>
            <p className="text-[var(--text-light)] text-sm mt-1">Tasks assigned to you will appear here</p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
            {COLUMNS.map(col => (
              <Column
                key={col.id}
                column={col}
                tasks={columns[col.id]}
                onTaskClick={handleTaskClick}
              />
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  )
}

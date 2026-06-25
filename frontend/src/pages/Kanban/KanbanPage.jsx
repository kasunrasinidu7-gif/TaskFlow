// src/pages/Kanban/KanbanPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Kanban Board — Drag-and-drop task management with real-time updates.
//
// CHANGED BEHAVIOUR:
//   Admin:
//     Same as before — selects a project from dropdown to load its tasks.
//
//   Project Manager / Collaborator:
//     On mount, ALL tasks assigned to the logged-in user are loaded
//     automatically across all projects. No empty state on first load.
//     A project filter dropdown lets them narrow the board to one project
//     client-side (no extra API call needed).
//
// HOW DRAG & DROP WORKS (unchanged):
//   1. Cards are sorted into 3 columns: "To Do" | "In Progress" | "Completed"
//   2. Drag to new column → optimistic UI update + PATCH /tasks/:id/status
//   3. Socket.io emits 'task_updated' for real-time sync across users
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { projectAPI, taskAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { formatDate, priorityBadge, getInitials, getErrorMessage } from '../../utils/helpers'

// ── Column configuration ──────────────────────────────────────────────────────
const COLUMNS = [
  {
    id:          'To Do',
    label:       'To Do',
    color:       'bg-gray-100',
    headerColor: 'bg-gray-200 text-gray-700',
    dot:         'bg-gray-400',
  },
  {
    id:          'In Progress',
    label:       'In Progress',
    color:       'bg-blue-50',
    headerColor: 'bg-blue-100 text-blue-700',
    dot:         'bg-blue-500',
  },
  {
    id:          'Completed',
    label:       'Completed',
    color:       'bg-green-50',
    headerColor: 'bg-green-100 text-green-700',
    dot:         'bg-green-500',
  },
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
          {/* Priority + due date */}
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${priorityBadge(task.Priority)}`}>
              {task.Priority}
            </span>
            {task.DueDate && (
              <span className={`text-[10px] ${
                new Date(task.DueDate) < new Date() && task.Status !== 'Completed'
                  ? 'text-red-500 font-semibold'
                  : 'text-gray-400'
              }`}>
                {formatDate(task.DueDate)}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-gray-800 leading-snug mb-1">
            {task.Title}
          </p>

          {/* Project name — helpful when viewing all projects */}
          <p className="text-[10px] text-purple-400 font-medium mb-3 truncate">
            {task.ProjectName}
          </p>

          {/* Assignee avatars */}
          {task.AssignedUsers && (
            <div className="flex items-center gap-1 flex-wrap">
              {task.AssignedUsers.split(', ').slice(0, 3).map((name, i) => (
                <div
                  key={i}
                  title={name}
                  className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center"
                >
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
  const { hasRole, user }  = useAuth()
  const { socket }         = useNotifications()
  const toast              = useToast()

  const isAdmin = hasRole('Admin')

  // All tasks fetched from API (full unfiltered set for PM/Collaborator)
  const [allTasks,        setAllTasks]        = useState([])

  // For Admin: which project is selected
  const [selectedProject, setSelectedProject] = useState('')

  // For PM/Collaborator: which project filter is active ('' = show all)
  const [projectFilter,   setProjectFilter]   = useState('')

  // Derived project list for the filter dropdown (built from allTasks)
  const [myProjects,      setMyProjects]      = useState([])

  // Admin project list (fetched separately)
  const [adminProjects,   setAdminProjects]   = useState([])

  // Kanban column state — always what's displayed on the board
  const [columns,         setColumns]         = useState({ 'To Do': [], 'In Progress': [], 'Completed': [] })

  const [loading,         setLoading]         = useState(false)
  const [adminProjectsLoading, setAdminProjectsLoading] = useState(false)

  const prevProjectRef = useRef(null)

  // ── Distribute tasks into columns ─────────────────────────────────────────
  function distributeToColumns(tasks) {
    return {
      'To Do':       tasks.filter(t => t.Status === 'To Do'),
      'In Progress': tasks.filter(t => t.Status === 'In Progress'),
      'Completed':   tasks.filter(t => t.Status === 'Completed'),
    }
  }

  // ── Admin: load project list on mount ────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return
    setAdminProjectsLoading(true)
    projectAPI.getAll()
      .then(res => setAdminProjects(res.data.data || []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setAdminProjectsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Admin: load tasks when a project is selected ──────────────────────────
  const loadAdminTasks = useCallback(async (projectId) => {
    if (!projectId) return
    setLoading(true)
    try {
      const res   = await taskAPI.getByProject(projectId)
      const tasks = res.data.data || []
      setColumns(distributeToColumns(tasks))
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAdmin || !selectedProject) return
    loadAdminTasks(selectedProject)

    if (socket) {
      if (prevProjectRef.current) socket.emit('leave_project_room', prevProjectRef.current)
      socket.emit('join_project_room', selectedProject)
      prevProjectRef.current = selectedProject
    }

    return () => {
      if (socket && selectedProject) socket.emit('leave_project_room', selectedProject)
    }
  }, [selectedProject, socket, loadAdminTasks, isAdmin])

  // ── PM / Collaborator: load ALL assigned tasks on mount ──────────────────
  useEffect(() => {
    if (isAdmin) return
    setLoading(true)
    taskAPI.getMyTasks()
      .then(res => {
        const tasks = res.data.data || []
        setAllTasks(tasks)

        // Build a unique project list from the tasks for the filter dropdown
        const seen = new Map()
        tasks.forEach(t => {
          if (!seen.has(t.ProjectID)) seen.set(t.ProjectID, t.ProjectName)
        })
        setMyProjects([...seen.entries()].map(([id, name]) => ({ ProjectID: id, ProjectName: name })))

        // Show all tasks on first load
        setColumns(distributeToColumns(tasks))
      })
      .catch(err => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── PM / Collaborator: re-filter when projectFilter changes ──────────────
  useEffect(() => {
    if (isAdmin) return
    const filtered = projectFilter
      ? allTasks.filter(t => String(t.ProjectID) === String(projectFilter))
      : allTasks
    setColumns(distributeToColumns(filtered))
  }, [projectFilter, allTasks, isAdmin])

  // ── Real-time: task_updated from Socket.io ────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('task_updated', (updatedTask) => {
      setColumns(prev => {
        const next = {
          'To Do':       prev['To Do'].filter(t => t.TaskID !== updatedTask.TaskID),
          'In Progress': prev['In Progress'].filter(t => t.TaskID !== updatedTask.TaskID),
          'Completed':   prev['Completed'].filter(t => t.TaskID !== updatedTask.TaskID),
        }
        next[updatedTask.Status] = [...next[updatedTask.Status], updatedTask]
        return next
      })
    })
    return () => { socket.off('task_updated') }
  }, [socket])

  // ── Drag end ──────────────────────────────────────────────────────────────
  async function onDragEnd(result) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceCol  = source.droppableId
    const destCol    = destination.droppableId
    const taskId     = parseInt(draggableId)
    const movingTask = columns[sourceCol].find(t => t.TaskID === taskId)
    if (!movingTask) return

    // Optimistic update
    const newColumns = { ...columns }
    const sourceList = [...newColumns[sourceCol]]
    const destList   = sourceCol === destCol ? sourceList : [...newColumns[destCol]]

    sourceList.splice(source.index, 1)
    const updatedTask = { ...movingTask, Status: destCol }

    if (sourceCol === destCol) {
      sourceList.splice(destination.index, 0, updatedTask)
      newColumns[sourceCol] = sourceList
    } else {
      destList.splice(destination.index, 0, updatedTask)
      newColumns[sourceCol] = sourceList
      newColumns[destCol]   = destList
    }
    setColumns(newColumns)

    // Also update allTasks so filter re-application stays consistent
    if (!isAdmin) {
      setAllTasks(prev => prev.map(t => t.TaskID === taskId ? { ...t, Status: destCol } : t))
    }

    try {
      await taskAPI.updateStatus(taskId, destCol)
      if (socket) socket.emit('task_updated', updatedTask)
    } catch (err) {
      toast.error(getErrorMessage(err))
      // Rollback
      if (isAdmin) loadAdminTasks(selectedProject)
      else {
        const rollback = projectFilter
          ? allTasks.filter(t => String(t.ProjectID) === String(projectFilter))
          : allTasks
        setColumns(distributeToColumns(rollback))
      }
    }
  }

  function handleTaskClick(taskId) {
    window.location.href = `/tasks/${taskId}`
  }

  const totalTasks = Object.values(columns).reduce((sum, col) => sum + col.length, 0)

  // ── Subtitle text ─────────────────────────────────────────────────────────
  function subtitle() {
    if (isAdmin) {
      return selectedProject
        ? `${totalTasks} task${totalTasks !== 1 ? 's' : ''} · drag cards to update status`
        : 'Select a project to view its Kanban board'
    }
    if (projectFilter) {
      const name = myProjects.find(p => String(p.ProjectID) === String(projectFilter))?.ProjectName
      return `${totalTasks} task${totalTasks !== 1 ? 's' : ''} in ${name} · drag cards to update status`
    }
    return `${totalTasks} task${totalTasks !== 1 ? 's' : ''} across all your projects · drag cards to update status`
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text-dark)]">Kanban Board</h1>
          <p className="text-[var(--text-light)] text-sm mt-0.5">{subtitle()}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Live indicator */}
          {socket && (isAdmin ? selectedProject : true) && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          )}

          {/* Admin: project selector */}
          {isAdmin && (
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className="px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px]"
              disabled={adminProjectsLoading}
            >
              <option value="">{adminProjectsLoading ? 'Loading projects…' : '— Select a project —'}</option>
              {adminProjects.map(p => (
                <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectName}</option>
              ))}
            </select>
          )}

          {/* PM / Collaborator: project filter */}
          {!isAdmin && myProjects.length > 1 && (
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px]"
            >
              <option value="">— All projects —</option>
              {myProjects.map(p => (
                <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectName}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Board */}
      {isAdmin && !selectedProject ? (
        // Admin empty state
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <p className="text-[var(--text-mid)] font-medium">Select a project above</p>
            <p className="text-[var(--text-light)] text-sm mt-1">The Kanban board will appear here</p>
          </div>
        </div>
      ) : loading ? (
        <PageLoader />
      ) : !isAdmin && totalTasks === 0 ? (
        // PM/Collaborator — no tasks assigned yet
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-[var(--text-mid)] font-medium">No tasks assigned to you yet</p>
            <p className="text-[var(--text-light)] text-sm mt-1">Tasks will appear here once a PM assigns them to you</p>
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

// src/pages/Kanban/KanbanPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Kanban Board — Drag-and-drop task management with real-time updates.
//
// LIBRARIES USED:
//   @hello-pangea/dnd — A maintained fork of react-beautiful-dnd.
//   Provides DragDropContext, Droppable, and Draggable components.
//
// HOW DRAG & DROP WORKS:
//   1. User picks a project from the dropdown.
//   2. Tasks for that project are fetched and sorted into 3 columns:
//      "To Do" | "In Progress" | "Completed"
//   3. When a card is dragged to a new column:
//      a. The UI updates instantly (optimistic update) — feels snappy.
//      b. PATCH /tasks/:id/status is called to persist it in MySQL.
//      c. Socket.io emits 'task_updated' to everyone in the project room,
//         so other users' boards update in real time without refreshing.
//
// REAL-TIME FLOW:
//   - On mount: socket joins `project_<id>` room via 'join_project_room'.
//   - On unmount: socket leaves via 'leave_project_room'.
//   - When backend emits 'task_updated', we update the local column state.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { projectAPI, taskAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'
import { PageLoader } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { formatDate, priorityBadge, getInitials, getErrorMessage } from '../../utils/helpers'

// ── Column configuration ───────────────────────────────────────────────────
const COLUMNS = [
  {
    id:    'To Do',
    label: 'To Do',
    color: 'bg-gray-100',
    headerColor: 'bg-gray-200 text-gray-700',
    dot:   'bg-gray-400',
  },
  {
    id:    'In Progress',
    label: 'In Progress',
    color: 'bg-blue-50',
    headerColor: 'bg-blue-100 text-blue-700',
    dot:   'bg-blue-500',
  },
  {
    id:    'Completed',
    label: 'Completed',
    color: 'bg-green-50',
    headerColor: 'bg-green-100 text-green-700',
    dot:   'bg-green-500',
  },
]

// ── Task card component ────────────────────────────────────────────────────
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
          {/* Priority badge */}
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
          <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">
            {task.Title}
          </p>

          {/* Project name */}
          <p className="text-[10px] text-gray-400 mb-3 truncate">{task.ProjectName}</p>

          {/* Footer: assignees */}
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

// ── Column component ───────────────────────────────────────────────────────
function Column({ column, tasks, onTaskClick }) {
  return (
    <div className="flex flex-col flex-1 min-w-[280px] max-w-[340px]">
      {/* Column header */}
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 ${column.headerColor}`}>
        <div className={`w-2 h-2 rounded-full ${column.dot}`} />
        <span className="font-display font-semibold text-sm">{column.label}</span>
        <span className="ml-auto text-xs font-bold opacity-60">{tasks.length}</span>
      </div>

      {/* Droppable zone */}
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

            {/* Empty column hint */}
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

// ── Main KanbanPage ────────────────────────────────────────────────────────
export default function KanbanPage() {
  const { hasRole }        = useAuth()
  const { socket }         = useNotifications()
  const toast              = useToast()

  const [projects,       setProjects]       = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [columns,        setColumns]        = useState({ 'To Do': [], 'In Progress': [], 'Completed': [] })
  const [loading,        setLoading]        = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const prevProjectRef = useRef(null)

  // ── Load project list on mount ─────────────────────────────────────────
  useEffect(() => {
    projectAPI.getAll()
      .then(res => setProjects(res.data.data || []))
      .catch(() => toast.error('Failed to load projects'))
      .finally(() => setProjectsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load tasks whenever selected project changes ───────────────────────
  const loadTasks = useCallback(async (projectId) => {
    if (!projectId) return
    setLoading(true)
    try {
      const res = await taskAPI.getByProject(projectId)
      const tasks = res.data.data || []

      // Distribute tasks into columns by Status
      setColumns({
        'To Do':       tasks.filter(t => t.Status === 'To Do'),
        'In Progress': tasks.filter(t => t.Status === 'In Progress'),
        'Completed':   tasks.filter(t => t.Status === 'Completed'),
      })
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedProject) return

    loadTasks(selectedProject)

    // Join the Socket.io project room for real-time Kanban updates
    if (socket) {
      // Leave the previous project room first
      if (prevProjectRef.current) {
        socket.emit('leave_project_room', prevProjectRef.current)
      }
      socket.emit('join_project_room', selectedProject)
      prevProjectRef.current = selectedProject
    }

    return () => {
      if (socket && selectedProject) {
        socket.emit('leave_project_room', selectedProject)
      }
    }
  }, [selectedProject, socket, loadTasks])

  // ── Real-time: listen for task_updated events from Socket.io ──────────
  useEffect(() => {
    if (!socket) return

    socket.on('task_updated', (updatedTask) => {
      // When another user moves a card, update our board too
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

  // ── Drag end handler ───────────────────────────────────────────────────
  async function onDragEnd(result) {
    const { source, destination, draggableId } = result

    // Dropped outside any column or in the same position
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceCol      = source.droppableId
    const destCol        = destination.droppableId
    const taskId         = parseInt(draggableId)
    const movingTask     = columns[sourceCol].find(t => t.TaskID === taskId)

    if (!movingTask) return

    // ── Optimistic update: move the card in the UI immediately ────────────
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

    // ── Persist to database ────────────────────────────────────────────────
    try {
      await taskAPI.updateStatus(taskId, destCol)

      // Emit real-time update to others in this project room
      if (socket) {
        socket.emit('task_updated', updatedTask)
      }
    } catch (err) {
      // Rollback the optimistic update if the API call fails
      toast.error(getErrorMessage(err))
      loadTasks(selectedProject)
    }
  }

  // ── Navigate to task detail ────────────────────────────────────────────
  function handleTaskClick(taskId) {
    window.location.href = `/tasks/${taskId}`
  }

  const totalTasks = Object.values(columns).reduce((sum, col) => sum + col.length, 0)

  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-xl text-[var(--text-dark)]">Kanban Board</h1>
          <p className="text-[var(--text-light)] text-sm mt-0.5">
            {selectedProject
              ? `${totalTasks} task${totalTasks !== 1 ? 's' : ''} · drag cards to update status in real time`
              : 'Select a project to view its Kanban board'}
          </p>
        </div>

        {/* Project selector */}
        <div className="flex items-center gap-3">
          {socket && selectedProject && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </div>
          )}
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="px-3 py-2 text-sm border border-purple-200 rounded-lg bg-white text-[var(--text-dark)] focus:outline-none focus:ring-2 focus:ring-primary min-w-[220px]"
            disabled={projectsLoading}
          >
            <option value="">{projectsLoading ? 'Loading projects…' : '— Select a project —'}</option>
            {projects.map(p => (
              <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Board ───────────────────────────────────────────────────────── */}
      {!selectedProject ? (
        // Empty state
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <p className="text-[var(--text-mid)] font-medium">Select a project above</p>
            <p className="text-[var(--text-light)] text-sm mt-1">Your Kanban board will appear here</p>
          </div>
        </div>
      ) : loading ? (
        <PageLoader />
      ) : (
        // Drag and Drop context wraps all columns
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

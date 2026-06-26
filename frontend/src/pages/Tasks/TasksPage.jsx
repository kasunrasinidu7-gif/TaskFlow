// src/pages/Tasks/TasksPage.jsx
//
// FIX: Assign modal now filters out already-assigned users.
//   When openAssignModal is called, we fetch the full task detail to get
//   current assignees, then exclude them from the assignable users list.
//   Also added a "Remove" option in the assign modal for already-assigned users.

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { taskAPI, projectAPI, userAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import { PageLoader, Spinner } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { formatDate, priorityBadge, statusBadge, getInitials, getErrorMessage } from '../../utils/helpers'

const EMPTY_FORM = { Title: '', Description: '', Priority: 'Medium', Status: 'To Do', DueDate: '', ProjectID: '' }

export default function TasksPage() {
  const { hasRole } = useAuth()
  const toast       = useToast()
  const navigate    = useNavigate()
  const canManage   = hasRole('Admin', 'Project Manager')

  const [tasks,    setTasks]    = useState([])
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)

  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('')
  const [priorityF, setPriorityF] = useState('')
  const [projectF,  setProjectF]  = useState('')

  const [modal,   setModal]   = useState({ open: false, mode: 'create', task: null })
  const [confirm, setConfirm] = useState({ open: false, id: null })
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState({})

  // ── Assign modal state ────────────────────────────────────────────────────
  const [assignModal,    setAssignModal]    = useState({ open: false, task: null })
  const [assignableUsers, setAssignableUsers] = useState([])  // users NOT yet assigned
  const [currentAssignees, setCurrentAssignees] = useState([]) // users already assigned
  const [selectedUIDs,   setSelectedUIDs]   = useState([])
  const [assignLoading,  setAssignLoading]  = useState(false)
  const [removingUID,    setRemovingUID]    = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, pRes] = await Promise.all([
        taskAPI.getAll({ search, status: statusF, priority: priorityF, projectId: projectF }),
        projectAPI.getAll(),
      ])
      setTasks(tRes.data.data)
      setProjects(pRes.data.data)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [search, statusF, priorityF, projectF]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm(EMPTY_FORM); setFormErr({})
    setModal({ open: true, mode: 'create', task: null })
  }

  function openEdit(t) {
    setForm({
      Title: t.Title, Description: t.Description || '',
      Priority: t.Priority, Status: t.Status,
      DueDate: t.DueDate?.substring(0, 10) || '',
      ProjectID: t.ProjectID,
    })
    setFormErr({})
    setModal({ open: true, mode: 'edit', task: t })
  }

  /**
   * Open the assign modal for a task.
   * FIX: fetch full task detail to get current assignees, then exclude
   * them from the assignable list so already-assigned users can't be re-added.
   */
  async function openAssignModal(task) {
    setSelectedUIDs([])
    setAssignableUsers([])
    setCurrentAssignees([])
    setAssignModal({ open: true, task })
    setAssignLoading(true)
    try {
      const [taskRes, usersRes] = await Promise.all([
        taskAPI.getOne(task.TaskID),          // get current assignees
        userAPI.getAssignable(task.ProjectID), // get project members
      ])
      const fullTask     = taskRes.data.data
      const assignedIds  = new Set((fullTask.assignees || []).map(a => a.UserID))
      const allUsers     = usersRes.data.data || []

      setCurrentAssignees(fullTask.assignees || [])
      // Only show users NOT already assigned
      setAssignableUsers(allUsers.filter(u => !assignedIds.has(u.UserID)))
    } catch (e) {
      toast.error('Could not load users: ' + getErrorMessage(e))
    } finally {
      setAssignLoading(false)
    }
  }

  function validate() {
    const e = {}
    if (!form.Title.trim()) e.Title     = 'Title is required'
    if (!form.ProjectID)    e.ProjectID = 'Please select a project'
    return e
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErr(errs); return }
    setSaving(true)
    try {
      if (modal.mode === 'create') { await taskAPI.create(form); toast.success('Task created') }
      else { await taskAPI.update(modal.task.TaskID, form); toast.success('Task updated') }
      setModal(m => ({ ...m, open: false })); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await taskAPI.delete(confirm.id); toast.success('Task deleted')
      setConfirm({ open: false, id: null }); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function handleAssign() {
    if (!selectedUIDs.length) return
    try {
      const res = await taskAPI.assign(assignModal.task.TaskID, { UserIDs: selectedUIDs.map(Number) })
      toast.success(res.data.message || 'Users assigned')
      setAssignModal({ open: false, task: null })
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  async function handleUnassign(userId, userName) {
    if (!window.confirm(`Remove ${userName} from this task?`)) return
    setRemovingUID(userId)
    try {
      await taskAPI.unassign(assignModal.task.TaskID, userId)
      toast.success(`${userName} removed`)
      // Refresh the modal contents
      await openAssignModal(assignModal.task)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setRemovingUID(null)
    }
  }

  function closeAssignModal() {
    setAssignModal({ open: false, task: null })
    setAssignableUsers([])
    setCurrentAssignees([])
    setSelectedUIDs([])
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-dark)]">Tasks</h1>
          <p className="text-[var(--text-light)] text-sm mt-0.5">All tasks across projects</p>
        </div>
        {canManage && <Button onClick={openCreate}>+ New Task</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          className="flex-1 min-w-[180px] px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search tasks…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Statuses</option>
          {['To Do','In Progress','Completed'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" value={priorityF} onChange={e => setPriorityF(e.target.value)}>
          <option value="">All Priorities</option>
          {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" value={projectF} onChange={e => setProjectF(e.target.value)}>
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectName}</option>)}
        </select>
      </div>

      {/* Task table */}
      <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 overflow-hidden">
        {loading ? <PageLoader /> : tasks.length === 0 ? (
          <EmptyState icon="✅" title="No tasks found" description="Create a task or adjust filters."
            action={canManage && <Button onClick={openCreate}>Create Task</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-50 bg-purple-50/50">
                {['Title','Project','Priority','Status','Due Date','Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {tasks.map(t => (
                <tr key={t.TaskID} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[var(--text-dark)] cursor-pointer hover:text-primary max-w-xs truncate"
                    onClick={() => navigate(`/tasks/${t.TaskID}`)}>{t.Title}</td>
                  <td className="px-5 py-3.5 text-[var(--text-light)]">{t.ProjectName}</td>
                  <td className="px-5 py-3.5"><Badge className={priorityBadge(t.Priority)}>{t.Priority}</Badge></td>
                  <td className="px-5 py-3.5"><Badge className={statusBadge(t.Status)}>{t.Status}</Badge></td>
                  <td className="px-5 py-3.5 text-[var(--text-light)]">{formatDate(t.DueDate)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/tasks/${t.TaskID}`)}>View</Button>
                      {canManage && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>Edit</Button>
                          <Button variant="ghost" size="sm" onClick={() => openAssignModal(t)}>Assign</Button>
                          <Button variant="danger" size="sm" onClick={() => setConfirm({ open: true, id: t.TaskID })}>Delete</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      <Modal isOpen={modal.open} onClose={() => setModal(m => ({ ...m, open: false }))}
        title={modal.mode === 'create' ? 'New Task' : 'Edit Task'} size="lg">
        <div className="flex flex-col gap-4">
          <Input label="Task Title" value={form.Title}
            onChange={e => setForm(p => ({ ...p, Title: e.target.value }))} error={formErr.Title} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">Description</label>
            <textarea className="w-full px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3} value={form.Description}
              onChange={e => setForm(p => ({ ...p, Description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Project" as="select" value={form.ProjectID}
              onChange={e => setForm(p => ({ ...p, ProjectID: e.target.value }))} error={formErr.ProjectID}>
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.ProjectID} value={p.ProjectID}>{p.ProjectName}</option>)}
            </Input>
            <Input label="Priority" as="select" value={form.Priority}
              onChange={e => setForm(p => ({ ...p, Priority: e.target.value }))}>
              {['Low','Medium','High','Critical'].map(v => <option key={v}>{v}</option>)}
            </Input>
            <Input label="Status" as="select" value={form.Status}
              onChange={e => setForm(p => ({ ...p, Status: e.target.value }))}>
              {['To Do','In Progress','Completed'].map(v => <option key={v}>{v}</option>)}
            </Input>
            <Input label="Due Date" type="date" value={form.DueDate}
              onChange={e => setForm(p => ({ ...p, DueDate: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {modal.mode === 'create' ? 'Create Task' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog isOpen={confirm.open} onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete} title="Delete Task?"
        message="This task and all its comments and attachments will be permanently deleted."
        loading={saving} />

      {/* ── Assign modal ─────────────────────────────────────────────────── */}
      <Modal isOpen={assignModal.open} onClose={closeAssignModal}
        title={`Assign — ${assignModal.task?.Title}`}>

        {assignLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            {/* ── Currently assigned users with Remove button ── */}
            {currentAssignees.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wide mb-2">
                  Currently Assigned
                </p>
                <div className="flex flex-col gap-1.5">
                  {currentAssignees.map(a => (
                    <div key={a.UserID}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-50 border border-purple-100">
                      <div className="w-7 h-7 rounded-full bg-purple-200 text-purple-700 text-xs font-bold font-display flex items-center justify-center flex-shrink-0">
                        {getInitials(a.Name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-dark)] truncate">{a.Name}</p>
                        <p className="text-[10px] text-[var(--text-light)]">{a.RoleName}</p>
                      </div>
                      <button
                        onClick={() => handleUnassign(a.UserID, a.Name)}
                        disabled={removingUID === a.UserID}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        {removingUID === a.UserID ? <Spinner size="sm" /> : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Add new users section ── */}
            <div>
              <p className="text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wide mb-2">
                Add Users
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
                ⚠️ Collaborators with 10 or more active tasks cannot be assigned new tasks.
              </p>

              {assignableUsers.length === 0 ? (
                <p className="text-sm text-[var(--text-light)] italic text-center py-4">
                  All project members are already assigned to this task.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {assignableUsers.map(u => {
                    const atLimit  = u.RoleName === 'Collaborator' && parseInt(u.activeTasks || 0) >= 10
                    const selected = selectedUIDs.includes(String(u.UserID))
                    return (
                      <label key={u.UserID}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors border
                          ${atLimit
                            ? 'opacity-50 cursor-not-allowed bg-red-50 border-red-100'
                            : selected
                              ? 'bg-purple-50 border-purple-300'
                              : 'hover:bg-purple-50 border-gray-100 hover:border-purple-200'
                          }`}>
                        <input
                          type="checkbox"
                          className="accent-primary"
                          disabled={atLimit}
                          checked={selected}
                          onChange={e => setSelectedUIDs(prev =>
                            e.target.checked
                              ? [...prev, String(u.UserID)]
                              : prev.filter(x => x !== String(u.UserID))
                          )}
                        />
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold font-display flex items-center justify-center flex-shrink-0">
                          {getInitials(u.Name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--text-dark)] font-medium truncate">{u.Name}</p>
                          <p className="text-[10px] text-[var(--text-light)]">{u.RoleName}</p>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto
                          ${atLimit ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {u.activeTasks || 0}/10 active
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-purple-50 mt-4">
              <Button variant="ghost" onClick={closeAssignModal}>Cancel</Button>
              {assignableUsers.length > 0 && (
                <Button onClick={handleAssign} disabled={!selectedUIDs.length}>
                  Assign Selected {selectedUIDs.length > 0 ? `(${selectedUIDs.length})` : ''}
                </Button>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
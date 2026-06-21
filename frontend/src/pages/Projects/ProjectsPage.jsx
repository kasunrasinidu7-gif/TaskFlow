// src/pages/Projects/ProjectsPage.jsx

import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectAPI, userAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { formatDate, projectStatusBadge, getErrorMessage } from '../../utils/helpers'

const EMPTY_FORM = { ProjectName: '', Description: '', Status: 'Active' }

export default function ProjectsPage() {
  const { hasRole } = useAuth()
  const toast       = useToast()
  const navigate    = useNavigate()
  const canManage   = hasRole('Admin', 'Project Manager')

  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [statusF,  setStatusF]  = useState('')

  const [modal,   setModal]   = useState({ open: false, mode: 'create', project: null })
  const [confirm, setConfirm] = useState({ open: false, id: null })
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState({})

  // Member management modal
  const [memberModal, setMemberModal]   = useState({ open: false, project: null })
  const [allUsers,    setAllUsers]      = useState([])
  const [selectedUID, setSelectedUID]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await projectAPI.getAll({ search, status: statusF })
      setProjects(r.data.data)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [search, statusF])

  useEffect(() => { load() }, [load])

  function openCreate() { setForm(EMPTY_FORM); setFormErr({}); setModal({ open: true, mode: 'create', project: null }) }
  function openEdit(p)  { setForm({ ProjectName: p.ProjectName, Description: p.Description || '', Status: p.Status }); setFormErr({}); setModal({ open: true, mode: 'edit', project: p }) }

  async function handleSave() {
    if (!form.ProjectName.trim()) { setFormErr({ ProjectName: 'Name is required' }); return }
    setSaving(true)
    try {
      if (modal.mode === 'create') { await projectAPI.create(form); toast.success('Project created') }
      else { await projectAPI.update(modal.project.ProjectID, form); toast.success('Project updated') }
      setModal(m => ({ ...m, open: false })); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await projectAPI.delete(confirm.id)
      toast.success('Project deleted')
      setConfirm({ open: false, id: null }); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function openMemberModal(p) {
    // Use getAssignable instead of getAll — getAll is Admin-only,
    // getAssignable is accessible by Admin + Project Manager
    const r = await userAPI.getAssignable()
    setAllUsers(r.data.data)
    const full = await projectAPI.getOne(p.ProjectID)
    setMemberModal({ open: true, project: full.data.data })
    setSelectedUID('')
  }

  async function handleAddMember() {
    if (!selectedUID) return
    try {
      await projectAPI.addMember(memberModal.project.ProjectID, { UserID: parseInt(selectedUID) })
      toast.success('Member added')
      const full = await projectAPI.getOne(memberModal.project.ProjectID)
      setMemberModal(m => ({ ...m, project: full.data.data }))
      setSelectedUID('')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  async function handleRemoveMember(uid) {
    try {
      await projectAPI.removeMember(memberModal.project.ProjectID, uid)
      toast.success('Member removed')
      const full = await projectAPI.getOne(memberModal.project.ProjectID)
      setMemberModal(m => ({ ...m, project: full.data.data }))
    } catch (e) { toast.error(getErrorMessage(e)) }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-dark)]">Projects</h1>
          <p className="text-[var(--text-light)] text-sm mt-0.5">{canManage ? 'Manage all projects' : 'Your assigned projects'}</p>
        </div>
        {canManage && <Button onClick={openCreate}>+ New Project</Button>}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" value={statusF} onChange={e => setStatusF(e.target.value)}>
          <option value="">All Statuses</option>
          {['Active','On Hold','Completed','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Cards grid */}
      {loading ? <PageLoader /> : projects.length === 0 ? (
        <EmptyState icon="📁" title="No projects found" description={canManage ? 'Create your first project.' : 'You have no assigned projects yet.'} action={canManage && <Button onClick={openCreate}>Create Project</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.ProjectID} className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display font-semibold text-[var(--text-dark)] leading-tight cursor-pointer hover:text-primary" onClick={() => navigate(`/projects/${p.ProjectID}`)}>
                  {p.ProjectName}
                </h3>
                <Badge className={projectStatusBadge(p.Status)}>{p.Status}</Badge>
              </div>
              {p.Description && <p className="text-xs text-[var(--text-light)] line-clamp-2">{p.Description}</p>}
              <div className="flex gap-4 text-xs text-[var(--text-light)]">
                <span>👥 {p.MemberCount} members</span>
                <span>✅ {p.TaskCount} tasks</span>
                <span>🗓 {formatDate(p.CreatedAt)}</span>
              </div>
              {canManage && (
                <div className="flex gap-2 pt-1 border-t border-purple-50">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => openMemberModal(p)}>Members</Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirm({ open: true, id: p.ProjectID })}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal isOpen={modal.open} onClose={() => setModal(m => ({ ...m, open: false }))} title={modal.mode === 'create' ? 'New Project' : 'Edit Project'}>
        <div className="flex flex-col gap-4">
          <Input label="Project Name" value={form.ProjectName} onChange={e => setForm(p => ({ ...p, ProjectName: e.target.value }))} error={formErr.ProjectName} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-mid)] uppercase tracking-wide">Description</label>
            <textarea className="w-full px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none" rows={3} value={form.Description} onChange={e => setForm(p => ({ ...p, Description: e.target.value }))} />
          </div>
          {modal.mode === 'edit' && (
            <Input label="Status" as="select" value={form.Status} onChange={e => setForm(p => ({ ...p, Status: e.target.value }))}>
              {['Active','On Hold','Completed','Cancelled'].map(s => <option key={s}>{s}</option>)}
            </Input>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{modal.mode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog isOpen={confirm.open} onClose={() => setConfirm({ open: false, id: null })} onConfirm={handleDelete} title="Delete Project?" message="All tasks, comments, and attachments in this project will be permanently deleted." loading={saving} />

      {/* Members modal */}
      <Modal isOpen={memberModal.open} onClose={() => setMemberModal({ open: false, project: null })} title={`Members — ${memberModal.project?.ProjectName}`} size="md">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <select className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary" value={selectedUID} onChange={e => setSelectedUID(e.target.value)}>
              <option value="">Select a user to add…</option>
              {allUsers.filter(u => !memberModal.project?.members?.find(m => m.UserID === u.UserID)).map(u => (
                <option key={u.UserID} value={u.UserID}>{u.Name} ({u.RoleName})</option>
              ))}
            </select>
            <Button onClick={handleAddMember} disabled={!selectedUID}>Add</Button>
          </div>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {memberModal.project?.members?.length === 0
              ? <p className="text-sm text-[var(--text-light)] text-center py-4">No members yet</p>
              : memberModal.project?.members?.map(m => (
                <div key={m.UserID} className="flex items-center justify-between px-3 py-2 bg-purple-50/50 rounded-sm">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-dark)]">{m.Name}</p>
                    <p className="text-xs text-[var(--text-light)]">{m.RoleName}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.UserID)}>Remove</Button>
                </div>
              ))
            }
          </div>
        </div>
      </Modal>    </>
  )
}

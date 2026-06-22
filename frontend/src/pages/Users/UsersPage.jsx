// src/pages/Users/UsersPage.jsx
// Admin-only page for creating, editing, and deactivating users.

import React, { useEffect, useState, useCallback } from 'react'
import { userAPI } from '../../api/services'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Badge from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { getInitials, getErrorMessage } from '../../utils/helpers'

const EMPTY_FORM = { Name: '', Email: '', RoleName: 'Collaborator' }

export default function UsersPage() {
  const toast = useToast()
  const [users,   setUsers]   = useState([])
  const [roles,   setRoles]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [modal,   setModal]   = useState({ open: false, mode: 'create', user: null })
  const [confirm, setConfirm] = useState({ open: false, userId: null })
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [saving,  setSaving]  = useState(false)
  const [formErr, setFormErr] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, rRes] = await Promise.all([
        userAPI.getAll({ search, role: roleFilter }),
        userAPI.getRoles(),
      ])
      setUsers(uRes.data.data)
      setRoles(rRes.data.data)
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [search, roleFilter])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm(EMPTY_FORM); setFormErr({})
    setModal({ open: true, mode: 'create', user: null })
  }
  function openEdit(u) {
    setForm({ Name: u.Name, Email: u.Email, RoleName: u.RoleName })
    setFormErr({})
    setModal({ open: true, mode: 'edit', user: u })
  }
  function closeModal() { setModal(m => ({ ...m, open: false })) }

  function validate() {
    const e = {}
    if (!form.Name.trim())  e.Name  = 'Name is required'
    if (!form.Email.trim()) e.Email = 'Email is required'
    return e
  }

  async function handleSave() {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErr(errs); return }
    setSaving(true)
    try {
      if (modal.mode === 'create') {
        await userAPI.create(form)
        toast.success('User created')
      } else {
        const payload = { Name: form.Name, Email: form.Email, RoleName: form.RoleName }
        await userAPI.update(modal.user.UserID, payload)
        toast.success('User updated')
      }
      closeModal(); load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  async function handleDeactivate() {
    setSaving(true)
    try {
      await userAPI.deactivate(confirm.userId)
      toast.success('User deactivated')
      setConfirm({ open: false, userId: null })
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setSaving(false) }
  }

  const roleBadge = { Admin: 'bg-purple-100 text-purple-700', 'Project Manager': 'bg-blue-100 text-blue-700', Collaborator: 'bg-gray-100 text-gray-600' }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-dark)]">Users</h1>
          <p className="text-[var(--text-light)] text-sm mt-0.5">Manage system users and roles</p>
        </div>
        <Button onClick={openCreate}>+ Add User</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <input
          className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="px-3 py-2 text-sm border border-purple-200 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.RoleID} value={r.RoleName}>{r.RoleName}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[var(--radius)] shadow-sm border border-purple-50 overflow-hidden">
        {loading ? <PageLoader /> : users.length === 0 ? (
          <EmptyState icon="👥" title="No users found" description="Add a user or adjust your filters." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-50 bg-purple-50/50">
                {['User', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-[var(--text-mid)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {users.map(u => (
                <tr key={u.UserID} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold font-display">
                        {getInitials(u.Name)}
                      </div>
                      <span className="font-medium text-[var(--text-dark)]">{u.Name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--text-mid)]">{u.Email}</td>
                  <td className="px-5 py-3.5">
                    <Badge className={roleBadge[u.RoleName] || 'bg-gray-100 text-gray-600'}>{u.RoleName}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge className={u.IsActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}>
                      {u.IsActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>Edit</Button>
                      {u.IsActive && (
                        <Button variant="danger" size="sm" onClick={() => setConfirm({ open: true, userId: u.UserID })}>
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal isOpen={modal.open} onClose={closeModal} title={modal.mode === 'create' ? 'Add New User' : 'Edit User'}>
        <div className="flex flex-col gap-4">
          <Input label="Full Name" value={form.Name} onChange={e => setForm(p => ({ ...p, Name: e.target.value }))} error={formErr.Name} />
          <Input label="Email" type="email" value={form.Email} onChange={e => setForm(p => ({ ...p, Email: e.target.value }))} error={formErr.Email} />

{/* edited           */}

          {modal.mode === 'create' && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
    🔐 A secure temporary password will be automatically generated and emailed to the user. They will be required to change it on first login.
  </div>
)}

          <Input label="Role" as="select" value={form.RoleName} onChange={e => setForm(p => ({ ...p, RoleName: e.target.value }))}>
            <option value="Admin">Admin</option>
            <option value="Project Manager">Project Manager</option>
            <option value="Collaborator">Collaborator</option>
          </Input>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {modal.mode === 'create' ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate confirm */}
      <ConfirmDialog
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, userId: null })}
        onConfirm={handleDeactivate}
        title="Deactivate User?"
        message="This user will no longer be able to log in. Their data will be preserved."
        confirmLabel="Deactivate"
        loading={saving}
      />    </>
  )
}

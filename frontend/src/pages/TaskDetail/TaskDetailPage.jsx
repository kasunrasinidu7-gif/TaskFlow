// src/pages/TaskDetail/TaskDetailPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Task Detail Page — shows full task info, comments, and file attachments.
// Available to all roles.
// Collaborators can update status and add comments on assigned tasks.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { taskAPI, commentAPI, attachmentAPI } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { PageLoader, Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import {
  formatDate, timeAgo, priorityBadge, statusBadge,
  getInitials, getErrorMessage,
} from '../../utils/helpers'

// ── Sub-component: Section card wrapper ───────────────────────────────────────
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

// ── Status selector dropdown ──────────────────────────────────────────────────
const STATUSES = ['To Do', 'In Progress', 'Completed']

export default function TaskDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user, hasRole } = useAuth()
  const toast      = useToast()
  const fileRef    = useRef()

  const [task,        setTask]        = useState(null)
  const [comments,    setComments]    = useState([])
  const [attachments, setAttachments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [uploading,   setUploading]   = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)

  // ── Fetch all data in parallel ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [taskRes, commentsRes, attachRes] = await Promise.all([
        taskAPI.getOne(id),
        commentAPI.getByTask(id),
        attachmentAPI.getByTask(id),
      ])
      setTask(taskRes.data.data)
      setComments(commentsRes.data.data)
      setAttachments(attachRes.data.data)
    } catch (err) {
      toast.error(getErrorMessage(err))
      navigate('/tasks')
    } finally {
      setLoading(false)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Update task status ────────────────────────────────────────────────────
  async function handleStatusChange(newStatus) {
    setStatusSaving(true)
    try {
      await taskAPI.updateStatus(id, newStatus)
      setTask(prev => ({ ...prev, Status: newStatus }))
      toast.success('Status updated')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setStatusSaving(false)
    }
  }

  // ── Add comment ───────────────────────────────────────────────────────────
  async function handleComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmitting(true)
    try {
      await commentAPI.create(id, { CommentText: commentText })
      setCommentText('')
      const res = await commentAPI.getByTask(id)
      setComments(res.data.data)
      toast.success('Comment added')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete comment ────────────────────────────────────────────────────────
  async function handleDeleteComment(commentId) {
    try {
      await commentAPI.delete(commentId)
      setComments(prev => prev.filter(c => c.CommentID !== commentId))
      toast.success('Comment deleted')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  // ── Upload attachment ─────────────────────────────────────────────────────
  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await attachmentAPI.upload(id, fd)
      const res = await attachmentAPI.getByTask(id)
      setAttachments(res.data.data)
      toast.success('File uploaded')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  // ── Delete attachment ─────────────────────────────────────────────────────
  async function handleDeleteAttachment(attachId) {
    try {
      await attachmentAPI.delete(attachId)
      setAttachments(prev => prev.filter(a => a.AttachmentID !== attachId))
      toast.success('Attachment deleted')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (loading) return <PageLoader />

  const canEditStatus = hasRole('Admin', 'Project Manager') ||
    (hasRole('Collaborator') && task?.assignees?.some(a => a.UserID === user.UserID))

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-[var(--text-light)] hover:bg-purple-100 hover:text-[var(--text-dark)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="font-display font-bold text-xl text-[var(--text-dark)]">{task.Title}</h1>
          <p className="text-[var(--text-light)] text-xs mt-0.5">{task.ProjectName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left column: details + comments + attachments ─────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Description */}
          <Card title="Description">
            <p className="text-[var(--text-mid)] text-sm leading-relaxed">
              {task.Description || <span className="text-[var(--text-light)] italic">No description provided.</span>}
            </p>
          </Card>

          {/* Comments */}
          <Card title={`Comments (${comments.length})`}>
            {/* Comment list */}
            <div className="flex flex-col gap-4 mb-4 max-h-80 overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-[var(--text-light)] text-sm italic">No comments yet. Be the first!</p>
              ) : comments.map(c => (
                <div key={c.CommentID} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold font-display flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getInitials(c.UserName)}
                  </div>
                  <div className="flex-1 bg-purple-50/60 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[var(--text-dark)]">{c.UserName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-light)]">{timeAgo(c.CreatedAt)}</span>
                        {(c.UserID === user.UserID || hasRole('Admin')) && (
                          <button
                            onClick={() => handleDeleteComment(c.CommentID)}
                            className="text-[var(--text-light)] hover:text-red-500 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[var(--text-mid)]">{c.CommentText}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment form */}
            <form onSubmit={handleComment} className="flex gap-2 border-t border-purple-50 pt-4">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-sm border border-purple-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Button type="submit" size="sm" loading={submitting} disabled={!commentText.trim()}>
                Post
              </Button>
            </form>
          </Card>

          {/* Attachments */}
          <Card
            title={`Attachments (${attachments.length})`}
            action={
              <>
                <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current.click()}
                  loading={uploading}
                >
                  {uploading ? 'Uploading…' : '+ Upload File'}
                </Button>
              </>
            }
          >
            {attachments.length === 0 ? (
              <p className="text-[var(--text-light)] text-sm italic">No files attached yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {attachments.map(a => (
                  <div key={a.AttachmentID} className="flex items-center gap-3 p-3 bg-purple-50/60 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-dark)] truncate">{a.FileName}</p>
                      <p className="text-[10px] text-[var(--text-light)]">
                        {a.UploaderName} · {timeAgo(a.UploadedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={a.FilePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={a.FileName}
                        className="p-1.5 text-[var(--text-light)] hover:text-primary transition-colors rounded"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                      {(a.UserID === user.UserID || hasRole('Admin')) && (
                        <button
                          onClick={() => handleDeleteAttachment(a.AttachmentID)}
                          className="p-1.5 text-[var(--text-light)] hover:text-red-500 transition-colors rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right column: metadata sidebar ──────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Status */}
          <Card title="Status">
            {canEditStatus ? (
              <div className="flex flex-col gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={statusSaving}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      task.Status === s
                        ? 'border-primary bg-purple-50 text-primary'
                        : 'border-gray-200 text-[var(--text-mid)] hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      s === 'To Do' ? 'bg-gray-400' :
                      s === 'In Progress' ? 'bg-blue-500' : 'bg-green-500'
                    }`} />
                    {s}
                    {task.Status === s && statusSaving && <Spinner size="sm" className="ml-auto" />}
                    {task.Status === s && !statusSaving && (
                      <svg className="w-3.5 h-3.5 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${statusBadge(task.Status)}`}>
                {task.Status}
              </span>
            )}
          </Card>

          {/* Details */}
          <Card title="Details">
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-light)] font-medium mb-1">Priority</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${priorityBadge(task.Priority)}`}>
                  {task.Priority}
                </span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-light)] font-medium mb-1">Due Date</p>
                <p className="text-[var(--text-dark)] font-medium">{formatDate(task.DueDate)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-light)] font-medium mb-1">Project</p>
                <p className="text-[var(--text-dark)] font-medium">{task.ProjectName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-light)] font-medium mb-1">Created By</p>
                <p className="text-[var(--text-dark)] font-medium">{task.CreatorName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-light)] font-medium mb-1">Created</p>
                <p className="text-[var(--text-dark)]">{formatDate(task.CreatedAt)}</p>
              </div>
            </div>
          </Card>

          {/* Assignees */}
          <Card title={`Assigned To (${task.assignees?.length || 0})`}>
            {!task.assignees?.length ? (
              <p className="text-[var(--text-light)] text-sm italic">No users assigned yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {task.assignees.map(a => (
                  <div key={a.UserID} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold font-display flex items-center justify-center flex-shrink-0">
                      {getInitials(a.Name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-dark)] truncate">{a.Name}</p>
                      <p className="text-[10px] text-[var(--text-light)]">{a.RoleName}</p>
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

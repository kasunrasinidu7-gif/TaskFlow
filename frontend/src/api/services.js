// src/api/services.js
// ─────────────────────────────────────────────────────────────────────────────
// All API service functions — one per backend endpoint.
// Components call these functions instead of using axios directly,
// which keeps all API logic in one place.
// ─────────────────────────────────────────────────────────────────────────────

import api from './axios'

// ── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:           (data) => api.post('/auth/login', data),
  getMe:           ()     => api.get('/auth/me'),
  forgotPassword:  (data) => api.post('/auth/forgot-password', data),
  changeFirstPassword: (data) => api.put('/auth/change-password', data),
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
}

// ── USERS ────────────────────────────────────────────────────────────────────
export const userAPI = {
  getAll:     (params) => api.get('/users', { params }),
  getOne:     (id)     => api.get(`/users/${id}`),
  create:     (data)   => api.post('/users', data),
  update:     (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id)     => api.patch(`/users/${id}/deactivate`),
  getRoles:      ()            => api.get('/users/roles'),
  getAssignable: (projectId)   => api.get('/users/assignable', { params: projectId ? { projectId } : {} }),
}

// ── PROJECTS ─────────────────────────────────────────────────────────────────
export const projectAPI = {
  getAll:       (params)          => api.get('/projects', { params }),
  getOne:       (id)              => api.get(`/projects/${id}`),
  create:       (data)            => api.post('/projects', data),
  update:       (id, data)        => api.put(`/projects/${id}`, data),
  delete:       (id)              => api.delete(`/projects/${id}`),
  addMember:    (id, data)        => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId)      => api.delete(`/projects/${id}/members/${userId}`),
}

// ── TASKS ────────────────────────────────────────────────────────────────────
export const taskAPI = {
  getAll:       (params)     => api.get('/tasks', { params }),
  getOne:       (id)         => api.get(`/tasks/${id}`),
  create:       (data)       => api.post('/tasks', data),
  update:       (id, data)   => api.put(`/tasks/${id}`, data),
  updateStatus: (id, status) => api.patch(`/tasks/${id}/status`, { Status: status }),
  delete:       (id)         => api.delete(`/tasks/${id}`),
  assign:       (id, data)   => api.post(`/tasks/${id}/assign`, data),
  getByProject: (projectId)  => api.get(`/tasks/by-project/${projectId}`),
}

// ── COMMENTS ─────────────────────────────────────────────────────────────────
export const commentAPI = {
  getByTask: (taskId)       => api.get(`/tasks/${taskId}/comments`),
  create:    (taskId, data) => api.post(`/tasks/${taskId}/comments`, data),
  delete:    (id)           => api.delete(`/comments/${id}`),
}

// ── ATTACHMENTS ───────────────────────────────────────────────────────────────
export const attachmentAPI = {
  getByTask: (taskId) => api.get(`/tasks/${taskId}/attachments`),
  upload:    (taskId, formData) =>
    api.post(`/tasks/${taskId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete:    (id)     => api.delete(`/attachments/${id}`),
  download:  (id)     => api.get(`/attachments/${id}/download`, { responseType: 'blob' }),
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:     ()   => api.get('/notifications'),
  markRead:   (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: ()  => api.patch('/notifications/read-all'),
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
export const profileAPI = {
  update:         (data) => api.put('/profile', data),
  changePassword: (data) => api.put('/profile/password', data),
}

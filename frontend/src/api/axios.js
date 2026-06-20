// src/api/axios.js
// ─────────────────────────────────────────────────────────────────────────────
// Creates a configured Axios instance for all API calls.
//
// KEY FEATURES:
//   1. Base URL set to /api — Vite proxies this to the backend
//   2. Request interceptor: automatically adds the JWT token to every request
//      so we don't have to manually add it in every API call
//   3. Response interceptor: if the server returns 401 (token expired),
//      it automatically logs the user out and redirects to login
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── REQUEST INTERCEPTOR ────────────────────────────────────────────────────
// Runs before every request. Reads the token from localStorage and attaches it.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── RESPONSE INTERCEPTOR ──────────────────────────────────────────────────
// Runs after every response.
// If the server says the token is expired (401), clear storage and redirect.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — force logout
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// src/main.jsx
// ─────────────────────────────────────────────────────────────────────────────
// React app entry point.
// Wraps the App in StrictMode (catches potential issues during development)
// and BrowserRouter (enables React Router).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

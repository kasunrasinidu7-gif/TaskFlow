/**
 * app.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Express Application Setup
 *
 * This file creates and configures the Express app.
 * It is separate from server.js so that the app can be imported and tested
 * without actually starting an HTTP server.
 *
 * WHAT HAPPENS HERE:
 *   1. Load environment variables from .env
 *   2. Create the Express app
 *   3. Register global middleware (CORS, JSON parser, static files)
 *   4. Mount all route files under /api
 *   5. Register the Swagger documentation route
 *   6. Add a global error handler
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const path           = require('path');
const swaggerUi      = require('swagger-ui-express');
const swaggerSpec    = require('./config/swagger');

// ── Route files ───────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const projectRoutes      = require('./routes/projectRoutes');
const taskRoutes         = require('./routes/taskRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileRoutes      = require('./routes/profileRoutes');
const dashboardRoutes    = require('./routes/dashboardRoutes');
const attachmentRoutes   = require('./routes/attachmentRoutes');
const commentRoutes      = require('./routes/commentRoutes');

const app = express();

// ── 1. CORS ───────────────────────────────────────────────────────────────────
// Only allow requests from the React frontend URL.
// In production, replace CLIENT_URL with your actual domain.
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies and Authorization headers
}));

// ── 2. Body parsers ───────────────────────────────────────────────────────────
// Parse incoming JSON request bodies (e.g. { "Email": "..." })
app.use(express.json());
// Parse URL-encoded bodies (for HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// ── 3. Static file serving for uploads ───────────────────────────────────────
// Files uploaded via the attachment feature are stored in /uploads
// and served at /uploads/<filename>
const uploadDir = path.join(__dirname, '../', process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

// ── 4. API Routes ─────────────────────────────────────────────────────────────
// All routes are prefixed with /api
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile',       profileRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/attachments',   attachmentRoutes);
app.use('/api/comments',      commentRoutes);

// ── 5. Swagger Documentation ──────────────────────────────────────────────────
// Swagger UI is served at /api/docs
// Visit http://localhost:5000/api/docs in your browser
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'TaskFlow API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a0a2e; }',
}));

// ── 6. Health check endpoint ──────────────────────────────────────────────────
// Useful for Docker and deployment — confirms the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── 7. 404 handler ────────────────────────────────────────────────────────────
// If no route matched, send a 404 JSON response
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` });
});

// ── 8. Global error handler ───────────────────────────────────────────────────
// Any unhandled error thrown inside a route lands here.
// Express identifies error-handling middleware by having 4 parameters (err, req, res, next).
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Unhandled error:', err);

  // Handle Multer file size error specifically
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 10}MB`,
    });
  }

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

module.exports = app;

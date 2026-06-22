/**
 * middleware/upload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * File Upload Middleware using Multer — Supabase Storage version.
 *
 * CHANGE FROM DISK STORAGE:
 *   Previously used multer.diskStorage() which saved files to the local
 *   /uploads folder on disk. This broke on Render (ephemeral filesystem).
 *
 *   Now uses multer.memoryStorage() which holds the file as a Buffer in
 *   memory (req.file.buffer). The attachmentController then uploads that
 *   Buffer directly to Supabase Storage.
 *
 *   Files never touch the server's local disk.
 *
 * SECURITY:
 *   - File size limit enforced by Multer before the buffer is even read
 *   - MIME type whitelist unchanged
 * ─────────────────────────────────────────────────────────────────────────────
 */

const multer = require('multer');

// memoryStorage holds the file in memory as req.file.buffer
// No temp files written to disk — clean and portable
const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

function fileFilter(req, file, cb) {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
}

const maxSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB) || 10;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 },
});

module.exports = upload;

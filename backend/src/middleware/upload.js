/**
 * middleware/upload.js
 * ─────────────────────────────────────────────────────────────────────────────
 * File Upload Middleware using Multer
 *
 * Multer handles multipart/form-data requests (the type used when uploading files).
 * It intercepts the file stream and saves it to disk before our controller runs.
 *
 * SECURITY MEASURES:
 *   - File size limit: configurable via MAX_FILE_SIZE_MB in .env (default 10 MB)
 *   - Allowed file types: images, PDFs, and common document formats only
 *   - Unique filenames: uses timestamp + random number to avoid overwrites
 *     and prevent path traversal attacks
 * ─────────────────────────────────────────────────────────────────────────────
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure where and how files are stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename: timestamp-random.extension
    // This prevents two users from overwriting each other's files
    const unique   = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext      = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

// Only allow safe file types (whitelist approach)
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
    cb(null, true);  // Accept the file
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
}

const maxSizeMB  = parseInt(process.env.MAX_FILE_SIZE_MB) || 10;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSizeMB * 1024 * 1024 }, // Convert MB to bytes
});

module.exports = upload;

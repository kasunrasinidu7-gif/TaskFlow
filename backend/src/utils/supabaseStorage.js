/**
 * utils/supabaseStorage.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin wrapper around the Supabase Storage API.
 *
 * WHY @supabase/storage-js AND NOT @supabase/supabase-js?
 *   We only need the Storage feature — not Supabase Auth or the database client
 *   (we already connect to PostgreSQL directly via pg). Using the smaller
 *   storage-only package avoids pulling in the full Supabase SDK.
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   SUPABASE_URL         — https://your-project-ref.supabase.co
 *   SUPABASE_SERVICE_KEY — service_role key from Supabase Dashboard → Settings → API
 *   SUPABASE_BUCKET      — name of the storage bucket (e.g. taskflow-attachments)
 *
 * WHY SERVICE_ROLE KEY?
 *   The service_role key bypasses Row Level Security (RLS) on the bucket, so
 *   our backend can upload and delete files without needing the authenticated
 *   user's session. It must ONLY be used server-side — never expose it to the
 *   frontend or commit it to git.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { StorageClient } = require('@supabase/storage-js');
require('dotenv').config();

const SUPABASE_URL    = process.env.SUPABASE_URL;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_KEY;
const BUCKET          = process.env.SUPABASE_BUCKET || 'taskflow-attachments';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn('⚠️   SUPABASE_URL or SUPABASE_SERVICE_KEY not set — file uploads will fail');
}

// Initialise the Supabase Storage client
const storageClient = new StorageClient(`${SUPABASE_URL}/storage/v1`, {
  apikey:        SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
});

/**
 * Upload a file buffer to Supabase Storage.
 *
 * @param {object} params
 * @param {Buffer}  params.buffer      — File content as a Node.js Buffer (from multer memoryStorage)
 * @param {string}  params.storagePath — Path inside the bucket e.g. "tasks/42/1234567890.pdf"
 * @param {string}  params.mimeType    — MIME type e.g. "application/pdf"
 * @returns {string} Public URL of the uploaded file
 */
async function uploadFile({ buffer, storagePath, mimeType }) {
  const { data, error } = await storageClient
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType:  mimeType,
      upsert:       false,      // Never silently overwrite — use unique paths
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  // Build the public URL — works because the bucket is set to Public
  const { data: urlData } = storageClient
    .from(BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage by its storage path.
 *
 * @param {string} storagePath — Path inside the bucket e.g. "tasks/42/1234567890.pdf"
 */
async function deleteFile(storagePath) {
  const { error } = await storageClient
    .from(BUCKET)
    .remove([storagePath]);

  if (error) {
    // Log but don't throw — a failed delete should not block the DB record removal
    console.error('Supabase Storage delete warning:', error.message);
  }
}

/**
 * Extract the storage path from a full public URL.
 * Needed for deletion — we store the full URL in the DB but Supabase's
 * remove() API needs only the path within the bucket.
 *
 * Example:
 *   Input:  https://abc.supabase.co/storage/v1/object/public/taskflow-attachments/tasks/42/file.pdf
 *   Output: tasks/42/file.pdf
 *
 * @param {string} publicUrl
 * @returns {string} Storage path within the bucket
 */
function extractStoragePath(publicUrl) {
  const marker = `/object/public/${BUCKET}/`;
  const idx    = publicUrl.indexOf(marker);
  if (idx === -1) return publicUrl; // Fallback — return as-is if format unexpected
  return publicUrl.substring(idx + marker.length);
}

module.exports = { uploadFile, deleteFile, extractStoragePath };

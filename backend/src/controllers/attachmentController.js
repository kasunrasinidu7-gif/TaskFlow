/**
 * controllers/attachmentController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles file uploads to Supabase Storage and attachment management.
 *
 * UPLOAD FLOW (new):
 *   1. Client sends multipart/form-data POST request
 *   2. Multer (memoryStorage) reads the file into req.file.buffer — no disk write
 *   3. Controller uploads the buffer to Supabase Storage bucket
 *   4. Supabase returns a public URL
 *   5. Controller saves the public URL as FilePath in the attachments table
 *
 * DOWNLOAD FLOW (new):
 *   Files are publicly accessible via their Supabase URL directly.
 *   The download endpoint just reads the URL from the DB and redirects the
 *   browser there — no file streaming through the backend needed.
 *
 * DELETE FLOW (new):
 *   1. Get the attachment record (which contains the public URL as FilePath)
 *   2. Extract the storage path from the URL
 *   3. Delete from Supabase Storage bucket
 *   4. Delete the DB record
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path       = require('path');
const Attachment = require('../models/Attachment');
const Task       = require('../models/Task');
const { uploadFile, deleteFile, extractStoragePath } = require('../utils/supabaseStorage');
const { sendSuccess, sendError } = require('../utils/response');

const attachmentController = {

  /**
   * GET /api/tasks/:id/attachments
   */
  async getByTask(req, res) {
    try {
      const attachments = await Attachment.findByTask(req.params.id);
      return sendSuccess(res, attachments);
    } catch (err) {
      console.error('getByTask attachments error:', err);
      return sendError(res, 'Failed to fetch attachments', 500);
    }
  },

  /**
   * POST /api/tasks/:id/attachments
   * Multer (memoryStorage) populates req.file with:
   *   - req.file.buffer       — file content as Buffer
   *   - req.file.originalname — original filename from the client
   *   - req.file.mimetype     — MIME type
   *   - req.file.size         — file size in bytes
   */
  async upload(req, res) {
    try {
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const taskId = req.params.id;

      const task = await Task.findById(taskId);
      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      // Build a unique storage path within the bucket:
      //   tasks/<taskId>/<timestamp>-<random><ext>
      // Organising by taskId makes bucket management easier.
      const ext         = path.extname(req.file.originalname).toLowerCase();
      const unique      = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const storagePath = `tasks/${taskId}/${unique}${ext}`;

      // Upload the Buffer to Supabase Storage — returns a public URL
      const publicUrl = await uploadFile({
        buffer:      req.file.buffer,
        storagePath,
        mimeType:    req.file.mimetype,
      });

      // Save metadata to DB — FilePath stores the public URL
      const newId = await Attachment.create({
        taskId,
        userId:   req.user.UserID,
        fileName: req.file.originalname,  // Original name shown to users
        filePath: publicUrl,               // Full Supabase public URL
        fileType: req.file.mimetype,
      });

      return sendSuccess(res, { AttachmentID: newId }, 'File uploaded successfully', 201);
    } catch (err) {
      console.error('upload attachment error:', err);
      return sendError(res, 'Failed to upload file', 500);
    }
  },

  /**
   * DELETE /api/attachments/:id
   * Deletes from Supabase Storage bucket AND removes the DB record.
   */
  async delete(req, res) {
    try {
      const attachment = await Attachment.findById(req.params.id);
      if (!attachment) return sendError(res, 'Attachment not found', 404);

      if (attachment.UserID !== req.user.UserID && req.user.RoleName !== 'Admin') {
        return sendError(res, 'You can only delete your own attachments', 403);
      }

      // Extract the storage path from the public URL and delete from bucket
      const storagePath = extractStoragePath(attachment.FilePath);
      await deleteFile(storagePath);

      // Delete the DB record
      await Attachment.delete(req.params.id);
      return sendSuccess(res, null, 'Attachment deleted');
    } catch (err) {
      console.error('delete attachment error:', err);
      return sendError(res, 'Failed to delete attachment', 500);
    }
  },

  /**
   * GET /api/attachments/:id/download
   * Redirects the browser to the Supabase public URL.
   * The file is served directly from Supabase CDN — not through this server.
   */
  async download(req, res) {
    try {
      const attachment = await Attachment.findById(req.params.id);
      if (!attachment) return sendError(res, 'Attachment not found', 404);

      // FilePath is now the full public Supabase URL — redirect directly
      res.redirect(attachment.FilePath);
    } catch (err) {
      console.error('download attachment error:', err);
      return sendError(res, 'Failed to download file', 500);
    }
  },
};

module.exports = attachmentController;

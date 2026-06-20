/**
 * controllers/attachmentController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles file uploads and fetching attachments for a task.
 *
 * HOW FILE UPLOAD WORKS:
 *   1. Client sends a POST request with Content-Type: multipart/form-data
 *   2. The upload middleware (Multer) intercepts the request, saves the file
 *      to the /uploads folder on disk, and attaches file info to req.file
 *   3. This controller then saves the file metadata (name, path, type) to MySQL
 *   4. The database stores the path — not the file itself (files stay on disk)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs         = require('fs');
const path       = require('path');
const Attachment = require('../models/Attachment');
const Task       = require('../models/Task');
const { sendSuccess, sendError } = require('../utils/response');

const attachmentController = {

  /**
   * GET /api/tasks/:id/attachments
   * List all attachments for a task.
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
   * Upload a file and save metadata to the database.
   * The Multer middleware runs before this and populates req.file.
   */
  async upload(req, res) {
    try {
      // If Multer didn't attach a file, the request had no file field
      if (!req.file) {
        return sendError(res, 'No file uploaded', 400);
      }

      const taskId = req.params.id;

      // Verify the task exists
      const task = await Task.findById(taskId);
      if (!task) {
        // Clean up the orphaned file from disk
        fs.unlinkSync(req.file.path);
        return sendError(res, 'Task not found', 404);
      }

      // Save the metadata to the database
      const newId = await Attachment.create({
        taskId,
        userId:   req.user.UserID,
        fileName: req.file.originalname,  // Original name shown to users
        filePath: req.file.filename,       // Unique name stored on disk
        fileType: req.file.mimetype,
      });

      return sendSuccess(res, { AttachmentID: newId }, 'File uploaded successfully', 201);
    } catch (err) {
      console.error('upload attachment error:', err);
      // Clean up file if DB save failed
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return sendError(res, 'Failed to upload file', 500);
    }
  },

  /**
   * DELETE /api/attachments/:id
   * Deletes a file from disk AND removes the DB record.
   */
  async delete(req, res) {
    try {
      const attachment = await Attachment.findById(req.params.id);
      if (!attachment) return sendError(res, 'Attachment not found', 404);

      // Only the uploader or an Admin can delete
      if (attachment.UserID !== req.user.UserID && req.user.RoleName !== 'Admin') {
        return sendError(res, 'You can only delete your own attachments', 403);
      }

      // Delete the physical file from disk
      const uploadDir  = process.env.UPLOAD_DIR || 'uploads';
      const filePath   = path.join(__dirname, '../../', uploadDir, attachment.FilePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete the database record
      await Attachment.delete(req.params.id);
      return sendSuccess(res, null, 'Attachment deleted');
    } catch (err) {
      console.error('delete attachment error:', err);
      return sendError(res, 'Failed to delete attachment', 500);
    }
  },

  /**
   * GET /api/attachments/:id/download
   * Streams the file to the browser for download.
   */
  async download(req, res) {
    try {
      const attachment = await Attachment.findById(req.params.id);
      if (!attachment) return sendError(res, 'Attachment not found', 404);

      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      const filePath  = path.join(__dirname, '../../', uploadDir, attachment.FilePath);

      if (!fs.existsSync(filePath)) {
        return sendError(res, 'File not found on server', 404);
      }

      // Set headers so the browser treats this as a file download
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.FileName}"`);
      res.setHeader('Content-Type', attachment.FileType || 'application/octet-stream');
      res.sendFile(filePath);
    } catch (err) {
      console.error('download attachment error:', err);
      return sendError(res, 'Failed to download file', 500);
    }
  },
};

module.exports = attachmentController;

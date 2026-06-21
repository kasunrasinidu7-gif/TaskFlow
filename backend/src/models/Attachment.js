/**
 * models/Attachment.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Attachment Model — SQL for the attachments table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

const Attachment = {

  /**
   * Get all attachments for a task.
   * Includes the uploader's name.
   */
  async findByTask(taskId) {
    const [rows] = await pool.execute(
      `SELECT a.*, u.Name AS UploaderName
       FROM attachments a
       JOIN users u ON a.UserID = u.UserID
       WHERE a.TaskID = ?
       ORDER BY a.UploadedAt DESC`,
      [taskId]
    );
    return rows;
  },

  /**
   * Save a new attachment record after the file has been uploaded to disk.
   */
  async create({ taskId, userId, fileName, filePath, fileType }) {
    const [result] = await pool.execute(
      `INSERT INTO attachments (TaskID, UserID, FileName, FilePath, FileType)
       VALUES (?, ?, ?, ?, ?)`,
      [taskId, userId, fileName, filePath, fileType || null]
    );
    return result.insertId;
  },

  /**
   * Find a single attachment by ID.
   * Used to check ownership and get the file path before deletion.
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM attachments WHERE AttachmentID = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Delete an attachment record.
   * The controller is responsible for also deleting the file from disk.
   */
  async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM attachments WHERE AttachmentID = ?`,
      [id]
    );
    return result.affectedRows;
  },
};

module.exports = Attachment;

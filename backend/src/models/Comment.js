/**
 * models/Comment.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Comment Model — SQL for the comments table.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

const Comment = {

  /**
   * Get all comments for a specific task, ordered oldest-first.
   * Includes the commenter's name so the frontend can display it.
   */
  async findByTask(taskId) {
    const [rows] = await pool.execute(
      `SELECT c.CommentID, c.TaskID, c.CommentText, c.CreatedAt,
              u.UserID, u.Name AS UserName
       FROM comments c
       JOIN users u ON c.UserID = u.UserID
       WHERE c.TaskID = ?
       ORDER BY c.CreatedAt ASC`,
      [taskId]
    );
    return rows;
  },

  /**
   * Add a new comment to a task.
   */
  async create(taskId, userId, commentText) {
    const [result] = await pool.execute(
      `INSERT INTO comments (TaskID, UserID, CommentText) VALUES (?, ?, ?)`,
      [taskId, userId, commentText]
    );
    return result.insertId;
  },

  /**
   * Find a comment by ID (used to check ownership before delete).
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM comments WHERE CommentID = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Delete a comment.
   */
  async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM comments WHERE CommentID = ?`,
      [id]
    );
    return result.affectedRows;
  },
};

module.exports = Comment;

/**
 * models/Comment.js — Supabase PostgreSQL version.
 */

const pool = require('../config/db');

const Comment = {

  async findByTask(taskId) {
    const [rows] = await pool.execute(
      `SELECT c.commentid   AS "CommentID",
              c.taskid      AS "TaskID",
              c.commenttext AS "CommentText",
              c.createdat   AS "CreatedAt",
              u.userid      AS "UserID",
              u.name        AS "UserName"
       FROM comments c
       JOIN users u ON c.userid = u.userid
       WHERE c.taskid = ?
       ORDER BY c.createdat ASC`,
      [taskId]
    );
    return rows;
  },

  async create(taskId, userId, commentText) {
    const [rows] = await pool.execute(
      `INSERT INTO comments (taskid, userid, commenttext) VALUES (?, ?, ?)
       RETURNING commentid AS id`,
      [taskId, userId, commentText]
    );
    return rows[0].id;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT commentid AS "CommentID", taskid AS "TaskID",
              userid AS "UserID", commenttext AS "CommentText", createdat AS "CreatedAt"
       FROM comments WHERE commentid = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const [, meta] = await pool.execute(
      `DELETE FROM comments WHERE commentid = ?`,
      [id]
    );
    return meta.rowCount;
  },
};

module.exports = Comment;

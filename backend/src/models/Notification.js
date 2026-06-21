/**
 * models/Notification.js
 * SQL for the notifications table.
 *
 * FIX: findByUser used LIMIT ? with integer — mysql2 pool.execute() rejects this.
 * Solved by interpolating the integer directly into the SQL string (safe because
 * it's our own internal constant, not user input).
 */

const pool = require('../config/db');

const Notification = {

  /**
   * FIX: Use template literal for LIMIT instead of ? placeholder.
   * mysql2 pool.execute() does not accept JS integers as bound parameters for LIMIT.
   */
  async findByUser(userId, limit = 50) {
    const safeLimit = parseInt(limit, 10);
    const [rows] = await pool.execute(
      `SELECT n.*, t.Title AS TaskTitle
       FROM notifications n
       LEFT JOIN tasks t ON n.TaskID = t.TaskID
       WHERE n.UserID = ?
       ORDER BY n.CreatedAt DESC
       LIMIT ${safeLimit}`,
      [userId]
    );
    return rows;
  },

  async countUnread(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM notifications WHERE UserID = ? AND IsRead = 0`,
      [userId]
    );
    return rows[0].count;
  },

  async create({ userId, taskId, message }) {
    const [result] = await pool.execute(
      `INSERT INTO notifications (UserID, TaskID, Message)
       VALUES (?, ?, ?)`,
      [userId, taskId || null, message]
    );
    const [rows] = await pool.execute(
      `SELECT * FROM notifications WHERE NotificationID = ?`,
      [result.insertId]
    );
    return rows[0];
  },

  async markRead(notificationId, userId) {
    const [result] = await pool.execute(
      `UPDATE notifications SET IsRead = 1
       WHERE NotificationID = ? AND UserID = ?`,
      [notificationId, userId]
    );
    return result.affectedRows;
  },

  async markAllRead(userId) {
    const [result] = await pool.execute(
      `UPDATE notifications SET IsRead = 1 WHERE UserID = ? AND IsRead = 0`,
      [userId]
    );
    return result.affectedRows;
  },
};

module.exports = Notification;

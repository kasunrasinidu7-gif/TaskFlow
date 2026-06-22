/**
 * models/Notification.js — Supabase PostgreSQL version.
 *
 * Changes from MySQL:
 *   - LIMIT ? now works natively with pg — no integer interpolation workaround needed
 *   - IsRead stored as BOOLEAN — pg returns true/false directly
 *   - INSERT ... RETURNING notificationid gives us the new ID directly
 *   - All column names aliased with quoted casing
 */

const pool = require('../config/db');

const Notification = {

  async findByUser(userId, limit = 50) {
    const [rows] = await pool.execute(
      `SELECT n.notificationid AS "NotificationID",
              n.userid         AS "UserID",
              n.taskid         AS "TaskID",
              n.message        AS "Message",
              n.isread         AS "IsRead",
              n.createdat      AS "CreatedAt",
              t.title          AS "TaskTitle"
       FROM notifications n
       LEFT JOIN tasks t ON n.taskid = t.taskid
       WHERE n.userid = ?
       ORDER BY n.createdat DESC
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  },

  async countUnread(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM notifications WHERE userid = ? AND isread = false`,
      [userId]
    );
    // pg returns COUNT as a string — parse to int
    return parseInt(rows[0].count, 10);
  },

  async create({ userId, taskId, message }) {
    const [rows] = await pool.execute(
      `INSERT INTO notifications (userid, taskid, message)
       VALUES (?, ?, ?)
       RETURNING notificationid AS id`,
      [userId, taskId || null, message]
    );
    const newId = rows[0].id;

    // Fetch the full row so the returned shape matches what controllers expect
    const [full] = await pool.execute(
      `SELECT notificationid AS "NotificationID",
              userid AS "UserID", taskid AS "TaskID",
              message AS "Message", isread AS "IsRead", createdat AS "CreatedAt"
       FROM notifications WHERE notificationid = ?`,
      [newId]
    );
    return full[0];
  },

  async markRead(notificationId, userId) {
    const [, meta] = await pool.execute(
      `UPDATE notifications SET isread = true
       WHERE notificationid = ? AND userid = ?`,
      [notificationId, userId]
    );
    return meta.rowCount;
  },

  async markAllRead(userId) {
    const [, meta] = await pool.execute(
      `UPDATE notifications SET isread = true WHERE userid = ? AND isread = false`,
      [userId]
    );
    return meta.rowCount;
  },
};

module.exports = Notification;

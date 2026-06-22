/**
 * models/Attachment.js — Supabase PostgreSQL version.
 */

const pool = require('../config/db');

const Attachment = {

  async findByTask(taskId) {
    const [rows] = await pool.execute(
      `SELECT a.attachmentid AS "AttachmentID",
              a.taskid       AS "TaskID",
              a.userid       AS "UserID",
              a.filename     AS "FileName",
              a.filepath     AS "FilePath",
              a.filetype     AS "FileType",
              a.uploadedat   AS "UploadedAt",
              u.name         AS "UploaderName"
       FROM attachments a
       JOIN users u ON a.userid = u.userid
       WHERE a.taskid = ?
       ORDER BY a.uploadedat DESC`,
      [taskId]
    );
    return rows;
  },

  async create({ taskId, userId, fileName, filePath, fileType }) {
    const [rows] = await pool.execute(
      `INSERT INTO attachments (taskid, userid, filename, filepath, filetype)
       VALUES (?, ?, ?, ?, ?)
       RETURNING attachmentid AS id`,
      [taskId, userId, fileName, filePath, fileType || null]
    );
    return rows[0].id;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT attachmentid AS "AttachmentID",
              taskid AS "TaskID", userid AS "UserID",
              filename AS "FileName", filepath AS "FilePath",
              filetype AS "FileType", uploadedat AS "UploadedAt"
       FROM attachments WHERE attachmentid = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async delete(id) {
    const [, meta] = await pool.execute(
      `DELETE FROM attachments WHERE attachmentid = ?`,
      [id]
    );
    return meta.rowCount;
  },
};

module.exports = Attachment;

/**
 * models/Task.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Task Model — Supabase PostgreSQL version.
 *
 * Key changes from MySQL:
 *   - GROUP_CONCAT(DISTINCT x SEPARATOR ', ') → STRING_AGG(DISTINCT x, ', ')
 *   - CURDATE()  → CURRENT_DATE
 *   - INSERT IGNORE → ON CONFLICT DO NOTHING
 *   - LIMIT ? now works natively in pg — no integer workaround needed
 *   - All column names aliased with quoted casing for controller compatibility
 *   - GROUP BY must include all non-aggregate columns (PostgreSQL strict mode)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

const Task = {

  async findAll({ search = '', status = '', priority = '', projectId = '', userId, roleName } = {}) {
    let sql = `
      SELECT t.taskid      AS "TaskID",
             t.projectid   AS "ProjectID",
             t.title       AS "Title",
             t.description AS "Description",
             t.priority    AS "Priority",
             t.status      AS "Status",
             t.duedate     AS "DueDate",
             t.createdby   AS "CreatedBy",
             t.createdat   AS "CreatedAt",
             t.updatedat   AS "UpdatedAt",
             p.projectname AS "ProjectName",
             u.name        AS "CreatorName",
             STRING_AGG(DISTINCT au.name, ', ') AS "AssignedUsers"
      FROM tasks t
      JOIN projects p ON t.projectid = p.projectid
      JOIN users u ON t.createdby = u.userid
      LEFT JOIN assigned_tasks at2 ON t.taskid = at2.taskid
      LEFT JOIN users au ON at2.userid = au.userid
    `;
    const params = [];

    if (roleName === 'Collaborator') {
      sql += `
        WHERE EXISTS (
          SELECT 1 FROM assigned_tasks atc
          WHERE atc.taskid = t.taskid AND atc.userid = ?
        )
      `;
      params.push(userId);
    } else {
      sql += ` WHERE 1=1`;
    }

    if (search) {
      sql += ` AND t.title ILIKE ?`;
      params.push(`%${search}%`);
    }
    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND t.priority = ?`;
      params.push(priority);
    }
    if (projectId) {
      sql += ` AND t.projectid = ?`;
      params.push(projectId);
    }

    // PostgreSQL: GROUP BY must list every non-aggregate SELECT column
    sql += `
      GROUP BY t.taskid, p.projectname, u.name
      ORDER BY t.createdat DESC
    `;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async findById(id) {
    const [tasks] = await pool.execute(
      `SELECT t.taskid      AS "TaskID",
              t.projectid   AS "ProjectID",
              t.title       AS "Title",
              t.description AS "Description",
              t.priority    AS "Priority",
              t.status      AS "Status",
              t.duedate     AS "DueDate",
              t.createdby   AS "CreatedBy",
              t.createdat   AS "CreatedAt",
              t.updatedat   AS "UpdatedAt",
              p.projectname AS "ProjectName",
              u.name        AS "CreatorName"
       FROM tasks t
       JOIN projects p ON t.projectid = p.projectid
       JOIN users u ON t.createdby = u.userid
       WHERE t.taskid = ?`,
      [id]
    );
    if (!tasks[0]) return null;

    const [assignees] = await pool.execute(
      `SELECT u.userid      AS "UserID",
              u.name        AS "Name",
              u.email       AS "Email",
              r.rolename    AS "RoleName",
              at2.assigneddate AS "AssignedDate"
       FROM assigned_tasks at2
       JOIN users u ON at2.userid = u.userid
       JOIN roles r ON u.roleid = r.roleid
       WHERE at2.taskid = ?`,
      [id]
    );

    return { ...tasks[0], assignees };
  },

  async create({ projectId, title, description, priority, status, dueDate, createdBy }) {
    const [rows] = await pool.execute(
      `INSERT INTO tasks (projectid, title, description, priority, status, duedate, createdby)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       RETURNING taskid AS id`,
      [projectId, title, description || null, priority || 'Medium', status || 'To Do', dueDate || null, createdBy]
    );
    return rows[0].id;
  },

  async update(id, { title, description, priority, status, dueDate }) {
    const [, meta] = await pool.execute(
      `UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, duedate = ?
       WHERE taskid = ?`,
      [title, description || null, priority, status, dueDate || null, id]
    );
    return meta.rowCount;
  },

  async updateStatus(id, status) {
    const [, meta] = await pool.execute(
      `UPDATE tasks SET status = ? WHERE taskid = ?`,
      [status, id]
    );
    return meta.rowCount;
  },

  async delete(id) {
    const [, meta] = await pool.execute(`DELETE FROM tasks WHERE taskid = ?`, [id]);
    return meta.rowCount;
  },

  async assignUser(taskId, userId, assignedBy) {
    await pool.execute(
      `INSERT INTO assigned_tasks (taskid, userid, assignedby) VALUES (?, ?, ?)
       ON CONFLICT (taskid, userid) DO NOTHING`,
      [taskId, userId, assignedBy]
    );
  },

  async unassignUser(taskId, userId) {
    await pool.execute(
      `DELETE FROM assigned_tasks WHERE taskid = ? AND userid = ?`,
      [taskId, userId]
    );
  },

  async isAssigned(taskId, userId) {
    const [rows] = await pool.execute(
      `SELECT 1 FROM assigned_tasks WHERE taskid = ? AND userid = ? LIMIT 1`,
      [taskId, userId]
    );
    return rows.length > 0;
  },

  async countActiveForUser(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS "activeCount"
       FROM assigned_tasks at2
       JOIN tasks t ON at2.taskid = t.taskid
       WHERE at2.userid = ?
         AND t.status != 'Completed'`,
      [userId]
    );
    return parseInt(rows[0].activeCount, 10);
  },

  async findByProject(projectId) {
    const [rows] = await pool.execute(
      `SELECT t.taskid      AS "TaskID",
              t.projectid   AS "ProjectID",
              t.title       AS "Title",
              t.description AS "Description",
              t.priority    AS "Priority",
              t.status      AS "Status",
              t.duedate     AS "DueDate",
              t.createdat   AS "CreatedAt",
              t.updatedat   AS "UpdatedAt",
              STRING_AGG(DISTINCT u.name, ', ') AS "AssignedUsers"
       FROM tasks t
       LEFT JOIN assigned_tasks at2 ON t.taskid = at2.taskid
       LEFT JOIN users u ON at2.userid = u.userid
       WHERE t.projectid = ?
       GROUP BY t.taskid
       ORDER BY t.priority DESC, t.duedate ASC`,
      [projectId]
    );
    return rows;
  },

  async getStats(userId, roleName) {
    let sql, params;

    if (roleName === 'Collaborator') {
      sql = `
        SELECT
          COUNT(*)                                                                    AS total,
          SUM(CASE WHEN t.status = 'Completed'   THEN 1 ELSE 0 END)                AS completed,
          SUM(CASE WHEN t.status = 'In Progress'  THEN 1 ELSE 0 END)               AS "inProgress",
          SUM(CASE WHEN t.status = 'To Do'        THEN 1 ELSE 0 END)               AS todo,
          SUM(CASE WHEN t.duedate < CURRENT_DATE AND t.status != 'Completed' THEN 1 ELSE 0 END) AS overdue
        FROM tasks t
        JOIN assigned_tasks at2 ON t.taskid = at2.taskid
        WHERE at2.userid = ?
      `;
      params = [userId];
    } else {
      sql = `
        SELECT
          COUNT(*)                                                                    AS total,
          SUM(CASE WHEN status = 'Completed'   THEN 1 ELSE 0 END)                  AS completed,
          SUM(CASE WHEN status = 'In Progress'  THEN 1 ELSE 0 END)                 AS "inProgress",
          SUM(CASE WHEN status = 'To Do'        THEN 1 ELSE 0 END)                 AS todo,
          SUM(CASE WHEN duedate < CURRENT_DATE AND status != 'Completed' THEN 1 ELSE 0 END) AS overdue
        FROM tasks
      `;
      params = [];
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0];
  },

  async getRecent(userId, roleName, limit = 5) {
    // pg accepts LIMIT $N with integer params natively — no workaround needed
    let sql, params;

    if (roleName === 'Collaborator') {
      sql = `
        SELECT t.taskid      AS "TaskID",
               t.title       AS "Title",
               t.status      AS "Status",
               t.priority    AS "Priority",
               t.duedate     AS "DueDate",
               p.projectname AS "ProjectName"
        FROM tasks t
        JOIN projects p ON t.projectid = p.projectid
        JOIN assigned_tasks at2 ON t.taskid = at2.taskid
        WHERE at2.userid = ?
        ORDER BY t.updatedat DESC
        LIMIT ?
      `;
      params = [userId, limit];
    } else {
      sql = `
        SELECT t.taskid      AS "TaskID",
               t.title       AS "Title",
               t.status      AS "Status",
               t.priority    AS "Priority",
               t.duedate     AS "DueDate",
               p.projectname AS "ProjectName"
        FROM tasks t
        JOIN projects p ON t.projectid = p.projectid
        ORDER BY t.updatedat DESC
        LIMIT ?
      `;
      params = [limit];
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async getDueToday() {
    const [rows] = await pool.execute(
      `SELECT t.taskid      AS "TaskID",
              t.title       AS "Title",
              t.projectid   AS "ProjectID",
              p.projectname AS "ProjectName",
              at2.userid    AS "UserID"
       FROM tasks t
       JOIN projects p ON t.projectid = p.projectid
       JOIN assigned_tasks at2 ON t.taskid = at2.taskid
       WHERE t.duedate::date = CURRENT_DATE
         AND t.status != 'Completed'
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.taskid  = t.taskid
             AND n.userid  = at2.userid
             AND n.message LIKE 'Reminder:%'
             AND n.createdat::date = CURRENT_DATE
         )`,
      []
    );
    return rows;
  },
};

module.exports = Task;

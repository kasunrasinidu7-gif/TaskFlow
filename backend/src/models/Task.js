/**
 * models/Task.js
 * All SQL queries for the tasks and assigned_tasks tables.
 *
 * IMPORTANT FIX: mysql2 pool.execute() does NOT accept JS integers for LIMIT ?.
 * All LIMIT params must be cast to integer with parseInt() before use.
 */

const pool = require('../config/db');

const Task = {

  async findAll({ search = '', status = '', priority = '', projectId = '', userId, roleName } = {}) {
    let sql = `
      SELECT t.*,
             p.ProjectName,
             u.Name AS CreatorName,
             GROUP_CONCAT(DISTINCT au.Name SEPARATOR ', ') AS AssignedUsers
      FROM tasks t
      JOIN projects p ON t.ProjectID = p.ProjectID
      JOIN users u ON t.CreatedBy = u.UserID
      LEFT JOIN assigned_tasks at2 ON t.TaskID = at2.TaskID
      LEFT JOIN users au ON at2.UserID = au.UserID
    `;
    const params = [];

    if (roleName === 'Collaborator') {
      sql += `
        WHERE EXISTS (
          SELECT 1 FROM assigned_tasks atc
          WHERE atc.TaskID = t.TaskID AND atc.UserID = ?
        )
      `;
      params.push(userId);
    } else {
      sql += ` WHERE 1=1`;
    }

    if (search) {
      sql += ` AND t.Title LIKE ?`;
      params.push(`%${search}%`);
    }
    if (status) {
      sql += ` AND t.Status = ?`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND t.Priority = ?`;
      params.push(priority);
    }
    if (projectId) {
      sql += ` AND t.ProjectID = ?`;
      params.push(projectId);
    }

    sql += ` GROUP BY t.TaskID ORDER BY t.CreatedAt DESC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async findById(id) {
    const [tasks] = await pool.execute(
      `SELECT t.*, p.ProjectName, u.Name AS CreatorName
       FROM tasks t
       JOIN projects p ON t.ProjectID = p.ProjectID
       JOIN users u ON t.CreatedBy = u.UserID
       WHERE t.TaskID = ?`,
      [id]
    );
    if (!tasks[0]) return null;

    const [assignees] = await pool.execute(
      `SELECT u.UserID, u.Name, u.Email, r.RoleName, at2.AssignedDate
       FROM assigned_tasks at2
       JOIN users u ON at2.UserID = u.UserID
       JOIN roles r ON u.RoleID = r.RoleID
       WHERE at2.TaskID = ?`,
      [id]
    );

    return { ...tasks[0], assignees };
  },

  async create({ projectId, title, description, priority, status, dueDate, createdBy }) {
    const [result] = await pool.execute(
      `INSERT INTO tasks (ProjectID, Title, Description, Priority, Status, DueDate, CreatedBy)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [projectId, title, description || null, priority || 'Medium', status || 'To Do', dueDate || null, createdBy]
    );
    return result.insertId;
  },

  async update(id, { title, description, priority, status, dueDate }) {
    const [result] = await pool.execute(
      `UPDATE tasks SET Title = ?, Description = ?, Priority = ?, Status = ?, DueDate = ?
       WHERE TaskID = ?`,
      [title, description || null, priority, status, dueDate || null, id]
    );
    return result.affectedRows;
  },

  async updateStatus(id, status) {
    const [result] = await pool.execute(
      `UPDATE tasks SET Status = ? WHERE TaskID = ?`,
      [status, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await pool.execute(`DELETE FROM tasks WHERE TaskID = ?`, [id]);
    return result.affectedRows;
  },

  async assignUser(taskId, userId, assignedBy) {
    await pool.execute(
      `INSERT IGNORE INTO assigned_tasks (TaskID, UserID, AssignedBy) VALUES (?, ?, ?)`,
      [taskId, userId, assignedBy]
    );
  },

  async unassignUser(taskId, userId) {
    await pool.execute(
      `DELETE FROM assigned_tasks WHERE TaskID = ? AND UserID = ?`,
      [taskId, userId]
    );
  },

  async isAssigned(taskId, userId) {
    const [rows] = await pool.execute(
      `SELECT 1 FROM assigned_tasks WHERE TaskID = ? AND UserID = ? LIMIT 1`,
      [taskId, userId]
    );
    return rows.length > 0;
  },

  /**
   * Count how many ACTIVE (non-completed) tasks a collaborator currently has.
   * Used to enforce the 10-active-task limit before assignment.
   * ACTIVE = Status is NOT 'Completed'.
   */
  async countActiveForUser(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS activeCount
       FROM assigned_tasks at2
       JOIN tasks t ON at2.TaskID = t.TaskID
       WHERE at2.UserID = ?
         AND t.Status != 'Completed'`,
      [userId]
    );
    return parseInt(rows[0].activeCount, 10);
  },

  async findByProject(projectId) {
    const [rows] = await pool.execute(
      `SELECT t.*,
              GROUP_CONCAT(DISTINCT u.Name SEPARATOR ', ') AS AssignedUsers
       FROM tasks t
       LEFT JOIN assigned_tasks at2 ON t.TaskID = at2.TaskID
       LEFT JOIN users u ON at2.UserID = u.UserID
       WHERE t.ProjectID = ?
       GROUP BY t.TaskID
       ORDER BY t.Priority DESC, t.DueDate ASC`,
      [projectId]
    );
    return rows;
  },

  async getStats(userId, roleName) {
    let sql, params;

    if (roleName === 'Collaborator') {
      sql = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN t.Status = 'Completed'   THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN t.Status = 'In Progress'  THEN 1 ELSE 0 END) AS inProgress,
          SUM(CASE WHEN t.Status = 'To Do'        THEN 1 ELSE 0 END) AS todo,
          SUM(CASE WHEN t.DueDate < CURDATE() AND t.Status != 'Completed' THEN 1 ELSE 0 END) AS overdue
        FROM tasks t
        JOIN assigned_tasks at2 ON t.TaskID = at2.TaskID
        WHERE at2.UserID = ?
      `;
      params = [userId];
    } else {
      sql = `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN Status = 'Completed'   THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN Status = 'In Progress'  THEN 1 ELSE 0 END) AS inProgress,
          SUM(CASE WHEN Status = 'To Do'        THEN 1 ELSE 0 END) AS todo,
          SUM(CASE WHEN DueDate < CURDATE() AND Status != 'Completed' THEN 1 ELSE 0 END) AS overdue
        FROM tasks
      `;
      params = [];
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0];
  },

  /**
   * FIX: Cast limit to integer string for mysql2 compatibility.
   * mysql2 pool.execute() rejects raw JS integers for LIMIT ?.
   */
  async getRecent(userId, roleName, limit = 5) {
    const safeLimit = parseInt(limit, 10);
    let sql, params;

    if (roleName === 'Collaborator') {
      sql = `
        SELECT t.TaskID, t.Title, t.Status, t.Priority, t.DueDate, p.ProjectName
        FROM tasks t
        JOIN projects p ON t.ProjectID = p.ProjectID
        JOIN assigned_tasks at2 ON t.TaskID = at2.TaskID
        WHERE at2.UserID = ?
        ORDER BY t.UpdatedAt DESC
        LIMIT ${safeLimit}
      `;
      params = [userId];
    } else {
      sql = `
        SELECT t.TaskID, t.Title, t.Status, t.Priority, t.DueDate, p.ProjectName
        FROM tasks t
        JOIN projects p ON t.ProjectID = p.ProjectID
        ORDER BY t.UpdatedAt DESC
        LIMIT ${safeLimit}
      `;
      params = [];
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Get all tasks due today that have not already had a deadline notification sent.
   * Used by the deadline notification scheduler in server.js.
   */
  async getDueToday() {
    const [rows] = await pool.execute(
      `SELECT t.TaskID, t.Title, t.ProjectID, p.ProjectName,
              at2.UserID
       FROM tasks t
       JOIN projects p ON t.ProjectID = p.ProjectID
       JOIN assigned_tasks at2 ON t.TaskID = at2.TaskID
       WHERE DATE(t.DueDate) = CURDATE()
         AND t.Status != 'Completed'
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.TaskID  = t.TaskID
             AND n.UserID  = at2.UserID
             AND n.Message LIKE 'Reminder:%'
             AND DATE(n.CreatedAt) = CURDATE()
         )`,
      []
    );
    return rows;
  },
};

module.exports = Task;

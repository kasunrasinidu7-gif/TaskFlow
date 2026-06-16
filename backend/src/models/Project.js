/**
 * models/Project.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Project Model — all SQL for the projects and project_members tables.
 *
 * KEY BUSINESS RULE (from SRS):
 *   Collaborators must ONLY see projects they are assigned to.
 *   This is enforced in findAll() by checking project_members when the
 *   requesting user is a Collaborator.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

const Project = {

  /**
   * Get all projects.
   * - Admin / Project Manager: sees all projects
   * - Collaborator: sees ONLY projects where they are a member
   *
   * Also supports search by name and filter by status.
   */
  async findAll({ search = '', status = '', userId, roleName } = {}) {
    let sql = `
      SELECT p.*,
             u.Name AS CreatorName,
             COUNT(DISTINCT pm.UserID) AS MemberCount,
             COUNT(DISTINCT t.TaskID)  AS TaskCount
      FROM projects p
      JOIN users u ON p.CreatedBy = u.UserID
      LEFT JOIN project_members pm ON p.ProjectID = pm.ProjectID
      LEFT JOIN tasks t ON t.ProjectID = p.ProjectID
    `;
    const params = [];

    // Collaborators only see their own projects
    if (roleName === 'Collaborator') {
      sql += ` WHERE pm.UserID = ?`;
      params.push(userId);
    } else {
      sql += ` WHERE 1=1`;
    }

    if (search) {
      sql += ` AND p.ProjectName LIKE ?`;
      params.push(`%${search}%`);
    }
    if (status) {
      sql += ` AND p.Status = ?`;
      params.push(status);
    }

    sql += ` GROUP BY p.ProjectID ORDER BY p.CreatedAt DESC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Get a single project by ID, including the list of members.
   */
  async findById(id) {
    // Get project details
    const [projects] = await pool.execute(
      `SELECT p.*, u.Name AS CreatorName
       FROM projects p
       JOIN users u ON p.CreatedBy = u.UserID
       WHERE p.ProjectID = ?`,
      [id]
    );
    if (!projects[0]) return null;

    // Get members of this project
    const [members] = await pool.execute(
      `SELECT u.UserID, u.Name, u.Email, r.RoleName
       FROM project_members pm
       JOIN users u ON pm.UserID = u.UserID
       JOIN roles r ON u.RoleID = r.RoleID
       WHERE pm.ProjectID = ?`,
      [id]
    );

    return { ...projects[0], members };
  },

  /**
   * Create a new project.
   */
  async create({ projectName, description, createdBy }) {
    const [result] = await pool.execute(
      `INSERT INTO projects (ProjectName, Description, CreatedBy)
       VALUES (?, ?, ?)`,
      [projectName, description || null, createdBy]
    );
    return result.insertId;
  },

  /**
   * Update a project's name, description, and/or status.
   */
  async update(id, { projectName, description, status }) {
    const [result] = await pool.execute(
      `UPDATE projects SET ProjectName = ?, Description = ?, Status = ?
       WHERE ProjectID = ?`,
      [projectName, description || null, status, id]
    );
    return result.affectedRows;
  },

  /**
   * Delete a project.
   * Because of ON DELETE CASCADE in the schema, this also deletes:
   *   - project_members rows
   *   - tasks (and their comments, attachments, notifications, assigned_tasks)
   */
  async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM projects WHERE ProjectID = ?`,
      [id]
    );
    return result.affectedRows;
  },

  /**
   * Add a user as a member of a project.
   * INSERT IGNORE means if they're already a member, nothing happens.
   */
  async addMember(projectId, userId) {
    await pool.execute(
      `INSERT IGNORE INTO project_members (ProjectID, UserID) VALUES (?, ?)`,
      [projectId, userId]
    );
  },

  /**
   * Remove a user from a project.
   */
  async removeMember(projectId, userId) {
    const [result] = await pool.execute(
      `DELETE FROM project_members WHERE ProjectID = ? AND UserID = ?`,
      [projectId, userId]
    );
    return result.affectedRows;
  },

  /**
   * Check if a user is a member of a specific project.
   * Used for authorization checks.
   */
  async isMember(projectId, userId) {
    const [rows] = await pool.execute(
      `SELECT 1 FROM project_members
       WHERE ProjectID = ? AND UserID = ?
       LIMIT 1`,
      [projectId, userId]
    );
    return rows.length > 0;
  },

  /**
   * Dashboard statistics — total counts for projects.
   */
  async getStats(userId, roleName) {
    let sql, params;

    if (roleName === 'Collaborator') {
      sql = `
        SELECT
          COUNT(*)                                                        AS total,
          SUM(CASE WHEN p.Status = 'Active'    THEN 1 ELSE 0 END)       AS active,
          SUM(CASE WHEN p.Status = 'Completed' THEN 1 ELSE 0 END)       AS completed,
          SUM(CASE WHEN p.Status = 'On Hold'   THEN 1 ELSE 0 END)       AS onHold,
          SUM(CASE WHEN p.Status = 'Cancelled' THEN 1 ELSE 0 END)       AS cancelled
        FROM projects p
        JOIN project_members pm ON p.ProjectID = pm.ProjectID
        WHERE pm.UserID = ?
      `;
      params = [userId];
    } else {
      sql = `
        SELECT
          COUNT(*)                                                        AS total,
          SUM(CASE WHEN Status = 'Active'    THEN 1 ELSE 0 END)         AS active,
          SUM(CASE WHEN Status = 'Completed' THEN 1 ELSE 0 END)         AS completed,
          SUM(CASE WHEN Status = 'On Hold'   THEN 1 ELSE 0 END)         AS onHold,
          SUM(CASE WHEN Status = 'Cancelled' THEN 1 ELSE 0 END)         AS cancelled
        FROM projects
      `;
      params = [];
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0];
  },
};

module.exports = Project;

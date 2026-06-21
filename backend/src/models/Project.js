/**
 * models/Project.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Project Model — Supabase PostgreSQL version.
 *
 * Changes from MySQL:
 *   - All column aliases quoted to preserve casing for controllers
 *   - GROUP BY p.projectid (PostgreSQL requires all non-aggregate SELECTs in GROUP BY)
 *   - INSERT IGNORE → ON CONFLICT DO NOTHING
 *   - LIKE → ILIKE for case-insensitive search
 *   - result.insertId → rows[0].id via RETURNING id
 *   - result.affectedRows → meta.rowCount
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

const Project = {

  async findAll({ search = '', status = '', userId, roleName } = {}) {
    let sql = `
      SELECT p.projectid    AS "ProjectID",
             p.projectname  AS "ProjectName",
             p.description  AS "Description",
             p.status       AS "Status",
             p.createdby    AS "CreatedBy",
             p.createdat    AS "CreatedAt",
             p.updatedat    AS "UpdatedAt",
             u.name         AS "CreatorName",
             COUNT(DISTINCT pm.userid) AS "MemberCount",
             COUNT(DISTINCT t.taskid)  AS "TaskCount"
      FROM projects p
      JOIN users u ON p.createdby = u.userid
      LEFT JOIN project_members pm ON p.projectid = pm.projectid
      LEFT JOIN tasks t ON t.projectid = p.projectid
    `;
    const params = [];

    if (roleName === 'Collaborator') {
      sql += ` WHERE pm.userid = ?`;
      params.push(userId);
    } else {
      sql += ` WHERE 1=1`;
    }

    if (search) {
      sql += ` AND p.projectname ILIKE ?`;
      params.push(`%${search}%`);
    }
    if (status) {
      sql += ` AND p.status = ?`;
      params.push(status);
    }

    // PostgreSQL GROUP BY must list all non-aggregate selected columns
    sql += ` GROUP BY p.projectid, u.name ORDER BY p.createdat DESC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async findById(id) {
    const [projects] = await pool.execute(
      `SELECT p.projectid   AS "ProjectID",
              p.projectname AS "ProjectName",
              p.description AS "Description",
              p.status      AS "Status",
              p.createdby   AS "CreatedBy",
              p.createdat   AS "CreatedAt",
              u.name        AS "CreatorName"
       FROM projects p
       JOIN users u ON p.createdby = u.userid
       WHERE p.projectid = ?`,
      [id]
    );
    if (!projects[0]) return null;

    const [members] = await pool.execute(
      `SELECT u.userid   AS "UserID",
              u.name     AS "Name",
              u.email    AS "Email",
              r.rolename AS "RoleName"
       FROM project_members pm
       JOIN users u ON pm.userid = u.userid
       JOIN roles r ON u.roleid = r.roleid
       WHERE pm.projectid = ?`,
      [id]
    );

    return { ...projects[0], members };
  },

  async create({ projectName, description, createdBy }) {
    const [rows] = await pool.execute(
      `INSERT INTO projects (projectname, description, createdby)
       VALUES (?, ?, ?)
       RETURNING projectid AS id`,
      [projectName, description || null, createdBy]
    );
    return rows[0].id;
  },

  async update(id, { projectName, description, status }) {
    const [, meta] = await pool.execute(
      `UPDATE projects SET projectname = ?, description = ?, status = ?
       WHERE projectid = ?`,
      [projectName, description || null, status, id]
    );
    return meta.rowCount;
  },

  async delete(id) {
    const [, meta] = await pool.execute(
      `DELETE FROM projects WHERE projectid = ?`,
      [id]
    );
    return meta.rowCount;
  },

  async addMember(projectId, userId) {
    await pool.execute(
      `INSERT INTO project_members (projectid, userid) VALUES (?, ?)
       ON CONFLICT (projectid, userid) DO NOTHING`,
      [projectId, userId]
    );
  },

  async removeMember(projectId, userId) {
    const [, meta] = await pool.execute(
      `DELETE FROM project_members WHERE projectid = ? AND userid = ?`,
      [projectId, userId]
    );
    return meta.rowCount;
  },

  async isMember(projectId, userId) {
    const [rows] = await pool.execute(
      `SELECT 1 FROM project_members
       WHERE projectid = ? AND userid = ?
       LIMIT 1`,
      [projectId, userId]
    );
    return rows.length > 0;
  },

  async getStats(userId, roleName) {
    let sql, params;

    if (roleName === 'Collaborator') {
      sql = `
        SELECT
          COUNT(*)                                                         AS total,
          SUM(CASE WHEN p.status = 'Active'    THEN 1 ELSE 0 END)        AS active,
          SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END)        AS completed,
          SUM(CASE WHEN p.status = 'On Hold'   THEN 1 ELSE 0 END)        AS "onHold",
          SUM(CASE WHEN p.status = 'Cancelled' THEN 1 ELSE 0 END)        AS cancelled
        FROM projects p
        JOIN project_members pm ON p.projectid = pm.projectid
        WHERE pm.userid = ?
      `;
      params = [userId];
    } else {
      sql = `
        SELECT
          COUNT(*)                                                         AS total,
          SUM(CASE WHEN status = 'Active'    THEN 1 ELSE 0 END)          AS active,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END)          AS completed,
          SUM(CASE WHEN status = 'On Hold'   THEN 1 ELSE 0 END)          AS "onHold",
          SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END)          AS cancelled
        FROM projects
      `;
      params = [];
    }

    const [rows] = await pool.execute(sql, params);
    return rows[0];
  },
};

module.exports = Project;

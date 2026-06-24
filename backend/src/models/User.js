/**
 * models/User.js
 * ─────────────────────────────────────────────────────────────────────────────
 * User Model — Supabase PostgreSQL version.
 *
 * FIX: findAssignable() now correctly filters by projectId when provided.
 * Previously the projectId parameter was accepted but never used in the SQL,
 * so the assign modal always showed every active user regardless of project.
 * Fix: added a JOIN to project_members and a WHERE clause when projectId is set.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

const User = {

  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT u.userid    AS "UserID",
              u.name      AS "Name",
              u.email     AS "Email",
              u.passwordhash AS "PasswordHash",
              u.roleid    AS "RoleID",
              u.isactive  AS "IsActive",
              u.requirepasswordchange AS "RequirePasswordChange",
              u.passwordchangedat    AS "PasswordChangedAt",
              u.createdat AS "CreatedAt",
              r.rolename  AS "RoleName"
       FROM users u
       JOIN roles r ON u.roleid = r.roleid
       WHERE u.email = ? AND u.isactive = true
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT u.userid    AS "UserID",
              u.name      AS "Name",
              u.email     AS "Email",
              u.roleid    AS "RoleID",
              u.isactive  AS "IsActive",
              u.requirepasswordchange AS "RequirePasswordChange",
              u.createdat AS "CreatedAt",
              r.rolename  AS "RoleName"
       FROM users u
       JOIN roles r ON u.roleid = r.roleid
       WHERE u.userid = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ search = '', role = '' } = {}) {
    let sql = `
      SELECT u.userid    AS "UserID",
             u.name      AS "Name",
             u.email     AS "Email",
             u.roleid    AS "RoleID",
             u.isactive  AS "IsActive",
             u.createdat AS "CreatedAt",
             r.rolename  AS "RoleName"
      FROM users u
      JOIN roles r ON u.roleid = r.roleid
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (u.name ILIKE ? OR u.email ILIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      sql += ` AND r.rolename = ?`;
      params.push(role);
    }

    sql += ` ORDER BY u.createdat DESC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async create({ name, email, passwordHash, roleId, requirePasswordChange = false }) {
    const [rows] = await pool.execute(
      `INSERT INTO users (name, email, passwordhash, roleid, requirepasswordchange)
       VALUES (?, ?, ?, ?, ?)
       RETURNING userid AS id`,
      [name, email, passwordHash, roleId, requirePasswordChange]
    );
    return rows[0].id;
  },

  async update(id, { name, email, roleId }) {
    const [, meta] = await pool.execute(
      `UPDATE users SET name = ?, email = ?, roleid = ? WHERE userid = ?`,
      [name, email, roleId, id]
    );
    return meta.rowCount;
  },

  async deactivate(id) {
    const [, meta] = await pool.execute(
      `UPDATE users SET isactive = false WHERE userid = ?`,
      [id]
    );
    return meta.rowCount;
  },

  async updatePassword(id, newPasswordHash) {
    const [, meta] = await pool.execute(
      `UPDATE users SET passwordhash = ? WHERE userid = ?`,
      [newPasswordHash, id]
    );
    return meta.rowCount;
  },

  async getRoles() {
    const [rows] = await pool.execute(
      `SELECT roleid AS "RoleID", rolename AS "RoleName" FROM roles ORDER BY roleid`
    );
    return rows;
  },

  async findRoleByName(name) {
    const [rows] = await pool.execute(
      `SELECT roleid AS "RoleID", rolename AS "RoleName"
       FROM roles WHERE rolename = ? LIMIT 1`,
      [name]
    );
    return rows[0] || null;
  },

  async updateProfile(id, { name, email }) {
    const [, meta] = await pool.execute(
      `UPDATE users SET name = ?, email = ? WHERE userid = ?`,
      [name, email, id]
    );
    return meta.rowCount;
  },

  async setTemporaryPassword(id, passwordHash) {
    await pool.execute(
      `UPDATE users
       SET passwordhash = ?, requirepasswordchange = true, passwordchangedat = NULL
       WHERE userid = ?`,
      [passwordHash, id]
    );
  },

  async completePasswordChange(id, newPasswordHash) {
    await pool.execute(
      `UPDATE users
       SET passwordhash = ?, requirepasswordchange = false, passwordchangedat = NOW()
       WHERE userid = ?`,
      [newPasswordHash, id]
    );
  },

  /**
   * findAssignable(projectId)
   *
   * FIX: projectId was previously accepted but never used in the SQL query,
   * so the assign modal showed ALL active users regardless of which project
   * the task belonged to.
   *
   * Now when projectId is provided, only users who are members of that
   * specific project are returned (via JOIN to project_members).
   * When projectId is null/undefined, all active non-Admin users are returned
   * (used as a fallback, though the UI always passes a projectId).
   */
  async findAssignable(projectId = null) {
    let sql, params;

    if (projectId) {
      // Filter to members of the specific project only
      sql = `
        SELECT u.userid   AS "UserID",
               u.name     AS "Name",
               u.email    AS "Email",
               r.rolename AS "RoleName",
               (SELECT COUNT(*)
                FROM assigned_tasks at2
                JOIN tasks t ON at2.taskid = t.taskid
                WHERE at2.userid = u.userid
                  AND t.status != 'Completed') AS "activeTasks"
        FROM users u
        JOIN roles r ON u.roleid = r.roleid
        JOIN project_members pm ON pm.userid = u.userid
        WHERE u.isactive = true
          AND r.rolename != 'Admin'
          AND pm.projectid = ?
        ORDER BY u.name ASC
      `;
      params = [projectId];
    } else {
      // No projectId — return all active non-Admin users
      sql = `
        SELECT u.userid   AS "UserID",
               u.name     AS "Name",
               u.email    AS "Email",
               r.rolename AS "RoleName",
               (SELECT COUNT(*)
                FROM assigned_tasks at2
                JOIN tasks t ON at2.taskid = t.taskid
                WHERE at2.userid = u.userid
                  AND t.status != 'Completed') AS "activeTasks"
        FROM users u
        JOIN roles r ON u.roleid = r.roleid
        WHERE u.isactive = true
          AND r.rolename != 'Admin'
        ORDER BY u.name ASC
      `;
      params = [];
    }

    const [rows] = await pool.execute(sql, params);
    return rows;
  },
};

module.exports = User;

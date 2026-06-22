/**
 * models/User.js
 * ─────────────────────────────────────────────────────────────────────────────
 * User Model — Supabase PostgreSQL version.
 *
 * KEY DIFFERENCES FROM MySQL VERSION:
 *   - PostgreSQL returns column names in LOWERCASE — so rows[0].userid
 *     not rows[0].UserID. We alias every column back to the original casing
 *     using AS "UserID" so controllers and JWT payloads stay unchanged.
 *   - INSERT ... RETURNING id replaces result.insertId
 *   - ON CONFLICT DO NOTHING replaces INSERT IGNORE
 *   - ILIKE used for case-insensitive search (replaces LIKE)
 *   - RequirePasswordChange stored as BOOLEAN (true/false) in PostgreSQL
 *     instead of TINYINT(1) — returned as JS boolean directly, no coercion needed
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

  async findAssignable(projectId = null) {
    const [rows] = await pool.execute(
      `SELECT u.userid   AS "UserID",
              u.name     AS "Name",
              u.email    AS "Email",
              r.rolename AS "RoleName",
              (SELECT COUNT(*) FROM assigned_tasks at2
               JOIN tasks t ON at2.taskid = t.taskid
               WHERE at2.userid = u.userid AND t.status != 'Completed') AS "activeTasks"
       FROM users u
       JOIN roles r ON u.roleid = r.roleid
       WHERE u.isactive = true
         AND r.rolename != 'Admin'
       ORDER BY u.name ASC`
    );
    return rows;
  },
};

module.exports = User;

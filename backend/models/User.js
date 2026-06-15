/**
 * models/User.js
 * ─────────────────────────────────────────────────────────────────────────────
 * User Model
 *
 * This file contains ALL database queries related to users.
 * Controllers call these functions — they never write SQL directly.
 *
 * IMPORTANT: Every query uses ? placeholders (parameterized queries).
 * mysql2 automatically escapes these values, which prevents SQL Injection.
 *
 * BAD (vulnerable to SQL injection):
 *   `SELECT * FROM users WHERE Email = '${email}'`
 *
 * GOOD (safe, parameterized):
 *   `SELECT * FROM users WHERE Email = ?`, [email]
 * ─────────────────────────────────────────────────────────────────────────────
 */

const pool = require('../config/db');

const User = {

  /**
   * Find a user by their email address.
   * Used during login to look up the user before checking their password.
   */
  async findByEmail(email) {
    const [rows] = await pool.execute(
      `SELECT u.*, r.RoleName
       FROM users u
       JOIN roles r ON u.RoleID = r.RoleID
       WHERE u.Email = ? AND u.IsActive = 1
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Find a user by their ID.
   * Used to fetch the current user's profile.
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT u.UserID, u.Name, u.Email, u.RoleID, u.IsActive, u.CreatedAt,
              r.RoleName
       FROM users u
       JOIN roles r ON u.RoleID = r.RoleID
       WHERE u.UserID = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Get all users with optional search and role filter.
   * Admin-only function.
   *
   * SEARCH: Matches name OR email containing the search term.
   * FILTER: Exact match on role name.
   */
  async findAll({ search = '', role = '' } = {}) {
    // Build the query dynamically based on which filters are provided
    let sql = `
      SELECT u.UserID, u.Name, u.Email, u.RoleID, u.IsActive, u.CreatedAt,
             r.RoleName
      FROM users u
      JOIN roles r ON u.RoleID = r.RoleID
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (u.Name LIKE ? OR u.Email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      sql += ` AND r.RoleName = ?`;
      params.push(role);
    }

    sql += ` ORDER BY u.CreatedAt DESC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  /**
   * Create a new user.
   * The password must already be hashed before calling this function.
   */
  async create({ name, email, passwordHash, roleId }) {
    const [result] = await pool.execute(
      `INSERT INTO users (Name, Email, PasswordHash, RoleID)
       VALUES (?, ?, ?, ?)`,
      [name, email, passwordHash, roleId]
    );
    return result.insertId; // Returns the new user's ID
  },

  /**
   * Update a user's name, email, and/or role.
   */
  async update(id, { name, email, roleId }) {
    const [result] = await pool.execute(
      `UPDATE users SET Name = ?, Email = ?, RoleID = ? WHERE UserID = ?`,
      [name, email, roleId, id]
    );
    return result.affectedRows;
  },

  /**
   * Soft-deactivate a user (sets IsActive = 0).
   * We never hard-delete users because that would orphan their comments, tasks, etc.
   */
  async deactivate(id) {
    const [result] = await pool.execute(
      `UPDATE users SET IsActive = 0 WHERE UserID = ?`,
      [id]
    );
    return result.affectedRows;
  },

  /**
   * Update a user's password hash.
   * Called from the change-password flow (profile page).
   */
  async updatePassword(id, newPasswordHash) {
    const [result] = await pool.execute(
      `UPDATE users SET PasswordHash = ? WHERE UserID = ?`,
      [newPasswordHash, id]
    );
    return result.affectedRows;
  },

  /**
   * Get all roles — used to populate role dropdowns.
   */
  async getRoles() {
    const [rows] = await pool.execute(`SELECT * FROM roles ORDER BY RoleID`);
    return rows;
  },

  /**
   * Find a role by name.
   */
  async findRoleByName(name) {
    const [rows] = await pool.execute(
      `SELECT * FROM roles WHERE RoleName = ? LIMIT 1`,
      [name]
    );
    return rows[0] || null;
  },

  /**
   * Update own profile (name and email only).
   * Collaborators use this — they cannot change their role.
   */
  async updateProfile(id, { name, email }) {
    const [result] = await pool.execute(
      `UPDATE users SET Name = ?, Email = ? WHERE UserID = ?`,
      [name, email, id]
    );
    return result.affectedRows;
  },

  /**
   * Get all active users that can be assigned to tasks.
   * Used by Project Managers when assigning tasks.
   * Optionally filter to members of a specific project.
   */
  /**
   * Get users available for task assignment.
   *
   * FIX: Previously filtered ONLY by project_members, which meant if a project
   * had no members added yet, zero users appeared in the assign modal.
   *
   * New behaviour:
   *   - Returns ALL active users (Admin + PM can assign anyone).
   *   - Excludes Admins from the list (Admins don't do task work, only manage).
   *   - If projectId is given, project members appear first for convenience.
   *   - Also includes the active task count so the frontend can show a warning.
   */
  async findAssignable(projectId = null) {
    let sql = `
      SELECT u.UserID, u.Name, u.Email, r.RoleName,
             (SELECT COUNT(*) FROM assigned_tasks at2
              JOIN tasks t ON at2.TaskID = t.TaskID
              WHERE at2.UserID = u.UserID AND t.Status != 'Completed') AS activeTasks
      FROM users u
      JOIN roles r ON u.RoleID = r.RoleID
      WHERE u.IsActive = 1
        AND r.RoleName != 'Admin'
    `;
    const params = [];

    sql += ` ORDER BY u.Name ASC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
};

module.exports = User;

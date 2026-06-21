/**
 * controllers/userController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all user management actions.
 * All routes here require Admin role (enforced via rbac middleware in routes).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const bcrypt   = require('bcrypt');
const User     = require('../models/User');
const { sendSuccess, sendError }       = require('../utils/response');
const { generateTemporaryPassword }    = require('../utils/generatePassword');
const { sendWelcomeEmail }             = require('../utils/emailService');

const userController = {

  /**
   * GET /api/users
   * List all users with optional search and role filter.
   */
  async getAll(req, res) {
    try {
      const { search = '', role = '' } = req.query;
      const users = await User.findAll({ search, role });
      // Remove password hashes from the response
      const safe = users.map(u => { delete u.PasswordHash; return u; });
      return sendSuccess(res, safe);
    } catch (err) {
      console.error('getAll users error:', err);
      return sendError(res, 'Failed to fetch users', 500);
    }
  },

  /**
   * GET /api/users/:id
   */
  async getOne(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return sendError(res, 'User not found', 404);
      delete user.PasswordHash;
      return sendSuccess(res, user);
    } catch (err) {
      console.error('getOne user error:', err);
      return sendError(res, 'Failed to fetch user', 500);
    }
  },

  /**
   * POST /api/users
   * Create a new user (Admin only).
   * Generates a temporary password, saves the hash, and emails the user.
   * The Password field in the request body is NO LONGER accepted —
   * it is always system-generated to ensure security.
   */
  async create(req, res) {
    try {
      const { Name, Email, RoleName } = req.body;

      // Check email isn't already taken
      const existing = await User.findByEmail(Email);
      if (existing) {
        return sendError(res, 'Email already in use', 409);
      }

      // Find the RoleID from the role name
      const role = await User.findRoleByName(RoleName);
      if (!role) return sendError(res, 'Invalid role', 400);

      // Generate a secure random temporary password
      const temporaryPassword = generateTemporaryPassword();
      const passwordHash      = await bcrypt.hash(temporaryPassword, 12);

      const newId = await User.create({
        name: Name, email: Email, passwordHash, roleId: role.RoleID,
        requirePasswordChange: true,
      });

      // Send welcome email with the temporary password.
      // We do NOT log the temporaryPassword anywhere for security.
      sendWelcomeEmail({
        name:              Name,
        email:             Email,
        roleName:          RoleName,
        temporaryPassword,
      }).catch(err => console.error('Welcome email failed:', err.message));

      return sendSuccess(res, { UserID: newId }, 'User created and invitation email sent.', 201);
    } catch (err) {
      console.error('create user error:', err);
      return sendError(res, 'Failed to create user', 500);
    }
  },

  /**
   * PUT /api/users/:id
   * Update user name, email, and role.
   */
  async update(req, res) {
    try {
      const { Name, Email, RoleName } = req.body;

      const role = await User.findRoleByName(RoleName);
      if (!role) return sendError(res, 'Invalid role', 400);

      // Check email uniqueness (excluding this user)
      const existing = await User.findByEmail(Email);
      if (existing && existing.UserID !== parseInt(req.params.id)) {
        return sendError(res, 'Email already in use by another user', 409);
      }

      await User.update(req.params.id, { name: Name, email: Email, roleId: role.RoleID });
      return sendSuccess(res, null, 'User updated successfully');
    } catch (err) {
      console.error('update user error:', err);
      return sendError(res, 'Failed to update user', 500);
    }
  },

  /**
   * PATCH /api/users/:id/deactivate
   * Soft-deactivate a user (sets IsActive = 0).
   * Admins cannot deactivate themselves.
   */
  async deactivate(req, res) {
    try {
      if (parseInt(req.params.id) === req.user.UserID) {
        return sendError(res, 'You cannot deactivate your own account', 400);
      }
      const affected = await User.deactivate(req.params.id);
      if (!affected) return sendError(res, 'User not found', 404);
      return sendSuccess(res, null, 'User deactivated successfully');
    } catch (err) {
      console.error('deactivate user error:', err);
      return sendError(res, 'Failed to deactivate user', 500);
    }
  },

  /**
   * GET /api/users/roles
   * Returns the list of roles (for dropdowns).
   */

  /**
   * GET /api/users/assignable?projectId=5
   * Returns active users for task assignment.
   * Accessible by Admin AND Project Manager (unlike /users which is Admin only).
   * Optional ?projectId filters to members of that specific project.
   */
  async getAssignable(req, res) {
    try {
      const { projectId = null } = req.query;
      const users = await User.findAssignable(projectId);
      return sendSuccess(res, users);
    } catch (err) {
      console.error('getAssignable error:', err);
      return sendError(res, 'Failed to fetch assignable users', 500);
    }
  },
  async getRoles(req, res) {
    try {
      const roles = await User.getRoles();
      return sendSuccess(res, roles);
    } catch (err) {
      return sendError(res, 'Failed to fetch roles', 500);
    }
  },
};

module.exports = userController;
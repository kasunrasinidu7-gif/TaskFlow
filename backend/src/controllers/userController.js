/**
 * controllers/userController.js
 *
 * CHANGED: deactivate() now requires the Admin's own password in the request
 *   body (field: AdminPassword). The password is verified with bcrypt before
 *   the deactivation proceeds. Wrong password → 401.
 */

const bcrypt   = require('bcrypt');
const User     = require('../models/User');
const { sendSuccess, sendError }    = require('../utils/response');
const { generateTemporaryPassword } = require('../utils/generatePassword');
const { sendWelcomeEmail }          = require('../utils/emailService');

const userController = {

  async getAll(req, res) {
    try {
      const { search = '', role = '' } = req.query;
      const users = await User.findAll({ search, role });
      const safe  = users.map(u => { delete u.PasswordHash; return u; });
      return sendSuccess(res, safe);
    } catch (err) {
      console.error('getAll users error:', err);
      return sendError(res, 'Failed to fetch users', 500);
    }
  },

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

  async create(req, res) {
    try {
      const { Name, Email, RoleName } = req.body;

      const existing = await User.findByEmail(Email);
      if (existing) return sendError(res, 'Email already in use', 409);

      const role = await User.findRoleByName(RoleName);
      if (!role) return sendError(res, 'Invalid role', 400);

      const temporaryPassword = generateTemporaryPassword();
      const passwordHash      = await bcrypt.hash(temporaryPassword, 12);

      const newId = await User.create({
        name: Name, email: Email, passwordHash,
        roleId: role.RoleID, requirePasswordChange: true,
      });

      sendWelcomeEmail({ name: Name, email: Email, roleName: RoleName, temporaryPassword })
        .catch(err => console.error('Welcome email failed:', err.message));

      return sendSuccess(res, { UserID: newId }, 'User created and invitation email sent.', 201);
    } catch (err) {
      console.error('create user error:', err);
      return sendError(res, 'Failed to create user', 500);
    }
  },

  async update(req, res) {
    try {
      const { Name, Email, RoleName } = req.body;

      const role = await User.findRoleByName(RoleName);
      if (!role) return sendError(res, 'Invalid role', 400);

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
   * Body: { AdminPassword: "..." }
   *
   * Requires the requesting Admin's own password to confirm the action.
   * Wrong password → 401. Cannot deactivate self → 400.
   */
  async deactivate(req, res) {
    try {
      const { AdminPassword } = req.body;

      // Password is required
      if (!AdminPassword) {
        return sendError(res, 'Your password is required to deactivate a user.', 400);
      }

      // Cannot deactivate yourself
      if (parseInt(req.params.id) === req.user.UserID) {
        return sendError(res, 'You cannot deactivate your own account.', 400);
      }

      // Verify Admin's own password
      const adminRecord = await User.findByEmail(req.user.Email);
      if (!adminRecord) return sendError(res, 'Admin account not found.', 404);

      const passwordMatch = await bcrypt.compare(AdminPassword, adminRecord.PasswordHash);
      if (!passwordMatch) {
        return sendError(res, 'Incorrect password. Please enter your own admin password.', 401);
      }

      const affected = await User.deactivate(req.params.id);
      if (!affected) return sendError(res, 'User not found', 404);

      return sendSuccess(res, null, 'User deactivated successfully');
    } catch (err) {
      console.error('deactivate user error:', err);
      return sendError(res, 'Failed to deactivate user', 500);
    }
  },

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
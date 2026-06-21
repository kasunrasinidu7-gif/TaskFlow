/**
 * controllers/authController.js
 * Handles login, profile fetch, forgot password, and force-change password.
 */

const bcrypt                    = require('bcrypt');
const User                      = require('../models/User');
const { signToken }             = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');
const { generateTemporaryPassword } = require('../utils/generatePassword');
const { sendPasswordResetEmail }    = require('../utils/emailService');

const authController = {

  /**
   * POST /api/auth/login
   * Returns RequirePasswordChange in both the JWT payload and response body
   * so the frontend can gate access to the change-password screen.
   */
  async login(req, res) {
    try {
      const { Email, Password } = req.body;

      const user = await User.findByEmail(Email);
      if (!user) {
        return sendError(res, 'Invalid email or password', 401);
      }

      const isMatch = await bcrypt.compare(Password, user.PasswordHash);
      if (!isMatch) {
        return sendError(res, 'Invalid email or password', 401);
      }

      // Include RequirePasswordChange so the frontend can intercept the route
      const payload = {
        UserID:                user.UserID,
        RoleID:                user.RoleID,
        RoleName:              user.RoleName,
        Name:                  user.Name,
        Email:                 user.Email,
        RequirePasswordChange: !!user.RequirePasswordChange,
      };

      const token = signToken(payload);

      return sendSuccess(res, { token, user: payload }, 'Login successful');
    } catch (err) {
      console.error('Login error:', err);
      return sendError(res, 'Server error during login', 500);
    }
  },

  /**
   * GET /api/auth/me
   */
  async getMe(req, res) {
    try {
      const user = await User.findById(req.user.UserID);
      if (!user) return sendError(res, 'User not found', 404);
      delete user.PasswordHash;
      return sendSuccess(res, user);
    } catch (err) {
      console.error('GetMe error:', err);
      return sendError(res, 'Server error', 500);
    }
  },

  /**
   * POST /api/auth/forgot-password
   * Accepts an email, generates a new temp password, saves the hash, marks
   * RequirePasswordChange = 1, and emails the temp password to the user.
   */
  async forgotPassword(req, res) {
    try {
      const { Email } = req.body;

      // Find user — use the same generic message whether found or not
      // to prevent email enumeration attacks
      const user = await User.findByEmail(Email);
      if (!user) {
        return sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
      }

      const tempPassword   = generateTemporaryPassword();
      const passwordHash   = await bcrypt.hash(tempPassword, 12);

      await User.setTemporaryPassword(user.UserID, passwordHash);

      // Fire-and-forget email — don't block the response waiting for SMTP
      sendPasswordResetEmail({
        name:              user.Name,
        email:             user.Email,
        temporaryPassword: tempPassword,
      }).catch(err => console.error('Password reset email failed:', err.message));

      return sendSuccess(res, null, 'If that email exists, a reset link has been sent.');
    } catch (err) {
      console.error('Forgot password error:', err);
      return sendError(res, 'Server error', 500);
    }
  },

  /**
   * PUT /api/auth/change-password
   * Used on the forced first-login change screen.
   * Requires the current temp password, new password, and confirm.
   * On success: clears RequirePasswordChange and sets PasswordChangedAt.
   */
  async changeFirstPassword(req, res) {
    try {
      const { CurrentPassword, NewPassword } = req.body;

      const user = await User.findByEmail(req.user.Email);
      if (!user) return sendError(res, 'User not found', 404);

      const isMatch = await bcrypt.compare(CurrentPassword, user.PasswordHash);
      if (!isMatch) {
        return sendError(res, 'Current password is incorrect', 401);
      }

      if (CurrentPassword === NewPassword) {
        return sendError(res, 'New password must be different from your temporary password', 400);
      }

      const newHash = await bcrypt.hash(NewPassword, 12);
      await User.completePasswordChange(user.UserID, newHash);

      return sendSuccess(res, null, 'Password changed successfully. You now have full access.');
    } catch (err) {
      console.error('Change first password error:', err);
      return sendError(res, 'Server error', 500);
    }
  },
};

module.exports = authController;

/**
 * controllers/profileController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles the Profile page for all user roles.
 * Every logged-in user can view and edit their own profile, and change password.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const bcrypt = require('bcrypt');
const User   = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

const profileController = {

  /**
   * PUT /api/profile
   * Update the current user's own name and email.
   */
  async update(req, res) {
    try {
      const { Name, Email } = req.body;

      // Check that the new email isn't taken by a different user
      const existing = await User.findByEmail(Email);
      if (existing && existing.UserID !== req.user.UserID) {
        return sendError(res, 'Email already in use by another account', 409);
      }

      await User.updateProfile(req.user.UserID, { name: Name, email: Email });
      return sendSuccess(res, null, 'Profile updated successfully');
    } catch (err) {
      console.error('profile update error:', err);
      return sendError(res, 'Failed to update profile', 500);
    }
  },

  /**
   * PUT /api/profile/password
   * Change the current user's password.
   * Requires the current (old) password to be provided for verification.
   *
   * SECURITY: We always verify the old password before allowing a change.
   * This prevents someone who hijacks an active session from locking
   * the real user out by changing the password.
   */
  async changePassword(req, res) {
    try {
      const { CurrentPassword, NewPassword } = req.body;

      // Fetch the full user record (including the hash) from the DB
      const user = await User.findByEmail(req.user.Email);
      if (!user) return sendError(res, 'User not found', 404);

      // Verify the old password
      const isMatch = await bcrypt.compare(CurrentPassword, user.PasswordHash);
      if (!isMatch) {
        return sendError(res, 'Current password is incorrect', 401);
      }

      // Hash and save the new password
      const newHash = await bcrypt.hash(NewPassword, 12);
      await User.updatePassword(req.user.UserID, newHash);

      return sendSuccess(res, null, 'Password changed successfully');
    } catch (err) {
      console.error('changePassword error:', err);
      return sendError(res, 'Failed to change password', 500);
    }
  },
};

module.exports = profileController;

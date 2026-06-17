/**
 * controllers/authController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles login and fetching the current user's profile.
 *
 * LOGIN FLOW:
 *   1. Client sends POST /api/auth/login with { Email, Password }
 *   2. We find the user by email (from the DB)
 *   3. We use bcrypt.compare() to check the password against the stored hash
 *   4. If correct, we create a JWT token and return it
 *   5. Client stores the token and sends it in every future request
 *
 * WHY bcrypt.compare() and NOT just comparing strings?
 *   Passwords are stored as hashes (e.g. "$2b$12$..."), NOT as plain text.
 *   bcrypt.compare() re-runs the same hashing algorithm on the input password
 *   and checks if the result matches the stored hash.
 *   This means even if the DB is stolen, attackers cannot read the passwords.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const bcrypt             = require('bcrypt');
const User               = require('../models/User');
const { signToken }      = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');

const authController = {

  /**
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const { Email, Password } = req.body;

      // 1. Look up the user by email
      const user = await User.findByEmail(Email);
      if (!user) {
        // Use a generic message — don't reveal whether the email exists
        return sendError(res, 'Invalid email or password', 401);
      }

      // 2. Compare the submitted password against the stored hash
      const isMatch = await bcrypt.compare(Password, user.PasswordHash);
      if (!isMatch) {
        return sendError(res, 'Invalid email or password', 401);
      }

      // 3. Build the JWT payload — only include non-sensitive info
      const payload = {
        UserID:   user.UserID,
        RoleID:   user.RoleID,
        RoleName: user.RoleName,
        Name:     user.Name,
        Email:    user.Email,
      };

      // 4. Sign and return the token
      const token = signToken(payload);

      return sendSuccess(res, { token, user: payload }, 'Login successful');
    } catch (err) {
      console.error('Login error:', err);
      return sendError(res, 'Server error during login', 500);
    }
  },

  /**
   * GET /api/auth/me
   * Returns the currently logged-in user's profile from the database.
   * (req.user is set by authMiddleware)
   */
  async getMe(req, res) {
    try {
      const user = await User.findById(req.user.UserID);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }
      // Never send the password hash to the client
      delete user.PasswordHash;
      return sendSuccess(res, user);
    } catch (err) {
      console.error('GetMe error:', err);
      return sendError(res, 'Server error', 500);
    }
  },
};

module.exports = authController;

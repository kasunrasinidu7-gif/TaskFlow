/**
 * utils/jwt.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Helper functions for creating and verifying JSON Web Tokens.
 *
 * HOW JWT WORKS (simple explanation):
 *   1. User logs in with email + password.
 *   2. Server verifies the credentials and calls signToken() to create a token.
 *   3. The token is a string like: header.payload.signature
 *      - header: algorithm used (HS256)
 *      - payload: user data (UserID, RoleID, RoleName) — NOT sensitive data
 *      - signature: a hash that proves the token wasn't tampered with
 *   4. Client stores the token and sends it in every future request.
 *   5. Server calls verifyToken() to check it's valid and extract the user info.
 *
 * The JWT_SECRET in .env is the key used to sign the token.
 * If someone doesn't know the secret, they cannot forge a valid token.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const jwt = require('jsonwebtoken');

/**
 * Creates a signed JWT token for a user.
 * @param {object} payload - { UserID, RoleID, RoleName }
 * @returns {string} Signed JWT token
 */
function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
}

/**
 * Verifies a JWT token and returns the decoded payload.
 * Throws an error if the token is invalid or expired.
 * @param {string} token
 * @returns {object} Decoded payload { UserID, RoleID, RoleName, iat, exp }
 */
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };

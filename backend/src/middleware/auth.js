/**
 * middleware/auth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Authentication Middleware
 *
 * This function runs BEFORE every protected route handler.
 * It checks that the request includes a valid JWT token.
 *
 * HOW IT WORKS:
 *   1. Reads the "Authorization" header from the request.
 *      Expected format: "Bearer eyJhbGciOiJIUzI1NiIs..."
 *   2. Extracts the token (the part after "Bearer ").
 *   3. Calls verifyToken() to validate the signature and expiry.
 *   4. Attaches the decoded user object to req.user so controllers can use it.
 *   5. Calls next() to continue to the next middleware / route handler.
 *
 * If anything goes wrong (missing token, expired, tampered), it sends a
 * 401 Unauthorized response and stops the request.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { verifyToken } = require('../utils/jwt');
const { sendError }   = require('../utils/response');

function authMiddleware(req, res, next) {
  // 1. Get the Authorization header
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Access denied. No token provided.', 401);
  }

  // 2. Extract the token string (split "Bearer TOKEN" and take index 1)
  const token = authHeader.split(' ')[1];

  try {
    // 3. Verify and decode the token
    const decoded = verifyToken(token);

    // 4. Attach the user info to the request object
    //    Controllers can now access req.user.UserID, req.user.RoleName, etc.
    req.user = decoded;

    // 5. Continue to the next handler
    next();
  } catch (err) {
    // Token is expired or was tampered with
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Session expired. Please log in again.', 401);
    }
    return sendError(res, 'Invalid token.', 401);
  }
}

module.exports = authMiddleware;

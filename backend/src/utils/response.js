/**
 * utils/response.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Standardised JSON response helpers.
 *
 * Every API response follows the same shape so the frontend always knows
 * what to expect:
 *   { success: true/false, message: "...", data: { ... } }
 *
 * This is a best-practice pattern called the "Envelope Pattern".
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Send a success response.
 * @param {object} res   - Express response object
 * @param {*}      data  - The data to return
 * @param {string} message
 * @param {number} status - HTTP status code (default 200)
 */
function sendSuccess(res, data = null, message = 'Success', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

/**
 * Send an error response.
 * @param {object} res    - Express response object
 * @param {string} message
 * @param {number} status - HTTP status code (default 500)
 * @param {*}      errors - Optional validation errors array
 */
function sendError(res, message = 'Server error', status = 500, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

module.exports = { sendSuccess, sendError };

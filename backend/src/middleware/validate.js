/**
 * middleware/validate.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Input Validation Middleware
 *
 * Uses express-validator to check request bodies for missing or invalid data
 * BEFORE the request reaches the controller.
 *
 * WHY VALIDATE?  (OWASP A03 — Injection)
 *   If we trust user input blindly, attackers can send malformed data that
 *   breaks our logic or, worse, attempts SQL injection.
 *   express-validator catches bad input early and returns a 422 response.
 *
 * USAGE in routes:
 *   const { body } = require('express-validator');
 *   router.post('/login',
 *     [body('Email').isEmail(), body('Password').notEmpty()],
 *     validate,   // <-- this middleware reads the validation results
 *     loginController
 *   );
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { validationResult } = require('express-validator');
const { sendError }        = require('../utils/response');

function validate(req, res, next) {
  // Check if any validation rules defined in the route failed
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format the errors into a readable list
    const formatted = errors.array().map(e => ({
      field:   e.path,
      message: e.msg,
    }));
    return sendError(res, 'Validation failed', 422, formatted);
  }

  // All inputs are valid — proceed
  next();
}

module.exports = validate;

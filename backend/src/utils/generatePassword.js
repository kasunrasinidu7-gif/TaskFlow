/**
 * utils/generatePassword.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a cryptographically random temporary password.
 * Uses Node's built-in crypto module — no extra packages needed.
 *
 * Format: 3 uppercase + 3 lowercase + 3 digits + 2 special chars = 11 chars
 * Always meets the minimum 6-character rule enforced by the validator.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');

const UPPER   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';   // No I or O — ambiguous
const LOWER   = 'abcdefghjkmnpqrstuvwxyz';     // No i, l, o — ambiguous
const DIGITS  = '23456789';                     // No 0 or 1 — ambiguous
const SPECIAL = '!@#$%^&*';

function randomChar(chars) {
  const index = crypto.randomInt(0, chars.length);
  return chars[index];
}

/**
 * Generates a random temporary password.
 * @returns {string} e.g. "K7mP!9xRn@2"
 */
function generateTemporaryPassword() {
  const parts = [
    randomChar(UPPER),
    randomChar(UPPER),
    randomChar(UPPER),
    randomChar(LOWER),
    randomChar(LOWER),
    randomChar(LOWER),
    randomChar(DIGITS),
    randomChar(DIGITS),
    randomChar(DIGITS),
    randomChar(SPECIAL),
    randomChar(SPECIAL),
  ];

  // Shuffle the array so the character types are not always in the same order
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }

  return parts.join('');
}

module.exports = { generateTemporaryPassword };

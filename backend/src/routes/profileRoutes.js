/**
 * routes/profileRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Profile routes — available to ALL roles (every user can manage their own profile).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express            = require('express');
const { body }           = require('express-validator');
const router             = express.Router();
const profileController  = require('../controllers/profileController');
const authMiddleware     = require('../middleware/auth');
const validate           = require('../middleware/validate');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Current user profile management
 */

/**
 * @swagger
 * /profile:
 *   put:
 *     summary: Update own name and email
 *     tags: [Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Name, Email]
 *             properties:
 *               Name:
 *                 type: string
 *               Email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       409:
 *         description: Email already in use
 */
router.put(
  '/',
  [
    body('Name').notEmpty().withMessage('Name is required'),
    body('Email').isEmail().withMessage('Valid email is required'),
  ],
  validate,
  profileController.update
);

/**
 * @swagger
 * /profile/password:
 *   put:
 *     summary: Change own password
 *     tags: [Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [CurrentPassword, NewPassword]
 *             properties:
 *               CurrentPassword:
 *                 type: string
 *               NewPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed
 *       401:
 *         description: Current password is incorrect
 */
router.put(
  '/password',
  [
    body('CurrentPassword').notEmpty().withMessage('Current password is required'),
    body('NewPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  profileController.changePassword
);

module.exports = router;

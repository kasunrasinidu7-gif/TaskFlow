/**
 * routes/authRoutes.js
 */

const express        = require('express');
const { body }       = require('express-validator');
const router         = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const validate       = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login — returns JWT. If RequirePasswordChange is true, redirect to /change-password.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Email, Password]
 *             properties:
 *               Email: { type: string, example: admin@taskflow.com }
 *               Password: { type: string, example: Admin@1234 }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
  '/login',
  [
    body('Email').isEmail().withMessage('Valid email is required'),
    body('Password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Returns current user data
 */
router.get('/me', authMiddleware, authController.getMe);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request a password reset — emails a new temporary password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Email]
 *             properties:
 *               Email: { type: string }
 *     responses:
 *       200:
 *         description: Reset email sent if account exists (always returns 200 to prevent email enumeration)
 */
router.post(
  '/forgot-password',
  [body('Email').isEmail().withMessage('Valid email is required')],
  validate,
  authController.forgotPassword
);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Forced first-login password change — clears RequirePasswordChange flag
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [CurrentPassword, NewPassword]
 *             properties:
 *               CurrentPassword: { type: string }
 *               NewPassword:     { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed, full access granted
 *       401:
 *         description: Current password incorrect
 */
router.put(
  '/change-password',
  authMiddleware,
  [
    body('CurrentPassword').notEmpty().withMessage('Current password is required'),
    body('NewPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  validate,
  authController.changeFirstPassword
);

module.exports = router;

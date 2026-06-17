/**
 * routes/authRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes for authentication (login, get current user).
 * ─────────────────────────────────────────────────────────────────────────────
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
 *     summary: Login with email and password
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
 *               Email:
 *                 type: string
 *                 example: admin@taskflow.com
 *               Password:
 *                 type: string
 *                 example: Admin@1234
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
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
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns current user data
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;

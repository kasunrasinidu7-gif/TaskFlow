/**
 * routes/notificationRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All notification routes require a valid JWT.
 * Users can only see and manage THEIR OWN notifications.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express                  = require('express');
const router                   = express.Router();
const notificationController   = require('../controllers/notificationController');
const authMiddleware            = require('../middleware/auth');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notifications
 */

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get all notifications for the current user
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notifications list with unread count
 */
router.get('/', notificationController.getAll);

/**
 * @swagger
 * /notifications/read-all:
 *   patch:
 *     summary: Mark ALL notifications as read
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
// NOTE: /read-all must be declared BEFORE /:id to avoid Express matching "read-all" as an :id param
router.patch('/read-all', notificationController.markAllRead);

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', notificationController.markRead);

module.exports = router;

/**
 * routes/dashboardRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single endpoint that returns all dashboard statistics.
 * Available to all authenticated roles.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express               = require('express');
const router                = express.Router();
const dashboardController   = require('../controllers/dashboardController');
const authMiddleware         = require('../middleware/auth');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get dashboard statistics (task counts, project counts, recent tasks)
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: object
 *                   properties:
 *                     total:       { type: integer }
 *                     completed:   { type: integer }
 *                     inProgress:  { type: integer }
 *                     todo:        { type: integer }
 *                     overdue:     { type: integer }
 *                 projects:
 *                   type: object
 *                   properties:
 *                     total:     { type: integer }
 *                     active:    { type: integer }
 *                     completed: { type: integer }
 *                 recentTasks:
 *                   type: array
 *                 unreadCount:
 *                   type: integer
 */
router.get('/', dashboardController.getStats);

module.exports = router;

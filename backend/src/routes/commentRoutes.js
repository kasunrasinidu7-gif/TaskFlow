/**
 * routes/commentRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Route for deleting a comment by its own ID.
 * Fetching and creating comments is handled under /tasks/:id/comments in taskRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express             = require('express');
const router              = express.Router();
const commentController   = require('../controllers/commentController');
const authMiddleware      = require('../middleware/auth');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Task comments
 */

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: Delete a comment (owner or Admin only)
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted
 *       403:
 *         description: Not your comment
 *       404:
 *         description: Comment not found
 */
router.delete('/:id', commentController.delete);

module.exports = router;

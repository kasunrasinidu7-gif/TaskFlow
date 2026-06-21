/**
 * routes/attachmentRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Routes for downloading and deleting individual attachments by their ID.
 * Uploading attachments is handled under /tasks/:id/attachments in taskRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express                  = require('express');
const router                   = express.Router();
const attachmentController     = require('../controllers/attachmentController');
const authMiddleware            = require('../middleware/auth');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Attachments
 *   description: File attachment management
 */

/**
 * @swagger
 * /attachments/{id}/download:
 *   get:
 *     summary: Download an attachment file
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File stream
 *       404:
 *         description: Attachment not found
 */
router.get('/:id/download', attachmentController.download);

/**
 * @swagger
 * /attachments/{id}:
 *   delete:
 *     summary: Delete an attachment (owner or Admin only)
 *     tags: [Attachments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attachment deleted
 *       403:
 *         description: Not your attachment
 *       404:
 *         description: Attachment not found
 */
router.delete('/:id', attachmentController.delete);

module.exports = router;

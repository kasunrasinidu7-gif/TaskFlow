/**
 * controllers/commentController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles adding and fetching comments on tasks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Comment      = require('../models/Comment');
const Notification = require('../models/Notification');
const Task         = require('../models/Task');
const { sendSuccess, sendError } = require('../utils/response');

const commentController = {

  /**
   * GET /api/tasks/:id/comments
   */
  async getByTask(req, res) {
    try {
      const comments = await Comment.findByTask(req.params.id);
      return sendSuccess(res, comments);
    } catch (err) {
      console.error('getByTask comments error:', err);
      return sendError(res, 'Failed to fetch comments', 500);
    }
  },

  /**
   * POST /api/tasks/:id/comments
   * Any authenticated user can add a comment.
   * After posting, notify all other users assigned to the task.
   */
  async create(req, res) {
    try {
      const taskId = req.params.id;
      const { CommentText } = req.body;

      const task = await Task.findById(taskId);
      if (!task) return sendError(res, 'Task not found', 404);

      await Comment.create(taskId, req.user.UserID, CommentText);

      // Notify assigned users (except the commenter)
      const othersToNotify = task.assignees
        .filter(a => a.UserID !== req.user.UserID)
        .map(a => a.UserID);

      const io = req.app.get('io');
      for (const uid of othersToNotify) {
        const notif = await Notification.create({
          userId:  uid,
          taskId,
          message: `${req.user.Name} commented on task: "${task.Title}"`,
        });
        if (io) io.to(`user_${uid}`).emit('new_notification', notif);
      }

      return sendSuccess(res, null, 'Comment added', 201);
    } catch (err) {
      console.error('create comment error:', err);
      return sendError(res, 'Failed to add comment', 500);
    }
  },

  /**
   * DELETE /api/comments/:id
   * Users can only delete their own comments; Admins can delete any.
   */
  async delete(req, res) {
    try {
      const comment = await Comment.findById(req.params.id);
      if (!comment) return sendError(res, 'Comment not found', 404);

      // Only the owner or an Admin can delete
      if (comment.UserID !== req.user.UserID && req.user.RoleName !== 'Admin') {
        return sendError(res, 'You can only delete your own comments', 403);
      }

      await Comment.delete(req.params.id);
      return sendSuccess(res, null, 'Comment deleted');
    } catch (err) {
      console.error('delete comment error:', err);
      return sendError(res, 'Failed to delete comment', 500);
    }
  },
};

module.exports = commentController;

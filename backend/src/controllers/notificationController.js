/**
 * controllers/notificationController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles fetching and marking notifications as read.
 * Notifications are created automatically by taskController and commentController.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

const notificationController = {

  /**
   * GET /api/notifications
   * Returns all notifications for the currently logged-in user.
   */
  async getAll(req, res) {
    try {
      const notifications = await Notification.findByUser(req.user.UserID);
      const unreadCount   = await Notification.countUnread(req.user.UserID);
      return sendSuccess(res, { notifications, unreadCount });
    } catch (err) {
      console.error('getAll notifications error:', err);
      return sendError(res, 'Failed to fetch notifications', 500);
    }
  },

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read.
   */
  async markRead(req, res) {
    try {
      const affected = await Notification.markRead(req.params.id, req.user.UserID);
      if (!affected) return sendError(res, 'Notification not found', 404);
      return sendSuccess(res, null, 'Notification marked as read');
    } catch (err) {
      console.error('markRead error:', err);
      return sendError(res, 'Failed to update notification', 500);
    }
  },

  /**
   * PATCH /api/notifications/read-all
   * Mark ALL notifications for the current user as read.
   */
  async markAllRead(req, res) {
    try {
      await Notification.markAllRead(req.user.UserID);
      return sendSuccess(res, null, 'All notifications marked as read');
    } catch (err) {
      console.error('markAllRead error:', err);
      return sendError(res, 'Failed to update notifications', 500);
    }
  },
};

module.exports = notificationController;

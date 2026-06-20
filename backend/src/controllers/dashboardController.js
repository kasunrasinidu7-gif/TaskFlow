/**
 * controllers/dashboardController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns aggregated statistics for the dashboard page.
 * Data is scoped by user role — Collaborators only see their own data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Task         = require('../models/Task');
const Project      = require('../models/Project');
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/response');

const dashboardController = {

  /**
   * GET /api/dashboard
   * Returns all the data the Dashboard page needs in a single request.
   */
  async getStats(req, res) {
    try {
      const { UserID, RoleName } = req.user;

      // Run all queries in PARALLEL using Promise.all for performance.
      // Instead of waiting for each query one after another (slow),
      // we fire them all at once and wait for all to complete.
      const [taskStats, projectStats, recentTasks, unreadCount] = await Promise.all([
        Task.getStats(UserID, RoleName),
        Project.getStats(UserID, RoleName),
        Task.getRecent(UserID, RoleName, 5),
        Notification.countUnread(UserID),
      ]);

      return sendSuccess(res, {
        tasks:       taskStats,
        projects:    projectStats,
        recentTasks,
        unreadCount,
      });
    } catch (err) {
      console.error('dashboard error:', err);
      return sendError(res, 'Failed to fetch dashboard data', 500);
    }
  },
};

module.exports = dashboardController;

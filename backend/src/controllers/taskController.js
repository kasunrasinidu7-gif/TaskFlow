/**
 * controllers/taskController.js
 *
 * ADDED: Due date validation in create() and update().
 *   Due date must be today or in the future — past dates are rejected with 400.
 *
 * ADDED: getMyTasks — returns all tasks assigned to the logged-in user.
 * ADDED: unassign — removes a user from a task.
 */

const Task         = require('../models/Task');
const Notification = require('../models/Notification');
const User         = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

const ACTIVE_TASK_LIMIT = 10;

/**
 * Shared due date guard.
 * Returns an error message string if the date is in the past, otherwise null.
 */
function validateDueDate(DueDate) {
  if (!DueDate) return null; // due date is optional
  const today = new Date();
  today.setHours(0, 0, 0, 0); // start of today — ignore time component
  const due = new Date(DueDate);
  if (isNaN(due.getTime())) return 'Due date is not a valid date.';
  if (due < today) return 'Due date cannot be in the past. Please select today or a future date.';
  return null;
}

const taskController = {

  async getAll(req, res) {
    try {
      const { search = '', status = '', priority = '', projectId = '' } = req.query;
      const tasks = await Task.findAll({
        search, status, priority, projectId,
        userId:   req.user.UserID,
        roleName: req.user.RoleName,
      });
      return sendSuccess(res, tasks);
    } catch (err) {
      console.error('getAll tasks error:', err);
      return sendError(res, 'Failed to fetch tasks', 500);
    }
  },

  /**
   * GET /api/tasks/my
   * Returns all tasks assigned to the logged-in user across all projects.
   */
  async getMyTasks(req, res) {
    try {
      const tasks = await Task.findAssignedToUser(req.user.UserID);
      return sendSuccess(res, tasks);
    } catch (err) {
      console.error('getMyTasks error:', err);
      return sendError(res, 'Failed to fetch your tasks', 500);
    }
  },

  async getOne(req, res) {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) return sendError(res, 'Task not found', 404);
      return sendSuccess(res, task);
    } catch (err) {
      console.error('getOne task error:', err);
      return sendError(res, 'Failed to fetch task', 500);
    }
  },

  async create(req, res) {
    try {
      const { ProjectID, Title, Description, Priority, Status, DueDate } = req.body;

      // Due date validation — must be today or future
      const dueDateError = validateDueDate(DueDate);
      if (dueDateError) return sendError(res, dueDateError, 400);

      const newId = await Task.create({
        projectId:   ProjectID,
        title:       Title,
        description: Description,
        priority:    Priority,
        status:      Status,
        dueDate:     DueDate,
        createdBy:   req.user.UserID,
      });
      return sendSuccess(res, { TaskID: newId }, 'Task created successfully', 201);
    } catch (err) {
      console.error('create task error:', err);
      return sendError(res, 'Failed to create task', 500);
    }
  },

  async update(req, res) {
    try {
      const { Title, Description, Priority, Status, DueDate } = req.body;

      // Due date validation — must be today or future
      const dueDateError = validateDueDate(DueDate);
      if (dueDateError) return sendError(res, dueDateError, 400);

      const affected = await Task.update(req.params.id, {
        title: Title, description: Description, priority: Priority, status: Status, dueDate: DueDate,
      });
      if (!affected) return sendError(res, 'Task not found', 404);
      return sendSuccess(res, null, 'Task updated successfully');
    } catch (err) {
      console.error('update task error:', err);
      return sendError(res, 'Failed to update task', 500);
    }
  },

  async updateStatus(req, res) {
    try {
      const { Status } = req.body;

      if (req.user.RoleName === 'Collaborator') {
        const assigned = await Task.isAssigned(req.params.id, req.user.UserID);
        if (!assigned) return sendError(res, 'You are not assigned to this task', 403);
      }

      const affected = await Task.updateStatus(req.params.id, Status);
      if (!affected) return sendError(res, 'Task not found', 404);

      const updatedTask = await Task.findById(req.params.id);
      const io = req.app.get('io');
      if (io && updatedTask) {
        io.to(`project_${updatedTask.ProjectID}`).emit('task_updated', updatedTask);
      }

      return sendSuccess(res, null, 'Task status updated');
    } catch (err) {
      console.error('updateStatus error:', err);
      return sendError(res, 'Failed to update status', 500);
    }
  },

  async delete(req, res) {
    try {
      const affected = await Task.delete(req.params.id);
      if (!affected) return sendError(res, 'Task not found', 404);
      return sendSuccess(res, null, 'Task deleted successfully');
    } catch (err) {
      console.error('delete task error:', err);
      return sendError(res, 'Failed to delete task', 500);
    }
  },

  async assign(req, res) {
    try {
      const taskId      = req.params.id;
      const { UserIDs } = req.body;

      if (!Array.isArray(UserIDs) || UserIDs.length === 0) {
        return sendError(res, 'UserIDs must be a non-empty array', 400);
      }

      const task = await Task.findById(taskId);
      if (!task) return sendError(res, 'Task not found', 404);

      const skipped  = [];
      const assigned = [];

      for (const uid of UserIDs) {
        const numericUid = parseInt(uid, 10);
        const userRecord = await User.findById(numericUid);
        if (!userRecord) continue;

        const alreadyAssigned = await Task.isAssigned(taskId, numericUid);
        if (alreadyAssigned) continue;

        if (userRecord.RoleName === 'Collaborator') {
          const activeCount = await Task.countActiveForUser(numericUid);
          if (activeCount >= ACTIVE_TASK_LIMIT) {
            skipped.push({ UserID: numericUid, Name: userRecord.Name, activeCount });
            continue;
          }
        }

        await Task.assignUser(taskId, numericUid, req.user.UserID);
        assigned.push(numericUid);

        const notif = await Notification.create({
          userId:  numericUid,
          taskId,
          message: `You have been assigned to task: "${task.Title}" (Project: ${task.ProjectName}) by ${req.user.Name}`,
        });

        const io = req.app.get('io');
        if (io) io.to(`user_${numericUid}`).emit('new_notification', notif);
      }

      let message = `${assigned.length} user(s) assigned successfully.`;
      if (skipped.length > 0) {
        const names = skipped.map(s => `${s.Name} (${s.activeCount} active tasks)`).join(', ');
        message += ` Skipped (at ${ACTIVE_TASK_LIMIT}-task limit): ${names}.`;
      }

      return sendSuccess(res, { assigned, skipped }, message);
    } catch (err) {
      console.error('assign task error:', err);
      return sendError(res, 'Failed to assign task', 500);
    }
  },

  async unassign(req, res) {
    try {
      const { id: taskId, userId } = req.params;
      const task = await Task.findById(taskId);
      if (!task) return sendError(res, 'Task not found', 404);
      const affected = await Task.unassignUser(taskId, userId);
      if (!affected) return sendError(res, 'User was not assigned to this task', 404);
      return sendSuccess(res, null, 'User removed from task successfully');
    } catch (err) {
      console.error('unassign task error:', err);
      return sendError(res, 'Failed to remove user from task', 500);
    }
  },

  async getByProject(req, res) {
    try {
      const tasks = await Task.findByProject(req.params.projectId);
      return sendSuccess(res, tasks);
    } catch (err) {
      console.error('getByProject error:', err);
      return sendError(res, 'Failed to fetch tasks', 500);
    }
  },
};

module.exports = taskController;
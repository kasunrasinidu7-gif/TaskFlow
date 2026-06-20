/**
 * controllers/taskController.js
 * Handles all task-related actions including assignment with active-task limit.
 *
 * BUSINESS RULE: A Collaborator may have at most 10 ACTIVE tasks simultaneously.
 * ACTIVE = any task whose Status is NOT 'Completed'.
 * This is enforced here before inserting into assigned_tasks.
 */

const Task         = require('../models/Task');
const Notification = require('../models/Notification');
const User         = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

const ACTIVE_TASK_LIMIT = 10;

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

      // Emit real-time Kanban update
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

  /**
   * POST /api/tasks/:id/assign
   * Body: { UserIDs: [1, 2, 3] }
   *
   * BUSINESS RULE ENFORCED:
   *   Each Collaborator may have max 10 ACTIVE tasks.
   *   If a user already has 10 active tasks, they are skipped and reported.
   *   Assignment notification is created for each successfully assigned user.
   */
  async assign(req, res) {
    try {
      const taskId      = req.params.id;
      const { UserIDs } = req.body;

      if (!Array.isArray(UserIDs) || UserIDs.length === 0) {
        return sendError(res, 'UserIDs must be a non-empty array', 400);
      }

      const task = await Task.findById(taskId);
      if (!task) return sendError(res, 'Task not found', 404);

      const skipped  = []; // Users blocked by the 10-task limit
      const assigned = []; // Successfully assigned users

      for (const uid of UserIDs) {
        const numericUid = parseInt(uid, 10);

        // Fetch the user to check their role
        const userRecord = await User.findById(numericUid);
        if (!userRecord) continue;

        // Only enforce the limit for Collaborators
        if (userRecord.RoleName === 'Collaborator') {
          const activeCount = await Task.countActiveForUser(numericUid);
          if (activeCount >= ACTIVE_TASK_LIMIT) {
            skipped.push({ UserID: numericUid, Name: userRecord.Name, activeCount });
            continue; // Skip this user — at the limit
          }
        }

        // Assign the user (INSERT IGNORE handles duplicates silently)
        await Task.assignUser(taskId, numericUid, req.user.UserID);
        assigned.push(numericUid);

        // Create assignment notification with assigner name and task details
        const notif = await Notification.create({
          userId:  numericUid,
          taskId,
          message: `You have been assigned to task: "${task.Title}" (Project: ${task.ProjectName}) by ${req.user.Name}`,
        });

        // Push real-time notification via Socket.io
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${numericUid}`).emit('new_notification', notif);
        }
      }

      // Build a clear response message
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

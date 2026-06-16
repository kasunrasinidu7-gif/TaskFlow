/**
 * controllers/projectController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles all project-related actions.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const Project = require('../models/Project');
const User    = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

const projectController = {

  /**
   * GET /api/projects
   */
  async getAll(req, res) {
    try {
      const { search = '', status = '' } = req.query;
      const projects = await Project.findAll({
        search, status,
        userId:   req.user.UserID,
        roleName: req.user.RoleName,
      });
      return sendSuccess(res, projects);
    } catch (err) {
      console.error('getAll projects error:', err);
      return sendError(res, 'Failed to fetch projects', 500);
    }
  },

  /**
   * GET /api/projects/:id
   */
  async getOne(req, res) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) return sendError(res, 'Project not found', 404);

      // Collaborators can only see their assigned projects
      if (req.user.RoleName === 'Collaborator') {
        const isMember = await Project.isMember(project.ProjectID, req.user.UserID);
        if (!isMember) return sendError(res, 'Access denied', 403);
      }

      return sendSuccess(res, project);
    } catch (err) {
      console.error('getOne project error:', err);
      return sendError(res, 'Failed to fetch project', 500);
    }
  },

  /**
   * POST /api/projects
   */
  async create(req, res) {
    try {
      const { ProjectName, Description } = req.body;
      const newId = await Project.create({
        projectName: ProjectName,
        description: Description,
        createdBy:   req.user.UserID,
      });
      return sendSuccess(res, { ProjectID: newId }, 'Project created successfully', 201);
    } catch (err) {
      console.error('create project error:', err);
      return sendError(res, 'Failed to create project', 500);
    }
  },

  /**
   * PUT /api/projects/:id
   */
  async update(req, res) {
    try {
      const { ProjectName, Description, Status } = req.body;
      const affected = await Project.update(req.params.id, {
        projectName: ProjectName,
        description: Description,
        status:      Status,
      });
      if (!affected) return sendError(res, 'Project not found', 404);
      return sendSuccess(res, null, 'Project updated successfully');
    } catch (err) {
      console.error('update project error:', err);
      return sendError(res, 'Failed to update project', 500);
    }
  },

  /**
   * DELETE /api/projects/:id
   */
  async delete(req, res) {
    try {
      const affected = await Project.delete(req.params.id);
      if (!affected) return sendError(res, 'Project not found', 404);
      return sendSuccess(res, null, 'Project deleted successfully');
    } catch (err) {
      console.error('delete project error:', err);
      return sendError(res, 'Failed to delete project', 500);
    }
  },

  /**
   * POST /api/projects/:id/members
   * Body: { UserID }
   */
  async addMember(req, res) {
    try {
      const { UserID } = req.body;
      const user = await User.findById(UserID);
      if (!user) return sendError(res, 'User not found', 404);

      await Project.addMember(req.params.id, UserID);
      return sendSuccess(res, null, 'Member added successfully');
    } catch (err) {
      console.error('addMember error:', err);
      return sendError(res, 'Failed to add member', 500);
    }
  },

  /**
   * DELETE /api/projects/:id/members/:userId
   */
  async removeMember(req, res) {
    try {
      await Project.removeMember(req.params.id, req.params.userId);
      return sendSuccess(res, null, 'Member removed successfully');
    } catch (err) {
      console.error('removeMember error:', err);
      return sendError(res, 'Failed to remove member', 500);
    }
  },
};

module.exports = projectController;

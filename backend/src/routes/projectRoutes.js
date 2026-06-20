/**
 * routes/projectRoutes.js
 */

const express           = require('express');
const { body }          = require('express-validator');
const router            = express.Router();
const projectController = require('../controllers/projectController');
const authMiddleware    = require('../middleware/auth');
const rbac              = require('../middleware/rbac');
const validate          = require('../middleware/validate');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Project management
 */

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects (Collaborators see only their assigned projects)
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, On Hold, Completed, Cancelled]
 *     responses:
 *       200:
 *         description: List of projects
 */
router.get('/', projectController.getAll);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a single project with members
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project details
 *       403:
 *         description: Collaborator not assigned to this project
 *       404:
 *         description: Project not found
 */
router.get('/:id', projectController.getOne);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project (Admin or Project Manager)
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ProjectName]
 *             properties:
 *               ProjectName:
 *                 type: string
 *               Description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created
 */
router.post(
  '/',
  rbac('Admin', 'Project Manager'),
  [body('ProjectName').notEmpty().withMessage('Project name is required')],
  validate,
  projectController.create
);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update a project (Admin or Project Manager)
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ProjectName:
 *                 type: string
 *               Description:
 *                 type: string
 *               Status:
 *                 type: string
 *                 enum: [Active, On Hold, Completed, Cancelled]
 *     responses:
 *       200:
 *         description: Project updated
 */
router.put(
  '/:id',
  rbac('Admin', 'Project Manager'),
  [
    body('ProjectName').notEmpty().withMessage('Project name is required'),
    body('Status')
      .isIn(['Active', 'On Hold', 'Completed', 'Cancelled'])
      .withMessage('Invalid status'),
  ],
  validate,
  projectController.update
);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project (Admin or Project Manager)
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project deleted
 */
router.delete('/:id', rbac('Admin', 'Project Manager'), projectController.delete);

/**
 * @swagger
 * /projects/{id}/members:
 *   post:
 *     summary: Add a member to a project (Admin or Project Manager)
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [UserID]
 *             properties:
 *               UserID:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Member added
 */
router.post(
  '/:id/members',
  rbac('Admin', 'Project Manager'),
  [body('UserID').isInt().withMessage('Valid UserID is required')],
  validate,
  projectController.addMember
);

/**
 * @swagger
 * /projects/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a project (Admin or Project Manager)
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/:id/members/:userId', rbac('Admin', 'Project Manager'), projectController.removeMember);

module.exports = router;

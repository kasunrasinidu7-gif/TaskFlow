/**
 * routes/taskRoutes.js
 */

const express        = require('express');
const { body }       = require('express-validator');
const router         = express.Router();
const taskController = require('../controllers/taskController');
const commentController    = require('../controllers/commentController');
const attachmentController = require('../controllers/attachmentController');
const authMiddleware = require('../middleware/auth');
const rbac           = require('../middleware/rbac');
const validate       = require('../middleware/validate');
const upload         = require('../middleware/upload');

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management
 */

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks (filtered by role)
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [To Do, In Progress, Completed] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [Low, Medium, High, Critical] }
 *       - in: query
 *         name: projectId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of tasks
 */
router.get('/', taskController.getAll);

/**
 * @swagger
 * /tasks/by-project/{projectId}:
 *   get:
 *     summary: Get all tasks for a project (used by Kanban board)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of tasks for the project
 */
router.get('/by-project/:projectId', taskController.getByProject);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a single task with assignees
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */
router.get('/:id', taskController.getOne);

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a task (Admin or Project Manager)
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ProjectID, Title]
 *             properties:
 *               ProjectID: { type: integer }
 *               Title: { type: string }
 *               Description: { type: string }
 *               Priority: { type: string, enum: [Low, Medium, High, Critical] }
 *               Status: { type: string, enum: [To Do, In Progress, Completed] }
 *               DueDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Task created
 */
router.post(
  '/',
  rbac('Admin', 'Project Manager'),
  [
    body('ProjectID').isInt().withMessage('Valid ProjectID is required'),
    body('Title').notEmpty().withMessage('Title is required'),
    body('Priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
    body('Status').optional().isIn(['To Do', 'In Progress', 'Completed']),
  ],
  validate,
  taskController.create
);

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task (Admin or Project Manager)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Task updated
 */
router.put(
  '/:id',
  rbac('Admin', 'Project Manager'),
  [
    body('Title').notEmpty().withMessage('Title is required'),
    body('Priority').isIn(['Low', 'Medium', 'High', 'Critical']),
    body('Status').isIn(['To Do', 'In Progress', 'Completed']),
  ],
  validate,
  taskController.update
);

/**
 * @swagger
 * /tasks/{id}/status:
 *   patch:
 *     summary: Update task status (all roles — Collaborators limited to assigned tasks)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Status]
 *             properties:
 *               Status: { type: string, enum: [To Do, In Progress, Completed] }
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  '/:id/status',
  [body('Status').isIn(['To Do', 'In Progress', 'Completed']).withMessage('Invalid status')],
  validate,
  taskController.updateStatus
);

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task (Admin or Project Manager)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Task deleted
 */
router.delete('/:id', rbac('Admin', 'Project Manager'), taskController.delete);

/**
 * @swagger
 * /tasks/{id}/assign:
 *   post:
 *     summary: Assign users to a task (Admin or Project Manager)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [UserIDs]
 *             properties:
 *               UserIDs:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200:
 *         description: Users assigned
 */
router.post(
  '/:id/assign',
  rbac('Admin', 'Project Manager'),
  [body('UserIDs').isArray({ min: 1 }).withMessage('UserIDs must be a non-empty array')],
  validate,
  taskController.assign
);

// ── Comments ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /tasks/{id}/comments:
 *   get:
 *     summary: Get comments for a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/:id/comments', commentController.getByTask);

/**
 * @swagger
 * /tasks/{id}/comments:
 *   post:
 *     summary: Add a comment to a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [CommentText]
 *             properties:
 *               CommentText: { type: string }
 *     responses:
 *       201:
 *         description: Comment added
 */
router.post(
  '/:id/comments',
  [body('CommentText').notEmpty().withMessage('Comment text is required')],
  validate,
  commentController.create
);

// ── Attachments ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   get:
 *     summary: Get attachments for a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of attachments
 */
router.get('/:id/attachments', attachmentController.getByTask);

/**
 * @swagger
 * /tasks/{id}/attachments:
 *   post:
 *     summary: Upload a file attachment to a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded
 */
router.post('/:id/attachments', upload.single('file'), attachmentController.upload);

module.exports = router;

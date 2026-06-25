/**
 * routes/taskRoutes.js
 *
 * ADDED: GET  /tasks/my              — fetch all tasks assigned to logged-in user
 * ADDED: DELETE /tasks/:id/assign/:userId — remove a user from a task (Admin/PM only)
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

// ── My tasks (for Kanban PM/Collaborator view) ────────────────────────────────
// IMPORTANT: this must be declared BEFORE /:id to avoid Express matching
// "my" as a task ID parameter.
router.get('/my', taskController.getMyTasks);

// ── Task list & project filter ────────────────────────────────────────────────
router.get('/', taskController.getAll);

// ── Tasks by project (Kanban) ─────────────────────────────────────────────────
router.get('/by-project/:projectId', taskController.getByProject);

// ── Single task ───────────────────────────────────────────────────────────────
router.get('/:id', taskController.getOne);

// ── Create task ───────────────────────────────────────────────────────────────
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

// ── Update task ───────────────────────────────────────────────────────────────
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

// ── Update status (all roles) ─────────────────────────────────────────────────
router.patch(
  '/:id/status',
  [body('Status').isIn(['To Do', 'In Progress', 'Completed']).withMessage('Invalid status')],
  validate,
  taskController.updateStatus
);

// ── Delete task ───────────────────────────────────────────────────────────────
router.delete('/:id', rbac('Admin', 'Project Manager'), taskController.delete);

// ── Assign users to task ──────────────────────────────────────────────────────
router.post(
  '/:id/assign',
  rbac('Admin', 'Project Manager'),
  [body('UserIDs').isArray({ min: 1 }).withMessage('UserIDs must be a non-empty array')],
  validate,
  taskController.assign
);

// ── Remove a user from a task (NEW) ──────────────────────────────────────────
router.delete(
  '/:id/assign/:userId',
  rbac('Admin', 'Project Manager'),
  taskController.unassign
);

// ── Comments ──────────────────────────────────────────────────────────────────
router.get('/:id/comments',  commentController.getByTask);
router.post(
  '/:id/comments',
  [body('CommentText').notEmpty().withMessage('Comment text is required')],
  validate,
  commentController.create
);

// ── Attachments ───────────────────────────────────────────────────────────────
router.get('/:id/attachments', attachmentController.getByTask);
router.post('/:id/attachments', upload.single('file'), attachmentController.upload);

module.exports = router;

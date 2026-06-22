/**
 * routes/userRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * User management routes — Admin only (except /roles which is open to all authenticated users).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express        = require('express');
const { body }       = require('express-validator');
const router         = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const rbac           = require('../middleware/rbac');
const validate       = require('../middleware/validate');

// All routes in this file require a valid JWT
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (Admin only)
 */

/**
 * @swagger
 * /users/roles:
 *   get:
 *     summary: Get list of all roles
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of roles
 */
router.get('/roles', userController.getRoles);

/**
 * @swagger
 * /users/assignable:
 *   get:
 *     summary: Get users available for task assignment (Admin + Project Manager)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: integer
 *         description: Optional — filter to members of this project
 *     responses:
 *       200:
 *         description: List of assignable users
 */
// NOTE: This route must be declared BEFORE /:id to prevent 'assignable' being
// treated as an ID parameter by Express.
router.get('/assignable', rbac('Admin', 'Project Manager'), userController.getAssignable);



/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [Admin, Project Manager, Collaborator]
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Access denied
 */
router.get('/', rbac('Admin'), userController.getAll);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a single user by ID (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User data
 *       404:
 *         description: User not found
 */
router.get('/:id', rbac('Admin'), userController.getOne);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Name, Email, Password, RoleName]
 *             properties:
 *               Name:
 *                 type: string
 *               Email:
 *                 type: string
 *               Password:
 *                 type: string
 *               RoleName:
 *                 type: string
 *                 enum: [Admin, Project Manager, Collaborator]
 *     responses:
 *       201:
 *         description: User created
 */
router.post(
  '/',
  rbac('Admin'),
  [
    body('Name').notEmpty().withMessage('Name is required'),
    body('Email').isEmail().withMessage('Valid email is required'),
    body('RoleName')
      .isIn(['Admin', 'Project Manager', 'Collaborator'])
      .withMessage('Invalid role'),
  ],
  validate,
  userController.create
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user (Admin only)
 *     tags: [Users]
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
 *             required: [Name, Email, RoleName]
 *             properties:
 *               Name:
 *                 type: string
 *               Email:
 *                 type: string
 *               RoleName:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put(
  '/:id',
  rbac('Admin'),
  [
    body('Name').notEmpty().withMessage('Name is required'),
    body('Email').isEmail().withMessage('Valid email is required'),
    body('RoleName')
      .isIn(['Admin', 'Project Manager', 'Collaborator'])
      .withMessage('Invalid role'),
  ],
  validate,
  userController.update
);

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.patch('/:id/deactivate', rbac('Admin'), userController.deactivate);

module.exports = router;

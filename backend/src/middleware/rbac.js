/**
 * middleware/rbac.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Role-Based Access Control (RBAC) Middleware
 *
 * After authMiddleware confirms the user is logged in, rbacMiddleware checks
 * whether their ROLE is allowed to access a specific route.
 *
 * USAGE in routes:
 *   router.post('/users', authMiddleware, rbac('Admin'), createUser);
 *   router.post('/projects', authMiddleware, rbac('Admin', 'Project Manager'), createProject);
 *
 * The rbac() function is a "middleware factory" — it returns a new middleware
 * function with the allowed roles baked in.
 *
 * ROLES in this system:
 *   - Admin            (can do everything)
 *   - Project Manager  (manage projects & tasks, not users)
 *   - Collaborator     (view + update status + comment)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { sendError } = require('../utils/response');

/**
 * Factory function that creates an RBAC middleware for specific roles.
 * @param  {...string} allowedRoles - Roles that are permitted (e.g. 'Admin', 'Project Manager')
 * @returns {function} Express middleware
 */
function rbac(...allowedRoles) {
  return (req, res, next) => {
    // req.user was set by authMiddleware — it contains { UserID, RoleID, RoleName }
    if (!req.user) {
      return sendError(res, 'Not authenticated.', 401);
    }

    const userRole = req.user.RoleName;

    // Check if the user's role is in the list of allowed roles
    if (!allowedRoles.includes(userRole)) {
      return sendError(
        res,
        `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}`,
        403
      );
    }

    // Role is allowed — continue
    next();
  };
}

module.exports = rbac;

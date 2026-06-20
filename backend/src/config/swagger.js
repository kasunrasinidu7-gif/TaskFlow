/**
 * config/swagger.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sets up Swagger / OpenAPI documentation.
 * The docs will be accessible at: http://localhost:5000/api/docs
 *
 * swagger-jsdoc reads JSDoc comments in our route files (tags like @swagger)
 * and builds a full OpenAPI 3.0 spec automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description: 'REST API for the TaskFlow Task Management System — INTE 21323',
      contact: { name: 'TaskFlow Team' },
    },
    servers: [
      { url: 'http://localhost:5000/api', description: 'Local Development Server' },
    ],
    // Define a reusable security scheme — every protected route references this
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste your JWT token here (without the "Bearer " prefix)',
        },
      },
    },
    // Apply JWT auth globally — individual routes can override this
    security: [{ BearerAuth: [] }],
  },
  // Tell swagger-jsdoc where to look for @swagger comments
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

/**
 * config/db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a mysql2 connection POOL (not a single connection).
 *
 * WHY A POOL?
 *   A single connection can only handle one query at a time.
 *   A pool maintains multiple connections and lends them out as needed,
 *   which is essential for a multi-user web app.
 *
 * WHY promise()?
 *   mysql2 has two modes: callback-based and promise-based.
 *   We use the promise-based version so we can write clean async/await code
 *   in our models instead of nested callbacks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Create the pool using values from the .env file
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'taskflow_db',
  waitForConnections: true,   // Queue queries when all connections are busy
  connectionLimit:    10,     // Maximum 10 simultaneous connections
  queueLimit:         0,      // Unlimited queue size (0 = no limit)
  timezone:           '+00:00', // Store all dates as UTC
});

/**
 * Test the connection on startup.
 * If the database is unreachable, this will log an error immediately
 * instead of failing silently later.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅  MySQL connected successfully');
    connection.release(); // Always release connections back to the pool
  } catch (err) {
    console.error('❌  MySQL connection failed:', err.message);
    process.exit(1); // Stop the server — no point running without a database
  }
}

testConnection();

module.exports = pool;

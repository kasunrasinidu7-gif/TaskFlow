/**
 * config/db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase PostgreSQL connection pool using the 'pg' (node-postgres) library.
 *
 * FIX: Supabase requires SSL on ALL connections regardless of NODE_ENV.
 * The previous version disabled SSL in development (ssl: false) which caused
 * Supabase to silently drop the connection, resulting in a timeout error.
 *
 * ssl: { rejectUnauthorized: false } is the correct setting for Supabase —
 * it enables SSL but accepts Supabase's self-signed certificate chain.
 * This is safe because Supabase's certificate is still used for encryption;
 * we just don't verify its CA since Supabase uses its own internal CA.
 *
 * CONNECTION STRING FORMAT:
 *   DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // SSL is ALWAYS required for Supabase — in both development and production.
  // rejectUnauthorized: false accepts Supabase's certificate chain.
  ssl: { rejectUnauthorized: false },

  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 10000,  // Increased from 5s to 10s for Supabase latency
});

/**
 * Converts MySQL-style ? placeholders to PostgreSQL $1, $2, $3 ... style.
 * @param {string} sql
 * @returns {string}
 */
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/**
 * execute() — drop-in replacement for mysql2's pool.execute().
 * Returns [rows, meta] to match the mysql2 destructuring pattern in all models.
 */
pool.execute = async function execute(sql, params = []) {
  const pgSql  = convertPlaceholders(sql);
  const result = await pool.query(pgSql, params);

  const meta = {
    rowCount:     result.rowCount,
    affectedRows: result.rowCount,
    insertId:     result.rows[0]?.id ?? null,
  };

  return [result.rows, meta];
};

/**
 * Test the connection on startup.
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅  Supabase PostgreSQL connected successfully');
    client.release();
  } catch (err) {
    console.error('❌  Supabase PostgreSQL connection failed:', err.message);
    console.error('    Check: Is DATABASE_URL set correctly in .env?');
    console.error('    Format: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres');
    process.exit(1);
  }
}

testConnection();

module.exports = pool;
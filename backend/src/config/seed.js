/**
 * config/seed.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the Supabase PostgreSQL database with roles and a default Admin user.
 * Run once after creating the schema:  npm run seed
 *
 * Default admin credentials:
 *   Email:    admin@taskflow.com
 *   Password: Admin@1234
 * ─────────────────────────────────────────────────────────────────────────────
 */

const bcrypt = require('bcrypt');
const pool   = require('./db');

async function seed() {
  console.log('🌱  Starting database seed...');

  // ── 1. Insert roles (ON CONFLICT DO NOTHING = PostgreSQL's INSERT IGNORE)
  await pool.execute(`
    INSERT INTO roles (rolename) VALUES
      ('Admin'), ('Project Manager'), ('Collaborator')
    ON CONFLICT (rolename) DO NOTHING
  `);
  console.log('   ✅  Roles seeded');

  // ── 2. Fetch the Admin role ID
  const [roles] = await pool.execute(
    `SELECT roleid FROM roles WHERE rolename = $1 LIMIT 1`,
    ['Admin']
  );
  const adminRoleId = roles[0].roleid;

  // ── 3. Hash the default password
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  // ── 4. Insert default Admin user (skip if already exists)
  await pool.execute(`
    INSERT INTO users (name, email, passwordhash, roleid)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
  `, ['System Admin', 'admin@taskflow.com', passwordHash, adminRoleId]);

  console.log('   ✅  Default admin user seeded');
  console.log('       Email:    admin@taskflow.com');
  console.log('       Password: Admin@1234');
  console.log('\n🌱  Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});

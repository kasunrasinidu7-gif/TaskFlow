/**
 * config/seed.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Run this ONCE after creating the database tables:
 *   npm run seed
 *
 * This script inserts:
 *   1. The three roles (Admin, Project Manager, Collaborator)
 *   2. A default Admin user so you can log in immediately
 *
 * Default admin credentials:
 *   Email:    admin@taskflow.com
 *   Password: Admin@1234
 *   (Change the password immediately after first login!)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const bcrypt = require('bcrypt');
const pool   = require('./db');

async function seed() {
  console.log('🌱  Starting database seed...');

  // ── 1. Insert Roles (ignore if they already exist) ──────────────────────
  await pool.execute(`
    INSERT IGNORE INTO roles (RoleName) VALUES
      ('Admin'), ('Project Manager'), ('Collaborator')
  `);
  console.log('   ✅  Roles seeded');

  // ── 2. Fetch the Admin role ID ───────────────────────────────────────────
  const [roles] = await pool.execute(
    `SELECT RoleID FROM roles WHERE RoleName = 'Admin' LIMIT 1`
  );
  const adminRoleId = roles[0].RoleID;

  // ── 3. Hash the default password ────────────────────────────────────────
  // saltRounds = 12 means bcrypt will run 2^12 = 4096 hashing rounds.
  // Higher = more secure, but slower. 12 is the industry-standard sweet spot.
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  // ── 4. Insert default Admin user (ignore if email already exists) ────────
  await pool.execute(`
    INSERT IGNORE INTO users (Name, Email, PasswordHash, RoleID)
    VALUES (?, ?, ?, ?)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- TaskFlow — Supabase PostgreSQL Schema
-- INTE 21323 — Software Engineering Project
--
-- HOW TO USE:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire script and click Run
--   3. Then run npm run seed from your backend folder
--
-- DIFFERENCES FROM MySQL SCHEMA:
--   - SERIAL instead of AUTO_INCREMENT
--   - BOOLEAN instead of TINYINT(1)
--   - INTEGER instead of INT UNSIGNED
--   - VARCHAR with CHECK constraints instead of ENUM
--   - ON UPDATE triggers for UpdatedAt (PostgreSQL has no ON UPDATE CURRENT_TIMESTAMP)
--   - utf8mb4 charset not needed — PostgreSQL is Unicode by default
--   - INSERT IGNORE → ON CONFLICT DO NOTHING (handled in application code)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Drop existing tables in reverse dependency order ──────────────────────────
DROP TABLE IF EXISTS notifications    CASCADE;
DROP TABLE IF EXISTS attachments      CASCADE;
DROP TABLE IF EXISTS comments         CASCADE;
DROP TABLE IF EXISTS assigned_tasks   CASCADE;
DROP TABLE IF EXISTS tasks            CASCADE;
DROP TABLE IF EXISTS project_members  CASCADE;
DROP TABLE IF EXISTS projects         CASCADE;
DROP TABLE IF EXISTS users            CASCADE;
DROP TABLE IF EXISTS roles            CASCADE;

-- Drop update triggers if they exist
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- ── Trigger function for auto-updating UpdatedAt ───────────────────────────────
-- PostgreSQL does not support ON UPDATE CURRENT_TIMESTAMP like MySQL.
-- Instead we create a reusable trigger function and attach it to each table.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updatedat = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. ROLES ──────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  roleid    SERIAL PRIMARY KEY,
  rolename  VARCHAR(50) NOT NULL UNIQUE
    CHECK (rolename IN ('Admin', 'Project Manager', 'Collaborator'))
);

-- Seed the three roles immediately
INSERT INTO roles (rolename) VALUES
  ('Admin'), ('Project Manager'), ('Collaborator');

-- ── 2. USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  userid                 SERIAL PRIMARY KEY,
  name                   VARCHAR(120) NOT NULL,
  email                  VARCHAR(191) NOT NULL UNIQUE,
  passwordhash           VARCHAR(255) NOT NULL,
  roleid                 INTEGER NOT NULL REFERENCES roles(roleid) ON UPDATE CASCADE,
  isactive               BOOLEAN NOT NULL DEFAULT TRUE,
  requirepasswordchange  BOOLEAN NOT NULL DEFAULT FALSE,
  passwordchangedat      TIMESTAMP WITH TIME ZONE,
  createdat              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedat              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 3. PROJECTS ───────────────────────────────────────────────────────────────
CREATE TABLE projects (
  projectid    SERIAL PRIMARY KEY,
  projectname  VARCHAR(200) NOT NULL,
  description  TEXT,
  status       VARCHAR(20) NOT NULL DEFAULT 'Active'
    CHECK (status IN ('Active', 'On Hold', 'Completed', 'Cancelled')),
  createdby    INTEGER NOT NULL REFERENCES users(userid) ON UPDATE CASCADE,
  createdat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 4. PROJECT MEMBERS (Junction) ─────────────────────────────────────────────
CREATE TABLE project_members (
  projectmemberid  SERIAL PRIMARY KEY,
  projectid        INTEGER NOT NULL REFERENCES projects(projectid) ON DELETE CASCADE ON UPDATE CASCADE,
  userid           INTEGER NOT NULL REFERENCES users(userid)    ON DELETE CASCADE ON UPDATE CASCADE,
  joinedat         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (projectid, userid)
);

-- ── 5. TASKS ──────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  taskid       SERIAL PRIMARY KEY,
  projectid    INTEGER NOT NULL REFERENCES projects(projectid) ON DELETE CASCADE ON UPDATE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  priority     VARCHAR(20) NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status       VARCHAR(20) NOT NULL DEFAULT 'To Do'
    CHECK (status IN ('To Do', 'In Progress', 'Completed')),
  duedate      DATE,
  createdby    INTEGER NOT NULL REFERENCES users(userid) ON UPDATE CASCADE,
  createdat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updatedat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. ASSIGNED TASKS (Junction) ──────────────────────────────────────────────
CREATE TABLE assigned_tasks (
  taskassignmentid  SERIAL PRIMARY KEY,
  taskid            INTEGER NOT NULL REFERENCES tasks(taskid)  ON DELETE CASCADE ON UPDATE CASCADE,
  userid            INTEGER NOT NULL REFERENCES users(userid)  ON DELETE CASCADE ON UPDATE CASCADE,
  assignedby        INTEGER NOT NULL REFERENCES users(userid)  ON UPDATE CASCADE,
  assigneddate      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (taskid, userid)
);

-- ── 7. COMMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE comments (
  commentid    SERIAL PRIMARY KEY,
  taskid       INTEGER NOT NULL REFERENCES tasks(taskid)  ON DELETE CASCADE ON UPDATE CASCADE,
  userid       INTEGER NOT NULL REFERENCES users(userid)  ON DELETE CASCADE ON UPDATE CASCADE,
  commenttext  TEXT NOT NULL,
  createdat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── 8. ATTACHMENTS ────────────────────────────────────────────────────────────
CREATE TABLE attachments (
  attachmentid  SERIAL PRIMARY KEY,
  taskid        INTEGER NOT NULL REFERENCES tasks(taskid)  ON DELETE CASCADE ON UPDATE CASCADE,
  userid        INTEGER NOT NULL REFERENCES users(userid)  ON UPDATE CASCADE,
  filename      VARCHAR(255) NOT NULL,
  filepath      VARCHAR(500) NOT NULL,
  filetype      VARCHAR(100),
  uploadedat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── 9. NOTIFICATIONS ──────────────────────────────────────────────────────────
CREATE TABLE notifications (
  notificationid  SERIAL PRIMARY KEY,
  userid          INTEGER NOT NULL REFERENCES users(userid)  ON DELETE CASCADE ON UPDATE CASCADE,
  taskid          INTEGER REFERENCES tasks(taskid) ON DELETE SET NULL ON UPDATE CASCADE,
  message         VARCHAR(500) NOT NULL,
  isread          BOOLEAN NOT NULL DEFAULT FALSE,
  createdat       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ── Indexes for common query patterns ─────────────────────────────────────────
-- These speed up the JOINs and WHERE clauses most frequently used in the models

CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_users_roleid          ON users(roleid);
CREATE INDEX idx_projects_createdby    ON projects(createdby);
CREATE INDEX idx_projects_status       ON projects(status);
CREATE INDEX idx_project_members_proj  ON project_members(projectid);
CREATE INDEX idx_project_members_user  ON project_members(userid);
CREATE INDEX idx_tasks_projectid       ON tasks(projectid);
CREATE INDEX idx_tasks_status          ON tasks(status);
CREATE INDEX idx_tasks_duedate         ON tasks(duedate);
CREATE INDEX idx_assigned_tasks_task   ON assigned_tasks(taskid);
CREATE INDEX idx_assigned_tasks_user   ON assigned_tasks(userid);
CREATE INDEX idx_comments_taskid       ON comments(taskid);
CREATE INDEX idx_attachments_taskid    ON attachments(taskid);
CREATE INDEX idx_notifications_userid  ON notifications(userid);
CREATE INDEX idx_notifications_isread  ON notifications(userid, isread);

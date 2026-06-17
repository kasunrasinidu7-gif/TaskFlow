-- ─────────────────────────────────────────────────────────────────────────
 
CREATE DATABASE IF NOT EXISTS taskflow_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskflow_db;
 
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE roles (
  RoleID   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  RoleName ENUM('Admin','Project Manager','Collaborator') NOT NULL UNIQUE
);
 
-- Seed the three roles
INSERT INTO roles (RoleName) VALUES
  ('Admin'), ('Project Manager'), ('Collaborator');
 
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE users (
  UserID       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  Name         VARCHAR(120)  NOT NULL,
  Email        VARCHAR(191)  NOT NULL UNIQUE,
  PasswordHash VARCHAR(255)  NOT NULL,
  RoleID       INT UNSIGNED  NOT NULL,
  IsActive     TINYINT(1)    NOT NULL DEFAULT 1,
  CreatedAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_role FOREIGN KEY (RoleID)
    REFERENCES roles(RoleID) ON UPDATE CASCADE
);
 
-- ────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  ProjectID   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ProjectName VARCHAR(200)  NOT NULL,
  Description TEXT,
  Status      ENUM('Active','On Hold','Completed','Cancelled')
              NOT NULL DEFAULT 'Active',
  CreatedBy   INT UNSIGNED  NOT NULL,
  CreatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                            ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_project_creator FOREIGN KEY (CreatedBy)
    REFERENCES users(UserID) ON UPDATE CASCADE
);
 
-- ──────────────────────────────────────────────
CREATE TABLE project_members (
  ProjectMemberID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ProjectID       INT UNSIGNED NOT NULL,
  UserID          INT UNSIGNED NOT NULL,
  JoinedAt        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_user (ProjectID, UserID),
  CONSTRAINT fk_pm_project FOREIGN KEY (ProjectID)
    REFERENCES projects(ProjectID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_pm_user FOREIGN KEY (UserID)
    REFERENCES users(UserID) ON DELETE CASCADE ON UPDATE CASCADE
);
 
-- ───────────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  TaskID      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ProjectID   INT UNSIGNED NOT NULL,
  Title       VARCHAR(255) NOT NULL,
  Description TEXT,
  Priority    ENUM('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  Status      ENUM('To Do','In Progress','Completed') NOT NULL DEFAULT 'To Do',
  DueDate     DATE,
  CreatedBy   INT UNSIGNED NOT NULL,
  CreatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                           ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_task_project FOREIGN KEY (ProjectID)
    REFERENCES projects(ProjectID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_task_creator FOREIGN KEY (CreatedBy)
    REFERENCES users(UserID) ON UPDATE CASCADE
);
 
-- ───────────────────────────────────────────────
CREATE TABLE assigned_tasks (
  TaskAssignmentID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  TaskID           INT UNSIGNED NOT NULL,
  UserID           INT UNSIGNED NOT NULL,
  AssignedBy       INT UNSIGNED NOT NULL,
  AssignedDate     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_task_user (TaskID, UserID),
  CONSTRAINT fk_at_task FOREIGN KEY (TaskID)
    REFERENCES tasks(TaskID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_at_user FOREIGN KEY (UserID)
    REFERENCES users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_at_assigned_by FOREIGN KEY (AssignedBy)
    REFERENCES users(UserID) ON UPDATE CASCADE
);
 
-- ────────────────────────────────────────────────────────────────
CREATE TABLE comments (
  CommentID   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  TaskID      INT UNSIGNED NOT NULL,
  UserID      INT UNSIGNED NOT NULL,
  CommentText TEXT         NOT NULL,
  CreatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_task FOREIGN KEY (TaskID)
    REFERENCES tasks(TaskID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comment_user FOREIGN KEY (UserID)
    REFERENCES users(UserID) ON DELETE CASCADE ON UPDATE CASCADE
);
 
-- ─────────────────────────────────────────────────────────────
CREATE TABLE attachments (
  AttachmentID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  TaskID       INT UNSIGNED  NOT NULL,
  UserID       INT UNSIGNED  NOT NULL,
  FileName     VARCHAR(255)  NOT NULL,
  FilePath     VARCHAR(500)  NOT NULL,
  FileType     VARCHAR(100),
  UploadedAt   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attach_task FOREIGN KEY (TaskID)
    REFERENCES tasks(TaskID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_attach_user FOREIGN KEY (UserID)
    REFERENCES users(UserID) ON UPDATE CASCADE
);
 
-- ───────────────────────────────────────────────────────────
CREATE TABLE notifications (
  NotificationID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  UserID         INT UNSIGNED NOT NULL,
  TaskID         INT UNSIGNED,
  Message        VARCHAR(500) NOT NULL,
  IsRead         TINYINT(1)   NOT NULL DEFAULT 0,
  CreatedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (UserID)
    REFERENCES users(UserID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notif_task FOREIGN KEY (TaskID)
    REFERENCES tasks(TaskID) ON DELETE SET NULL ON UPDATE CASCADE
);

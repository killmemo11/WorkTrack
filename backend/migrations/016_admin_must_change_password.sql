-- 016_admin_must_change_password.sql
-- Phase 1: Add must_change_password column to admin_users.
-- Also defensively removes any stray admin_default_password row from settings
-- (no such key currently exists in the codebase, but the AGENTS.md/plain-text
-- bug report flagged it historically — purge it if present).

ALTER TABLE admin_users
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1
  AFTER password_hash;

-- Purge any legacy plaintext admin password setting (defensive — expected no-op).
DELETE FROM settings
WHERE `key` = 'admin_default_password';

-- Indices unchanged.

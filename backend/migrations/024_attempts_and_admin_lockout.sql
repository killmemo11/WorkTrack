-- Migration 024: Add attempts column to pending_registrations
-- and add failed_attempts/last_failed_login to admin_users

ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS attempts INT DEFAULT 0 AFTER verification_expires;

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_failed_login DATETIME DEFAULT NULL;

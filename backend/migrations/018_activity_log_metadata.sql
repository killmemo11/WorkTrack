-- Phase 5: Extend activity_log with metadata columns for audit trail
-- Run: mysql -u root work_track_db < 018_activity_log_metadata.sql

-- Add old_value and new_value columns for before/after tracking
SET @c1 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_log' AND COLUMN_NAME='old_value');
PREPARE s1 FROM IF(@c1=0, 'ALTER TABLE activity_log ADD COLUMN old_value TEXT NULL AFTER description', 'SELECT 1');
EXECUTE s1;
DEALLOCATE PREPARE s1;

SET @c2 = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_log' AND COLUMN_NAME='new_value');
PREPARE s2 FROM IF(@c2=0, 'ALTER TABLE activity_log ADD COLUMN new_value TEXT NULL AFTER old_value', 'SELECT 1');
EXECUTE s2;
DEALLOCATE PREPARE s2;

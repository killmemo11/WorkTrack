-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

-- Migration 029: department title hiring requirements.
-- Personnel, headcount and recruitment code read and write these columns, but
-- the schema snapshot predates them and no migration ever added them. Fresh
-- snapshot-imported installs therefore failed on title create/update, headcount
-- validation and publishing an active job ("Unknown column").
--
-- Idempotent: safe to re-run.

-- max_headcount is used by headcount.util.js for department headcount totals.
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='max_headcount');
SET @sql = IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN max_headcount INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='min_education_level');
SET @sql = IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN min_education_level VARCHAR(100) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='min_experience_years');
SET @sql = IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN min_experience_years VARCHAR(50) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Skill/cert requirement lists are JSON-encoded arrays of master-list ids.
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='required_skills');
SET @sql = IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN required_skills LONGTEXT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='required_certs');
SET @sql = IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN required_certs LONGTEXT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='preferred_skills');
SET @sql = IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN preferred_skills LONGTEXT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='preferred_certs');
SET @sql = IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN preferred_certs LONGTEXT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

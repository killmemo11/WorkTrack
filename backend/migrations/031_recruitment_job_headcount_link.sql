-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

-- Migration 031: link recruitment jobs to the headcount request that created
-- them. headcount-request.controller.js inserts this column when a headcount
-- request spawns a job, and recruitment.controller.js joins it to show the
-- requester, but no earlier migration ever added it. Snapshot-baselined
-- databases therefore returned 500 from GET /api/hr/recruitment/jobs.
--
-- Idempotent: safe to re-run.

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recruitment_jobs'
            AND COLUMN_NAME = 'headcount_request_id');
SET @sql = IF(@c = 0,
  'ALTER TABLE recruitment_jobs ADD COLUMN headcount_request_id INT DEFAULT NULL AFTER title_id',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @i = (SELECT COUNT(*) FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'recruitment_jobs'
            AND INDEX_NAME = 'idx_rjobs_headcount_request');
SET @sql = IF(@i = 0,
  'ALTER TABLE recruitment_jobs ADD INDEX idx_rjobs_headcount_request (headcount_request_id)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

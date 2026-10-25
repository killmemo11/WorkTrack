-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

-- Migration 025: tenant isolation hardening
--   1. Ensure tenant_id exists on tables 022 covers (repair partial applies).
--   2. Backfill legacy NULL tenant_id rows in tables added by 022.
--   3. Make holidays unique per tenant instead of globally.
--   4. Add tenant ownership to master_skills / master_certifications.
--   5. Add tenant ownership to phone_screening_templates (questions inherit it).
--
-- Idempotent: safe to re-run. Apply manually with:
--   mysql -u worktrack -p work_track_db < backend/migrations/025_tenant_isolation_hardening.sql
--
-- PREPARE accepts a user variable or a string literal, not an IF() expression,
-- so every conditional DDL statement stages the SQL in @sql first.

-- ---------------------------------------------------------------------------
-- 1. Ensure the tenant_id columns and indexes the application filters on are
--    present. Long-lived databases may have applied only part of 022, and the
--    backfills below would otherwise fail with "unknown column".
-- ---------------------------------------------------------------------------
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE tasks ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_tasks_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_jobs');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_jobs' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE recruitment_jobs ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_rec_jobs_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_candidates');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_candidates' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE recruitment_candidates ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_rec_cand_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_history');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_history' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE recruitment_history ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_rec_history_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_scorecards');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_scorecards' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE recruitment_scorecards ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_rec_scorecards_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_offers');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_offers' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE recruitment_offers ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_rec_offers_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_interviews');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_interviews' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE recruitment_interviews ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_rec_interviews_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='holidays');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='holidays' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE holidays ADD COLUMN tenant_id INT DEFAULT NULL, ADD INDEX idx_hol_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

UPDATE holidays SET tenant_id = 1 WHERE tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Backfill tasks from the assigner, then the assignee.
-- ---------------------------------------------------------------------------
UPDATE tasks t
  JOIN employees e ON e.id = t.assigned_by
  SET t.tenant_id = e.tenant_id
  WHERE t.tenant_id IS NULL;

UPDATE tasks t
  JOIN employees e ON e.id = t.assigned_to
  SET t.tenant_id = e.tenant_id
  WHERE t.tenant_id IS NULL;

UPDATE tasks SET tenant_id = 1 WHERE tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Backfill recruitment rows from their parents.
-- ---------------------------------------------------------------------------
UPDATE recruitment_jobs j
  JOIN department_titles dt ON dt.id = j.title_id
  SET j.tenant_id = dt.tenant_id
  WHERE j.tenant_id IS NULL;

UPDATE recruitment_jobs SET tenant_id = 1 WHERE tenant_id IS NULL;

UPDATE recruitment_candidates c
  JOIN recruitment_jobs j ON j.id = c.job_id
  SET c.tenant_id = j.tenant_id
  WHERE c.tenant_id IS NULL;

UPDATE recruitment_candidates SET tenant_id = 1 WHERE tenant_id IS NULL;

UPDATE recruitment_history h
  JOIN recruitment_candidates c ON c.id = h.candidate_id
  SET h.tenant_id = c.tenant_id
  WHERE h.tenant_id IS NULL;

UPDATE recruitment_scorecards sc
  JOIN recruitment_candidates c ON c.id = sc.candidate_id
  SET sc.tenant_id = c.tenant_id
  WHERE sc.tenant_id IS NULL;

UPDATE recruitment_offers o
  JOIN recruitment_candidates c ON c.id = o.candidate_id
  SET o.tenant_id = c.tenant_id
  WHERE o.tenant_id IS NULL;

UPDATE recruitment_interviews i
  JOIN recruitment_candidates c ON c.id = i.candidate_id
  SET i.tenant_id = c.tenant_id
  WHERE i.tenant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 4. holidays: global UNIQUE(date) -> UNIQUE(tenant_id, date)
-- ---------------------------------------------------------------------------
SET @idx = (
  SELECT INDEX_NAME FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'holidays'
    AND NON_UNIQUE = 0
    AND COLUMN_NAME = 'date'
    AND INDEX_NAME <> 'PRIMARY'
  LIMIT 1
);
SET @sql = IF(@idx IS NULL, 'SELECT 1', CONCAT('ALTER TABLE holidays DROP INDEX `', @idx, '`'));
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @c = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'holidays'
    AND INDEX_NAME = 'uniq_holiday_tenant_date'
);
SET @sql = IF(@c = 0,
  'ALTER TABLE holidays ADD UNIQUE KEY uniq_holiday_tenant_date (tenant_id, date)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------------------------------------------------------------------------
-- 5. master_skills / master_certifications: tenant ownership.
--    Read catalog stays global; only the owning tenant may mutate a row.
-- ---------------------------------------------------------------------------
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='master_skills');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='master_skills' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE master_skills ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER name, ADD INDEX idx_ms_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='master_certifications');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='master_certifications' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE master_certifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER name, ADD INDEX idx_mc_tenant (tenant_id)');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------------------------------------------------------------------------
-- 6. phone_screening_templates: tenant ownership.
--    Questions/evaluations/call logs are reached through their template or
--    candidate, which are now tenant-scoped.
-- ---------------------------------------------------------------------------
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='phone_screening_templates');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='phone_screening_templates' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=0 OR @c>0, 'SELECT 1', 'ALTER TABLE phone_screening_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id, ADD INDEX idx_pst_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

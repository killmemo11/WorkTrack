-- Migration 022: Add tenant_id to tasks and recruitment tables for multi-tenant isolation
-- This migration fixes cross-tenant data leakage

-- Add tenant_id to tasks
ALTER TABLE tasks ADD COLUMN tenant_id INT DEFAULT NULL AFTER id;
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);

-- Add tenant_id to recruitment tables
ALTER TABLE recruitment_jobs ADD COLUMN tenant_id INT DEFAULT NULL;
CREATE INDEX idx_rec_jobs_tenant ON recruitment_jobs(tenant_id);

ALTER TABLE recruitment_candidates ADD COLUMN tenant_id INT DEFAULT NULL;
CREATE INDEX idx_rec_cand_tenant ON recruitment_candidates(tenant_id);

ALTER TABLE recruitment_history ADD COLUMN tenant_id INT DEFAULT NULL;
CREATE INDEX idx_rec_history_tenant ON recruitment_history(tenant_id);

ALTER TABLE recruitment_scorecards ADD COLUMN tenant_id INT DEFAULT NULL;
CREATE INDEX idx_rec_scorecards_tenant ON recruitment_scorecards(tenant_id);

ALTER TABLE recruitment_offers ADD COLUMN tenant_id INT DEFAULT NULL;
CREATE INDEX idx_rec_offers_tenant ON recruitment_offers(tenant_id);

ALTER TABLE recruitment_interviews ADD COLUMN tenant_id INT DEFAULT NULL;
CREATE INDEX idx_rec_interviews_tenant ON recruitment_interviews(tenant_id);

-- Add failed_attempts and last_failed_login to employees for brute-force protection
ALTER TABLE employees ADD COLUMN failed_attempts INT DEFAULT 0;
ALTER TABLE employees ADD COLUMN last_failed_login DATETIME DEFAULT NULL;

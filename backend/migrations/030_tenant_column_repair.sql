-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

-- Migration 030: restore tenant ownership columns lost to the 012 baseline.
-- 012_multitenancy.sql used `PREPARE s FROM IF(...)`, which MariaDB rejects, so
-- it could never apply. Databases bootstrapped from the schema snapshot were
-- baselined past it and therefore lack tenant_id on many tenant-owned tables.
-- The application filters on these columns (profiles, documents, checklists,
-- headcount requests, assets, ...), so those screens returned 500.
--
-- Idempotent: safe to re-run. Indexes are added with the column; foreign keys
-- are omitted because historical rows may predate the tenants reference.

-- ── departments.max_headcount (headcount recalculation) ──────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='departments' AND COLUMN_NAME='max_headcount');
SET @sql = IF(@c=0, 'ALTER TABLE departments ADD COLUMN max_headcount INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── tenant_id columns ────────────────────────────────────────────
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_notifications' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE admin_notifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_an_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='asset_assignments' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE asset_assignments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_aa_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='asset_catalog' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE asset_catalog ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ac_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='asset_history' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE asset_history ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ah_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='balance_audit' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE balance_audit ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ba_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='checklist_items' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE checklist_items ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ci_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='checklist_templates' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE checklist_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ct_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contract_templates' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE contract_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_contract_tpl_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_certifications' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_certifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ec_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_checklist_tasks' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_checklist_tasks ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ect_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_checklists' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_checklists ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ecl_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_contracts' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_contracts ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ecn_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_documents' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_documents ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ed_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_education' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_education ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ee_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_medical_family' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_medical_family ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_emf_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_profiles' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_profiles ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ep_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_status_log' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_status_log ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_esl_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_work_history' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE employee_work_history ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_ewh_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='headcount_requests' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE headcount_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_hcr_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='resignation_requests' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE resignation_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_rr_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_components' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@c=0, 'ALTER TABLE salary_components ADD COLUMN tenant_id INT NOT NULL DEFAULT 1, ADD INDEX idx_sc_tenant (tenant_id)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Backfill from the owning employee / parent row ───────────────
UPDATE admin_notifications n JOIN admin_users au ON au.id = n.admin_id
  SET n.tenant_id = COALESCE(au.tenant_id, 1);

UPDATE asset_assignments t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE asset_history t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE asset_history t JOIN asset_catalog a ON a.id = t.asset_id
  SET t.tenant_id = a.tenant_id
  WHERE t.employee_id IS NULL;

UPDATE balance_audit t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;

UPDATE checklist_templates t JOIN departments d ON d.id = t.department_id
  SET t.tenant_id = d.tenant_id;
UPDATE checklist_items t JOIN employees e ON e.id = t.assigned_to
  SET t.tenant_id = e.tenant_id;
UPDATE checklist_items t JOIN checklist_templates ct ON ct.id = t.template_id
  SET t.tenant_id = ct.tenant_id
  WHERE t.assigned_to IS NULL;

UPDATE employee_certifications t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_checklists t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_checklist_tasks t JOIN employees e ON e.id = t.assigned_to_employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_checklist_tasks t JOIN employee_checklists c ON c.id = t.checklist_id
  SET t.tenant_id = c.tenant_id
  WHERE t.assigned_to_employee_id IS NULL;
UPDATE employee_contracts t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_documents t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_education t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_medical_family t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_profiles t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_status_log t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE employee_work_history t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE headcount_requests t JOIN employees e ON e.id = t.requester_id
  SET t.tenant_id = e.tenant_id;
UPDATE resignation_requests t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;
UPDATE salary_components t JOIN employees e ON e.id = t.employee_id
  SET t.tenant_id = e.tenant_id;

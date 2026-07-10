-- Multi-Tenancy Migration
-- Adds tenant_id to all existing tables and creates tenants table

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255) NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NULL,
  plan VARCHAR(50) DEFAULT 'trial',
  max_employees INT DEFAULT 50,
  status ENUM('pending','active','suspended','cancelled') DEFAULT 'pending',
  trial_ends_at DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant_status (status),
  INDEX idx_tenant_slug (slug)
);

-- 2. Insert default tenant
INSERT IGNORE INTO tenants (id, name, slug, contact_email, status, plan, max_employees, trial_ends_at, created_at)
VALUES (1, 'WorkTrack Demo Company', 'demo', 'admin@worktrack.ddns.net', 'active', 'enterprise', 9999, DATE_ADD(CURDATE(), INTERVAL 365 DAY), NOW());

-- 3. Create tenant_requests table
CREATE TABLE IF NOT EXISTS tenant_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NULL,
  employee_count INT DEFAULT 10,
  message TEXT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_tenant_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tr_status (status),
  INDEX idx_tr_email (contact_email),
  FOREIGN KEY (created_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

-- Add tenant_id columns (idempotent via IF NOT EXISTS pattern using DROP+ADD)
-- We use SQL to conditionally add columns

-- admin_users
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_users' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE admin_users ADD COLUMN tenant_id INT NULL AFTER password_hash, ADD INDEX idx_admin_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employees
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employees' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employees ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_system, ADD INDEX idx_emp_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- settings
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='settings' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE settings ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER `value`, ADD UNIQUE KEY uniq_tenant_key (tenant_id, `key`), ADD INDEX idx_settings_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- departments
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='departments' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE departments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER manager_email, ADD INDEX idx_dept_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- activity_log
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_log' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE activity_log ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER description, ADD INDEX idx_al_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- balance_audit
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='balance_audit' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE balance_audit ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER performed_by, ADD INDEX idx_ba_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- admin_notifications
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='admin_notifications' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE admin_notifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER admin_id, ADD INDEX idx_an_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- pending_registrations
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='pending_registrations' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE pending_registrations ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER department_id, ADD INDEX idx_pr_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- leave_requests
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_requests' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE leave_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER rejection_reason, ADD INDEX idx_lr_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- leave_balances
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_balances' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE leave_balances ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER balance, ADD INDEX idx_lb_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- notifications
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='notifications' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE notifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_notif_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- leave_types
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leave_types' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE leave_types ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_active, ADD INDEX idx_lt_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- holidays
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='holidays' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE holidays ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_hol_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- attendance_records
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendance_records' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE attendance_records ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_manual_sign_out, ADD INDEX idx_att_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- signout_requests
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='signout_requests' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE signout_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_sr_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- resignation_requests
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='resignation_requests' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE resignation_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_rr_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- asset_catalog
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='asset_catalog' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE asset_catalog ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_ac_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- asset_assignments
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='asset_assignments' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE asset_assignments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_aa_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- asset_history
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='asset_history' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE asset_history ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ah_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_profiles
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_profiles' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_profiles ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_ep_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_medical_family
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_medical_family' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_medical_family ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_emf_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_documents
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_documents' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_documents ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ed_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_education
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_education' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_education ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ee_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_work_history
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_work_history' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_work_history ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ewh_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_certifications
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_certifications' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_certifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ec_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_status_log
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_status_log' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_status_log ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_esl_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- positions
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='positions' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE positions ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_pos_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- department_titles
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='department_titles' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE department_titles ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER department_id, ADD INDEX idx_dt_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- grades
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='grades' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE grades ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER grade_level, ADD INDEX idx_gr_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- contract_templates
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='contract_templates' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE contract_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_ct_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_contracts
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_contracts' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_contracts ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ec_tenant2 (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- checklist_templates
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='checklist_templates' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE checklist_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_clt_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- checklist_items
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='checklist_items' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE checklist_items ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_cli_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_checklists
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_checklists' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_checklists ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ecl_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- employee_checklist_tasks
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employee_checklist_tasks' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE employee_checklist_tasks ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_ect_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- salary_components
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='salary_components' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE salary_components ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at, ADD INDEX idx_sc_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- recruitment_jobs
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_jobs' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE recruitment_jobs ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_rj_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- recruitment_candidates
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_candidates' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE recruitment_candidates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_rc_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- skills
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='skills' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE skills ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_active, ADD INDEX idx_sk_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- certifications
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='certifications' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE certifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_active, ADD INDEX idx_cert_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- interview_stages
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interview_stages' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE interview_stages ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER order_index, ADD INDEX idx_ist_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- message_templates
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='message_templates' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE message_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_mt_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- workflow_templates
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workflow_templates' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE workflow_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_wft_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- workflow_stages
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workflow_stages' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE workflow_stages ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER order_index, ADD INDEX idx_wfs_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- workflow_rules
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workflow_rules' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE workflow_rules ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER priority, ADD INDEX idx_wfr_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- headcount_requests
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='headcount_requests' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE headcount_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_hcr_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- tasks
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND COLUMN_NAME='tenant_id');
PREPARE s FROM IF(@c=0, 'ALTER TABLE tasks ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at, ADD INDEX idx_task_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
EXECUTE s; DEALLOCATE PREPARE s;

-- Backfill
UPDATE admin_users SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE employees SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE settings SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE departments SET tenant_id = 1 WHERE tenant_id IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

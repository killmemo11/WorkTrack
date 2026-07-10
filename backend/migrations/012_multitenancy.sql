-- Multi-Tenancy Migration
-- Adds tenant_id to all existing tables and creates tenants table

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

-- 2. Create tenant_requests table (for self-serve signup flow)
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

-- 3. Create platform_admins table (separate from tenant admins)
CREATE TABLE IF NOT EXISTS platform_admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 4. Add tenant_id to admin_users (tenant admins, IT admins, etc.)
ALTER TABLE admin_users ADD COLUMN tenant_id INT NULL AFTER password_hash;
ALTER TABLE admin_users ADD INDEX idx_admin_tenant (tenant_id);
ALTER TABLE admin_users ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 5. Add tenant_id to employees
ALTER TABLE employees ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_system;
ALTER TABLE employees ADD INDEX idx_emp_tenant (tenant_id);
ALTER TABLE employees ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 6. Add tenant_id to settings (per-tenant settings)
ALTER TABLE settings ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER `value`;
ALTER TABLE settings DROP INDEX `key`;
ALTER TABLE settings ADD UNIQUE KEY uniq_tenant_key (tenant_id, `key`);
ALTER TABLE settings ADD INDEX idx_settings_tenant (tenant_id);
ALTER TABLE settings ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 7. Add tenant_id to departments
ALTER TABLE departments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER manager_email;
ALTER TABLE departments ADD INDEX idx_dept_tenant (tenant_id);
ALTER TABLE departments ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 8. Add tenant_id to activity_log
ALTER TABLE activity_log ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER description;
ALTER TABLE activity_log ADD INDEX idx_al_tenant (tenant_id);
ALTER TABLE activity_log ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 9. Add tenant_id to balance_audit
ALTER TABLE balance_audit ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER performed_by;
ALTER TABLE balance_audit ADD INDEX idx_ba_tenant (tenant_id);
ALTER TABLE balance_audit ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 10. Add tenant_id to admin_notifications
ALTER TABLE admin_notifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER admin_id;
ALTER TABLE admin_notifications ADD INDEX idx_an_tenant (tenant_id);
ALTER TABLE admin_notifications ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 11. Add tenant_id to pending_registrations
ALTER TABLE pending_registrations ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER department_id;
ALTER TABLE pending_registrations ADD INDEX idx_pr_tenant (tenant_id);
ALTER TABLE pending_registrations ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 12. Add tenant_id to leave_requests
ALTER TABLE leave_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER rejection_reason;
ALTER TABLE leave_requests ADD INDEX idx_lr_tenant (tenant_id);
ALTER TABLE leave_requests ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 13. Add tenant_id to leave_balances
ALTER TABLE leave_balances ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER balance;
ALTER TABLE leave_balances ADD INDEX idx_lb_tenant (tenant_id);
ALTER TABLE leave_balances ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 14. Add tenant_id to notifications
ALTER TABLE notifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE notifications ADD INDEX idx_notif_tenant (tenant_id);
ALTER TABLE notifications ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 15. Add tenant_id to leave_types
ALTER TABLE leave_types ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_active;
ALTER TABLE leave_types ADD INDEX idx_lt_tenant (tenant_id);
ALTER TABLE leave_types ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 16. Add tenant_id to holidays
ALTER TABLE holidays ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE holidays ADD INDEX idx_hol_tenant (tenant_id);
ALTER TABLE holidays ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 17. Add tenant_id to attendance_records
ALTER TABLE attendance_records ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_manual_sign_out;
ALTER TABLE attendance_records ADD INDEX idx_att_tenant (tenant_id);
ALTER TABLE attendance_records ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 18. Add tenant_id to signout_requests
ALTER TABLE signout_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE signout_requests ADD INDEX idx_sr_tenant (tenant_id);
ALTER TABLE signout_requests ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 19. Add tenant_id to resignation_requests
ALTER TABLE resignation_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE resignation_requests ADD INDEX idx_rr_tenant (tenant_id);
ALTER TABLE resignation_requests ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 20. Add tenant_id to asset_catalog
ALTER TABLE asset_catalog ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE asset_catalog ADD INDEX idx_ac_tenant (tenant_id);
ALTER TABLE asset_catalog ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 21. Add tenant_id to asset_assignments
ALTER TABLE asset_assignments ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE asset_assignments ADD INDEX idx_aa_tenant (tenant_id);
ALTER TABLE asset_assignments ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 22. Add tenant_id to asset_history
ALTER TABLE asset_history ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE asset_history ADD INDEX idx_ah_tenant (tenant_id);
ALTER TABLE asset_history ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 23. Add tenant_id to employee_profiles
ALTER TABLE employee_profiles ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE employee_profiles ADD INDEX idx_ep_tenant (tenant_id);
ALTER TABLE employee_profiles ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 24. Add tenant_id to employee_medical_family
ALTER TABLE employee_medical_family ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_medical_family ADD INDEX idx_emf_tenant (tenant_id);
ALTER TABLE employee_medical_family ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 25. Add tenant_id to employee_documents
ALTER TABLE employee_documents ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_documents ADD INDEX idx_ed_tenant (tenant_id);
ALTER TABLE employee_documents ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 26. Add tenant_id to employee_education
ALTER TABLE employee_education ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_education ADD INDEX idx_ee_tenant (tenant_id);
ALTER TABLE employee_education ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 27. Add tenant_id to employee_work_history
ALTER TABLE employee_work_history ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_work_history ADD INDEX idx_ewh_tenant (tenant_id);
ALTER TABLE employee_work_history ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 28. Add tenant_id to employee_certifications
ALTER TABLE employee_certifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_certifications ADD INDEX idx_ec_tenant (tenant_id);
ALTER TABLE employee_certifications ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 29. Add tenant_id to employee_status_log
ALTER TABLE employee_status_log ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_status_log ADD INDEX idx_esl_tenant (tenant_id);
ALTER TABLE employee_status_log ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 30. Add tenant_id to positions
ALTER TABLE positions ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE positions ADD INDEX idx_pos_tenant (tenant_id);
ALTER TABLE positions ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 31. Add tenant_id to department_titles
ALTER TABLE department_titles ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER department_id;
ALTER TABLE department_titles ADD INDEX idx_dt_tenant (tenant_id);
ALTER TABLE department_titles ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 32. Add tenant_id to grades
ALTER TABLE grades ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER grade_level;
ALTER TABLE grades ADD INDEX idx_gr_tenant (tenant_id);
ALTER TABLE grades ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 33. Add tenant_id to contract_templates
ALTER TABLE contract_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE contract_templates ADD INDEX idx_ct_tenant (tenant_id);
ALTER TABLE contract_templates ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 34. Add tenant_id to employee_contracts
ALTER TABLE employee_contracts ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_contracts ADD INDEX idx_ec_tenant (tenant_id);
ALTER TABLE employee_contracts ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 35. Add tenant_id to checklist_templates
ALTER TABLE checklist_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE checklist_templates ADD INDEX idx_clt_tenant (tenant_id);
ALTER TABLE checklist_templates ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 36. Add tenant_id to checklist_items
ALTER TABLE checklist_items ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE checklist_items ADD INDEX idx_cli_tenant (tenant_id);
ALTER TABLE checklist_items ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 37. Add tenant_id to employee_checklists
ALTER TABLE employee_checklists ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_checklists ADD INDEX idx_ecl_tenant (tenant_id);
ALTER TABLE employee_checklists ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 38. Add tenant_id to employee_checklist_tasks
ALTER TABLE employee_checklist_tasks ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE employee_checklist_tasks ADD INDEX idx_ect_tenant (tenant_id);
ALTER TABLE employee_checklist_tasks ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 39. Add tenant_id to salary_components
ALTER TABLE salary_components ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER created_at;
ALTER TABLE salary_components ADD INDEX idx_sc_tenant (tenant_id);
ALTER TABLE salary_components ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 40. Add tenant_id to recruitment_jobs
ALTER TABLE recruitment_jobs ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE recruitment_jobs ADD INDEX idx_rj_tenant (tenant_id);
ALTER TABLE recruitment_jobs ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 41. Add tenant_id to recruitment_candidates
ALTER TABLE recruitment_candidates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE recruitment_candidates ADD INDEX idx_rc_tenant (tenant_id);
ALTER TABLE recruitment_candidates ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 42. Add tenant_id to skills, certifications (master lists)
ALTER TABLE skills ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_active;
ALTER TABLE skills ADD INDEX idx_sk_tenant (tenant_id);
ALTER TABLE skills ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE certifications ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER is_active;
ALTER TABLE certifications ADD INDEX idx_cert_tenant (tenant_id);
ALTER TABLE certifications ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 43. Add tenant_id to interview_stages
ALTER TABLE interview_stages ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER order_index;
ALTER TABLE interview_stages ADD INDEX idx_ist_tenant (tenant_id);
ALTER TABLE interview_stages ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 44. Add tenant_id to message_templates
ALTER TABLE message_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE message_templates ADD INDEX idx_mt_tenant (tenant_id);
ALTER TABLE message_templates ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 45. Add tenant_id to workflow_templates
ALTER TABLE workflow_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE workflow_templates ADD INDEX idx_wft_tenant (tenant_id);
ALTER TABLE workflow_templates ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 46. Add tenant_id to workflow_stages
ALTER TABLE workflow_stages ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER order_index;
ALTER TABLE workflow_stages ADD INDEX idx_wfs_tenant (tenant_id);
ALTER TABLE workflow_stages ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 47. Add tenant_id to workflow_rules
ALTER TABLE workflow_rules ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER priority;
ALTER TABLE workflow_rules ADD INDEX idx_wfr_tenant (tenant_id);
ALTER TABLE workflow_rules ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 48. Add tenant_id to headcount_requests
ALTER TABLE headcount_requests ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE headcount_requests ADD INDEX idx_hr_tenant (tenant_id);
ALTER TABLE headcount_requests ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 49. Add tenant_id to tasks
ALTER TABLE tasks ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER updated_at;
ALTER TABLE tasks ADD INDEX idx_task_tenant (tenant_id);
ALTER TABLE tasks ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- 50. Insert the first tenant (current data)
INSERT IGNORE INTO tenants (id, name, slug, contact_email, status, plan, max_employees, trial_ends_at, created_at)
VALUES (1, 'WorkTrack Demo Company', 'demo', 'admin@worktrack.ddns.net', 'active', 'enterprise', 9999, DATE_ADD(CURDATE(), INTERVAL 365 DAY), NOW());

-- 50. Update admin_users to have tenant_id = 1 (for existing IT admin)
UPDATE admin_users SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 51. Update employees to have tenant_id = 1
UPDATE employees SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 52. Update settings to have tenant_id = 1
UPDATE settings SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 53. Update departments to have tenant_id = 1
UPDATE departments SET tenant_id = 1 WHERE tenant_id IS NULL;
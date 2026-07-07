-- ============================================================
-- FULL SCHEMA: WorkTrack WFH Attendance System
-- Generated from migrations/ and seed.js
-- ============================================================

-- -----------------------------------------------------------
-- 1. employees (base table)
-- -----------------------------------------------------------
DROP TABLE IF EXISTS `admin_notifications`;
DROP TABLE IF EXISTS `admin_notifications`;
DROP TABLE IF EXISTS `employee_checklist_tasks`;
DROP TABLE IF EXISTS `employee_checklists`;
DROP TABLE IF EXISTS `checklist_items`;
DROP TABLE IF EXISTS `checklist_templates`;
DROP TABLE IF EXISTS `employee_contracts`;
DROP TABLE IF EXISTS `contract_templates`;
DROP TABLE IF EXISTS `asset_history`;
DROP TABLE IF EXISTS `asset_assignments`;
DROP TABLE IF EXISTS `asset_catalog`;
DROP TABLE IF EXISTS `resignation_requests`;
DROP TABLE IF EXISTS `headcount_requests`;
DROP TABLE IF EXISTS `title_evaluation_criteria`;
DROP TABLE IF EXISTS `department_titles`;
DROP TABLE IF EXISTS `grade_benefits`;
DROP TABLE IF EXISTS `grades`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `hr_permissions`;
DROP TABLE IF EXISTS `salary_components`;
DROP TABLE IF EXISTS `signout_requests`;
DROP TABLE IF EXISTS `employee_status_log`;
DROP TABLE IF EXISTS `employee_certifications`;
DROP TABLE IF EXISTS `employee_work_history`;
DROP TABLE IF EXISTS `employee_education`;
DROP TABLE IF EXISTS `employee_documents`;
DROP TABLE IF EXISTS `employee_medical_family`;
DROP TABLE IF EXISTS `employee_profiles`;
DROP TABLE IF EXISTS `positions`;
DROP TABLE IF EXISTS `balance_audit`;
DROP TABLE IF EXISTS `activity_log`;
DROP TABLE IF EXISTS `leave_balances`;
DROP TABLE IF EXISTS `leave_types`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `leave_requests`;
DROP TABLE IF EXISTS `holidays`;
DROP TABLE IF EXISTS `pending_registrations`;
DROP TABLE IF EXISTS `recruitment_scorecards`;
DROP TABLE IF EXISTS `recruitment_offers`;
DROP TABLE IF EXISTS `recruitment_interviews`;
DROP TABLE IF EXISTS `recruitment_history`;
DROP TABLE IF EXISTS `recruitment_candidates`;
DROP TABLE IF EXISTS `recruitment_jobs`;
DROP TABLE IF EXISTS `attendance_records`;
DROP TABLE IF EXISTS `departments`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `admin_users`;
DROP TABLE IF EXISTS `employees`;

-- -----------------------------------------------------------
-- 2. employees
-- -----------------------------------------------------------
CREATE TABLE employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT UNIQUE DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100) UNIQUE DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  is_verified TINYINT(1) DEFAULT 0,
  verification_code VARCHAR(6) DEFAULT NULL,
  verification_expires DATETIME DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) DEFAULT NULL,
  department_id INT DEFAULT NULL,
  position_id INT DEFAULT NULL,
  title_id INT DEFAULT NULL,
  grade_id INT DEFAULT NULL,
  role ENUM('employee','admin','manager','ceo') DEFAULT 'employee',
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  can_wfh TINYINT(1) NOT NULL DEFAULT 1,
  employment_status ENUM('active','resigned') DEFAULT 'active',
  resignation_date DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 3. admin_users
-- -----------------------------------------------------------
CREATE TABLE admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 4. settings
-- -----------------------------------------------------------
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 5. departments
-- -----------------------------------------------------------
CREATE TABLE departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  manager_email VARCHAR(255) NULL,
  c_level_email VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 6. attendance_records
-- -----------------------------------------------------------
CREATE TABLE attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  `type` ENUM('wfh','office') NOT NULL DEFAULT 'wfh',
  sign_in_time DATETIME NOT NULL,
  sign_out_time DATETIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  sign_out_notes TEXT DEFAULT NULL,
  is_manual_sign_out TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_date (employee_id, date)
);

-- -----------------------------------------------------------
-- 7. pending_registrations
-- -----------------------------------------------------------
CREATE TABLE pending_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  employee_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department_id INT DEFAULT NULL,
  verification_code VARCHAR(6) NOT NULL,
  verification_expires DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email),
  UNIQUE KEY uk_username (username),
  UNIQUE KEY uk_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------
-- 8. holidays
-- -----------------------------------------------------------
CREATE TABLE holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 9. leave_types
-- -----------------------------------------------------------
CREATE TABLE leave_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  default_balance DECIMAL(5,1) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  routed_to ENUM('manager','admin') NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 10. leave_requests
-- -----------------------------------------------------------
CREATE TABLE leave_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count DECIMAL(4,1) NOT NULL,
  reason TEXT,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_by_manager_id INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);

-- -----------------------------------------------------------
-- 11. leave_balances
-- -----------------------------------------------------------
CREATE TABLE leave_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  balance DECIMAL(5,1) NOT NULL DEFAULT 0,
  UNIQUE KEY unique_emp_type (employee_id, leave_type),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- 12. notifications
-- -----------------------------------------------------------
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  link VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX idx_notif_employee ON notifications(employee_id);
CREATE INDEX idx_notif_read ON notifications(is_read);

-- -----------------------------------------------------------
-- 13. balance_audit
-- -----------------------------------------------------------
CREATE TABLE balance_audit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  old_balance DECIMAL(5,1) NOT NULL DEFAULT 0,
  new_balance DECIMAL(5,1) NOT NULL DEFAULT 0,
  change_amount DECIMAL(5,1) NOT NULL DEFAULT 0,
  action VARCHAR(50) NOT NULL,
  reference_id INT DEFAULT NULL,
  performed_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX idx_ba_employee ON balance_audit(employee_id);
CREATE INDEX idx_ba_action ON balance_audit(action);

-- -----------------------------------------------------------
-- 14. activity_log
-- -----------------------------------------------------------
CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT DEFAULT NULL,
  admin_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_employee (employee_id),
  INDEX idx_al_admin (admin_id),
  INDEX idx_al_action (action),
  INDEX idx_al_created (created_at)
);

-- -----------------------------------------------------------
-- 15. signout_requests
-- -----------------------------------------------------------
CREATE TABLE signout_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  attendance_record_id INT NOT NULL,
  sign_out_time DATETIME NOT NULL,
  notes TEXT,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id) ON DELETE CASCADE
);
CREATE INDEX idx_sr_employee ON signout_requests(employee_id);
CREATE INDEX idx_sr_record ON signout_requests(attendance_record_id);
CREATE INDEX idx_sr_status ON signout_requests(status);

-- -----------------------------------------------------------
-- 16. admin_notifications
-- -----------------------------------------------------------
CREATE TABLE admin_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  link VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);
CREATE INDEX idx_admin_notif_admin ON admin_notifications(admin_id);
CREATE INDEX idx_admin_notif_read ON admin_notifications(is_read);

-- -----------------------------------------------------------
-- 17. positions
-- -----------------------------------------------------------
CREATE TABLE positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  department_id INT DEFAULT NULL,
  description TEXT,
  technical TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  UNIQUE KEY unique_position_title (title)
);
CREATE INDEX idx_position_department ON positions(department_id);

-- -----------------------------------------------------------
-- 18. employee_profiles
-- -----------------------------------------------------------
CREATE TABLE employee_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL UNIQUE,
  hire_date DATE DEFAULT NULL,
  contract_type ENUM('permanent','annual','probation','contractor') DEFAULT 'permanent',
  contract_end_date DATE DEFAULT NULL,
  work_type ENUM('full_time','part_time','remote') DEFAULT 'full_time',
  supervisor_id INT DEFAULT NULL,
  nationality VARCHAR(100) DEFAULT NULL,
  birth_date DATE DEFAULT NULL,
  birth_place VARCHAR(100) DEFAULT NULL,
  gender ENUM('male','female') DEFAULT NULL,
  marital_status ENUM('single','married','divorced') DEFAULT NULL,
  military_status VARCHAR(100) DEFAULT NULL,
  id_number VARCHAR(50) DEFAULT NULL UNIQUE,
  id_expiry DATE DEFAULT NULL,
  national_id_place VARCHAR(100) DEFAULT NULL,
  mother_name VARCHAR(255) DEFAULT NULL,
  passport_number VARCHAR(50) DEFAULT NULL,
  passport_expiry DATE DEFAULT NULL,
  insurance_number VARCHAR(50) DEFAULT NULL,
  medical_insurance_number VARCHAR(50) DEFAULT NULL,
  insurance_card_image VARCHAR(255) DEFAULT NULL,
  avatar_path VARCHAR(255) DEFAULT NULL,
  bank_name VARCHAR(255) DEFAULT NULL,
  bank_account VARCHAR(50) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  emergency_contact_name VARCHAR(255) DEFAULT NULL,
  emergency_contact_phone VARCHAR(20) DEFAULT NULL,
  emergency_contact_relation VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------
-- 19. employee_medical_family
-- -----------------------------------------------------------
CREATE TABLE employee_medical_family (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  relation VARCHAR(100) DEFAULT NULL,
  medical_insurance_number VARCHAR(50) DEFAULT NULL,
  insurance_card_image VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- 20. employee_documents
-- -----------------------------------------------------------
CREATE TABLE employee_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  doc_type VARCHAR(50) NOT NULL,
  doc_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  notes TEXT DEFAULT NULL,
  uploaded_by INT DEFAULT NULL,
  status ENUM('pending','verified','rejected') DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_docs_employee ON employee_documents(employee_id);

-- -----------------------------------------------------------
-- 21. employee_education
-- -----------------------------------------------------------
CREATE TABLE employee_education (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  degree VARCHAR(100) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  field_of_study VARCHAR(255) DEFAULT NULL,
  graduation_year YEAR DEFAULT NULL,
  grade VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX idx_edu_employee ON employee_education(employee_id);

-- -----------------------------------------------------------
-- 22. employee_work_history
-- -----------------------------------------------------------
CREATE TABLE employee_work_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  company VARCHAR(255) NOT NULL,
  position VARCHAR(255) NOT NULL,
  from_date DATE DEFAULT NULL,
  to_date DATE DEFAULT NULL,
  reason_leaving TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX idx_wh_employee ON employee_work_history(employee_id);

-- -----------------------------------------------------------
-- 23. employee_certifications
-- -----------------------------------------------------------
CREATE TABLE employee_certifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  issuing_authority VARCHAR(255) DEFAULT NULL,
  issue_date DATE DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  credential_url VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX idx_cert_employee ON employee_certifications(employee_id);

-- -----------------------------------------------------------
-- 24. employee_status_log
-- -----------------------------------------------------------
CREATE TABLE employee_status_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  from_position_id INT DEFAULT NULL,
  to_position_id INT DEFAULT NULL,
  from_department_id INT DEFAULT NULL,
  to_department_id INT DEFAULT NULL,
  effective_date DATE DEFAULT NULL,
  reason TEXT DEFAULT NULL,
  performed_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (from_position_id) REFERENCES positions(id) ON DELETE SET NULL,
  FOREIGN KEY (to_position_id) REFERENCES positions(id) ON DELETE SET NULL,
  FOREIGN KEY (from_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (to_department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_status_log_employee ON employee_status_log(employee_id);

-- -----------------------------------------------------------
-- 25. resignation_requests
-- -----------------------------------------------------------
CREATE TABLE resignation_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  reason TEXT DEFAULT NULL,
  resignation_date DATE NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------
-- 26. asset_catalog
-- -----------------------------------------------------------
CREATE TABLE asset_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('laptop','phone','badge','accessory','other') NOT NULL DEFAULT 'other',
  serial_number VARCHAR(255) DEFAULT NULL,
  brand VARCHAR(255) DEFAULT NULL,
  model VARCHAR(255) DEFAULT NULL,
  purchase_date DATE DEFAULT NULL,
  purchase_price DECIMAL(10,2) DEFAULT NULL,
  status ENUM('available','assigned','damaged','disposed') DEFAULT 'available',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_asset_status ON asset_catalog(status);
CREATE INDEX idx_asset_category ON asset_catalog(category);

-- -----------------------------------------------------------
-- 27. asset_assignments
-- -----------------------------------------------------------
CREATE TABLE asset_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  employee_id INT NOT NULL,
  assigned_date DATE NOT NULL,
  expected_return_date DATE DEFAULT NULL,
  condition_at_assign TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  assigned_by INT DEFAULT NULL,
  return_date DATE DEFAULT NULL,
  condition_on_return TEXT DEFAULT NULL,
  return_notes TEXT DEFAULT NULL,
  received_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES asset_catalog(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (received_by) REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_asset_assign_asset ON asset_assignments(asset_id);
CREATE INDEX idx_asset_assign_employee ON asset_assignments(employee_id);

-- -----------------------------------------------------------
-- 28. asset_history
-- -----------------------------------------------------------
CREATE TABLE asset_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_id INT NOT NULL,
  action ENUM('created','assigned','returned','damaged','disposed','transferred','updated') NOT NULL,
  employee_id INT DEFAULT NULL,
  performed_by INT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (asset_id) REFERENCES asset_catalog(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_asset_hist_asset ON asset_history(asset_id);

-- -----------------------------------------------------------
-- 29. contract_templates
-- -----------------------------------------------------------
CREATE TABLE contract_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('permanent','annual','probation','contractor') NOT NULL DEFAULT 'permanent',
  content_html TEXT NOT NULL,
  placeholders TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 30. employee_contracts
-- -----------------------------------------------------------
CREATE TABLE employee_contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  signed_date DATE DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  content_html TEXT DEFAULT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  status ENUM('draft','signed','expired','renewed') DEFAULT 'draft',
  signed_by_employee TINYINT(1) DEFAULT 0,
  signed_by_company TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE SET NULL
);
CREATE INDEX idx_emp_contracts_employee ON employee_contracts(employee_id);

-- -----------------------------------------------------------
-- 31. checklist_templates
-- -----------------------------------------------------------
CREATE TABLE checklist_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type ENUM('onboarding','offboarding') NOT NULL,
  department_id INT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------
-- 32. checklist_items
-- -----------------------------------------------------------
CREATE TABLE checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  task_name VARCHAR(500) NOT NULL,
  assigned_to ENUM('it','hr','admin','manager') NOT NULL DEFAULT 'admin',
  order_index INT DEFAULT 0,
  is_required TINYINT(1) DEFAULT 1,
  days_offset INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- 33. employee_checklists
-- -----------------------------------------------------------
CREATE TABLE employee_checklists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  template_id INT NOT NULL,
  started_date DATE NOT NULL,
  status ENUM('in_progress','completed','cancelled') DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
);
CREATE INDEX idx_emp_checklists_employee ON employee_checklists(employee_id);

-- -----------------------------------------------------------
-- 34. employee_checklist_tasks
-- -----------------------------------------------------------
CREATE TABLE employee_checklist_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  checklist_id INT NOT NULL,
  item_id INT NOT NULL,
  assigned_to_employee_id INT DEFAULT NULL,
  status ENUM('pending','in_progress','completed') DEFAULT 'pending',
  completed_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  completed_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES employee_checklists(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
  FOREIGN KEY (completed_by) REFERENCES admin_users(id) ON DELETE SET NULL
);
CREATE INDEX idx_emp_checklist_tasks_checklist ON employee_checklist_tasks(checklist_id);

-- -----------------------------------------------------------
-- 35. salary_components
-- -----------------------------------------------------------
CREATE TABLE salary_components (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  component_name VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX idx_sc_employee ON salary_components(employee_id);

-- -----------------------------------------------------------
-- 36. hr_permissions
-- -----------------------------------------------------------
CREATE TABLE hr_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  granted_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES employees(id) ON DELETE SET NULL,
  UNIQUE KEY unique_emp_perm (employee_id, permission_key)
);
CREATE INDEX idx_hr_perms_employee ON hr_permissions(employee_id);

-- -----------------------------------------------------------
-- 37. recruitment_jobs
-- -----------------------------------------------------------
CREATE TABLE recruitment_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  position_id INT DEFAULT NULL,
  title_id INT DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  department VARCHAR(255) DEFAULT '',
  type VARCHAR(50) DEFAULT 'Full-Time',
  technical TINYINT(1) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  description TEXT,
  key_responsibilities TEXT,
  qualifications TEXT,
  technical_skills TEXT,
  core_competencies TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_rec_jobs_status ON recruitment_jobs(status);
CREATE INDEX idx_rec_jobs_created ON recruitment_jobs(created_at);

-- -----------------------------------------------------------
-- 38. recruitment_candidates
-- -----------------------------------------------------------
CREATE TABLE recruitment_candidates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  job_id INT DEFAULT NULL,
  job_title VARCHAR(255) DEFAULT '',
  stage VARCHAR(50) DEFAULT 'applied',
  technical TINYINT(1) DEFAULT 0,
  notes TEXT,
  days INT DEFAULT 0,
  cv_filename VARCHAR(255) DEFAULT NULL,
  cv_path VARCHAR(500) DEFAULT NULL,
  score_comm INT DEFAULT 0,
  score_tech INT DEFAULT 0,
  score_fit INT DEFAULT 0,
  test_done TINYINT(1) DEFAULT 0,
  source VARCHAR(100) DEFAULT 'Portal',
  education_level VARCHAR(50) DEFAULT NULL,
  experience_years VARCHAR(10) DEFAULT NULL,
  skills JSON DEFAULT NULL,
  certifications JSON DEFAULT NULL,
  current_salary DECIMAL(12,2) DEFAULT NULL,
  expected_salary DECIMAL(12,2) DEFAULT NULL,
  nationality VARCHAR(100) DEFAULT NULL,
  birth_date DATE DEFAULT NULL,
  national_id VARCHAR(50) DEFAULT NULL,
  current_job_title VARCHAR(255) DEFAULT NULL,
  last_work_place VARCHAR(255) DEFAULT NULL,
  reason_leaving TEXT DEFAULT NULL,
  governorate VARCHAR(100) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  district VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE INDEX idx_rec_cand_stage ON recruitment_candidates(stage);
CREATE INDEX idx_rec_cand_email ON recruitment_candidates(email);
CREATE INDEX idx_rec_cand_job_id ON recruitment_candidates(job_id);
CREATE INDEX idx_rec_cand_created ON recruitment_candidates(created_at);

-- -----------------------------------------------------------
-- 39. recruitment_history
-- -----------------------------------------------------------
CREATE TABLE recruitment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  stage VARCHAR(50) DEFAULT NULL,
  note TEXT,
  created_by VARCHAR(255) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
);
CREATE INDEX idx_rec_hist_candidate ON recruitment_history(candidate_id);
CREATE INDEX idx_rec_hist_created ON recruitment_history(created_at);

-- -----------------------------------------------------------
-- 40. recruitment_scorecards
-- -----------------------------------------------------------
CREATE TABLE recruitment_scorecards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  interview VARCHAR(100) DEFAULT NULL,
  interviewer VARCHAR(255) DEFAULT NULL,
  comm INT DEFAULT 0,
  technical INT DEFAULT 0,
  fit INT DEFAULT 0,
  overall INT DEFAULT 0,
  notes TEXT,
  decision VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
);
CREATE INDEX idx_rec_sc_candidate ON recruitment_scorecards(candidate_id);

-- -----------------------------------------------------------
-- 41. recruitment_offers
-- -----------------------------------------------------------
CREATE TABLE recruitment_offers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  position VARCHAR(255) DEFAULT '',
  department VARCHAR(255) DEFAULT '',
  salary VARCHAR(100) DEFAULT '',
  start_date VARCHAR(50) DEFAULT '',
  reports_to VARCHAR(255) DEFAULT '',
  benefits TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
);
CREATE INDEX idx_rec_offers_candidate ON recruitment_offers(candidate_id);

-- -----------------------------------------------------------
-- 42. recruitment_interviews
-- -----------------------------------------------------------
CREATE TABLE recruitment_interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  interview_date DATETIME NOT NULL,
  duration INT DEFAULT 60,
  mode VARCHAR(50) DEFAULT 'video',
  interviewer VARCHAR(255) DEFAULT '',
  location_or_link VARCHAR(500) DEFAULT '',
  status VARCHAR(50) DEFAULT 'scheduled',
  type ENUM('online','offline') NOT NULL DEFAULT 'online',
  location_name VARCHAR(255) DEFAULT '',
  location_address TEXT,
  dress_code VARCHAR(100) DEFAULT '',
  what_to_bring TEXT,
  map_link VARCHAR(500) DEFAULT '',
  meeting_platform VARCHAR(50) DEFAULT '',
  meeting_link VARCHAR(500) DEFAULT '',
  candidate_status ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- 43. grades
-- -----------------------------------------------------------
CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grade_level INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  min_salary DECIMAL(12,2) DEFAULT NULL,
  max_salary DECIMAL(12,2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------
-- 44. grade_benefits
-- -----------------------------------------------------------
CREATE TABLE grade_benefits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  grade_id INT NOT NULL,
  benefit_key VARCHAR(100) NOT NULL,
  benefit_value TEXT,
  FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
  UNIQUE KEY uq_grade_benefit (grade_id, benefit_key)
);

-- -----------------------------------------------------------
-- 45. department_titles
-- -----------------------------------------------------------
CREATE TABLE department_titles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  grade_id INT DEFAULT NULL,
  description TEXT,
  job_summary TEXT,
  key_responsibilities TEXT,
  qualifications TEXT,
  technical_skills TEXT,
  core_competencies TEXT,
  technical TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL
);
CREATE INDEX idx_dept_title_department ON department_titles(department_id);
CREATE INDEX idx_dept_title_grade ON department_titles(grade_id);

-- -----------------------------------------------------------
-- 46. title_evaluation_criteria
-- -----------------------------------------------------------
CREATE TABLE title_evaluation_criteria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title_id INT NOT NULL,
  criterion_name VARCHAR(255) NOT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------
-- 47. headcount_requests
-- -----------------------------------------------------------
CREATE TABLE headcount_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  department_id INT NOT NULL,
  title_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  job_type ENUM('Full-Time','Part-Time','Contract','Internship') DEFAULT 'Full-Time',
  reason TEXT,
  priority ENUM('normal','urgent') DEFAULT 'normal',
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT DEFAULT NULL,
  reviewed_at DATETIME DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------
-- 48. tasks
-- -----------------------------------------------------------
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT DEFAULT NULL,
  assigned_by INT NOT NULL,
  assigned_to INT NOT NULL,
  status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  priority ENUM('low','medium','high') DEFAULT 'medium',
  due_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_by) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE CASCADE
);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);

-- -----------------------------------------------------------
-- FOREIGN KEYS for employees (after all tables exist)
-- -----------------------------------------------------------
ALTER TABLE employees ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE employees ADD FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;
ALTER TABLE employees ADD FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE SET NULL;
ALTER TABLE employees ADD FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL;

-- -----------------------------------------------------------
-- RECRUITMENT JOBS FKs
-- -----------------------------------------------------------
ALTER TABLE recruitment_jobs ADD FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL;
ALTER TABLE recruitment_jobs ADD FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE SET NULL;

-- -----------------------------------------------------------
-- LEAVE REQUESTS reviewed_by_manager FK
-- -----------------------------------------------------------
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_reviewed_by_manager FOREIGN KEY (reviewed_by_manager_id) REFERENCES employees(id) ON DELETE SET NULL;
CREATE INDEX idx_leave_reviewed_by_mgr ON leave_requests(reviewed_by_manager_id);

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default admin employee
INSERT IGNORE INTO employees (employee_id, email, name, role, is_system) VALUES (0, 'system@worktrack.local', 'System', 'admin', 1);

-- Default departments
INSERT INTO departments (name, manager_email) VALUES
  ('IT', ''),
  ('HR', ''),
  ('Finance', ''),
  ('Operations', '')
ON DUPLICATE KEY UPDATE name=name;

-- Default leave types
INSERT IGNORE INTO leave_types (name, label, default_balance, routed_to) VALUES
  ('annual', 'Annual', 21, 'manager'),
  ('sick', 'Sick', 14, 'admin'),
  ('casual', 'Casual', 7, 'manager'),
  ('personal', 'Personal', NULL, 'admin'),
  ('unpaid', 'Unpaid', NULL, 'admin');

-- Default grades
INSERT IGNORE INTO grades (grade_level, name, description, min_salary, max_salary) VALUES
  (1,  'Intern 1',       'Entry-level intern', 2000, 3500),
  (2,  'Intern 2',       'Senior intern', 3500, 5000),
  (3,  'Junior 1',       'Junior entry', 5000, 7000),
  (4,  'Junior 2',       'Junior mid', 7000, 9000),
  (5,  'Senior 1',       'Senior entry', 9000, 12000),
  (6,  'Senior 2',       'Senior mid', 12000, 15000),
  (7,  'Supervisor 1',   'Supervisor entry', 15000, 18000),
  (8,  'Supervisor 2',   'Supervisor senior', 18000, 22000),
  (9,  'Manager 1',      'Manager entry', 22000, 28000),
  (10, 'Manager 2',      'Manager senior', 28000, 35000),
  (11, 'Section Head',   'Section head / Director', 35000, 50000),
  (12, 'C-Level',        'Executive / C-Level', 50000, 100000);

-- Default settings
INSERT IGNORE INTO settings (`key`, `value`) VALUES
  ('smtp_host', ''),
  ('smtp_port', '587'),
  ('smtp_user', ''),
  ('smtp_pass', ''),
  ('smtp_from', ''),
  ('office_lat', '30.0444'),
  ('office_lng', '31.2357'),
  ('office_radius_meters', '200'),
  ('work_week_start', 'Sunday'),
  ('work_week_end', 'Thursday'),
  ('period_start_day', '15'),
  ('period_end_day', '16'),
  ('logo_data', ''),
  ('allowed_email_domain', ''),
  ('service_wfh', '1'),
  ('service_office_attendance', '1'),
  ('service_leaves', '1'),
  ('service_recruitment', '1'),
  ('service_people', '1'),
  ('service_manager', '1'),
  ('c_level_emails', ''),
  ('ceo_email', ''),
  ('company_name', ''),
  ('company_address', ''),
  ('company_representative', ''),
  ('company_representative_title', ''),
  ('company_phone', ''),
  ('company_fax', ''),
  ('company_commercial_register', ''),
  ('company_tax_card', '');

-- Default department titles (for each department)
INSERT IGNORE INTO department_titles (department_id, title, grade_id, description, technical, sort_order)
SELECT d.id, t.title, g.id, '', t.technical, t.sort_order
FROM departments d
CROSS JOIN (
  SELECT 'Intern' AS title, 1 AS sort_order, 0 AS technical, 1 AS grade_level
  UNION SELECT 'Junior', 2, 0, 3
  UNION SELECT 'Senior', 3, 0, 5
  UNION SELECT 'Supervisor', 4, 0, 7
  UNION SELECT 'Manager', 5, 0, 9
  UNION SELECT 'SectionHead', 6, 0, 11
  UNION SELECT 'C-Level', 7, 0, 12
) t
JOIN grades g ON g.grade_level = t.grade_level
WHERE NOT EXISTS (
  SELECT 1 FROM department_titles dt
  WHERE dt.department_id = d.id AND dt.title = t.title
);

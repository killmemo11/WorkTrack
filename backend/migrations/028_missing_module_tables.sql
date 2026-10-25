-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

-- Migration 028: repair tables that were referenced by application code but
-- were never created by a migration or by full_schema.sql.
--
-- The 024 schema snapshot predates 010/011 and the recruitment workflow
-- modules. Databases created from that snapshot were baselined at 024, so
-- 010/011 were marked applied without ever running. As a result HR goals,
-- phone screening, interview scheduling, message templates, workflow
-- automation, manager availability, screening results and performance
-- metrics all failed at runtime.
--
-- Idempotent: every object is guarded with IF NOT EXISTS or an
-- information_schema check.

-- ── Employee goals (010) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  icon VARCHAR(100) DEFAULT 'lucide:target',
  color VARCHAR(50) DEFAULT '#818cf8',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Phone screening (011 + tenant ownership) ───────────────────
CREATE TABLE IF NOT EXISTS phone_screening_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pst_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Older deployments may have the 011 table without tenant ownership.
SET @t = (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='phone_screening_templates');
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='phone_screening_templates' AND COLUMN_NAME='tenant_id');
SET @sql = IF(@t=1 AND @c=0, 'ALTER TABLE phone_screening_templates ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id, ADD INDEX idx_pst_tenant (tenant_id), ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS phone_screening_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  question TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  max_rating INT NOT NULL DEFAULT 5,
  category ENUM('communication','technical','experience','culture','general') NOT NULL DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_psq_template (template_id),
  FOREIGN KEY (template_id) REFERENCES phone_screening_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS phone_screening_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  evaluated_by VARCHAR(255) NOT NULL DEFAULT '',
  total_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  decision ENUM('pass','fail') NOT NULL DEFAULT 'fail',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pse_candidate (candidate_id),
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES phone_screening_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS phone_screening_evaluation_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT NOT NULL,
  question_id INT NOT NULL,
  rating INT NOT NULL DEFAULT 0,
  notes TEXT,
  KEY idx_psea_evaluation (evaluation_id),
  FOREIGN KEY (evaluation_id) REFERENCES phone_screening_evaluations(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES phone_screening_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS phone_screening_call_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  attempted_by VARCHAR(255) NOT NULL DEFAULT '',
  attempted_at DATETIME NOT NULL,
  outcome ENUM('no_answer','reached','wrong_number','busy','voicemail') NOT NULL DEFAULT 'no_answer',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pscl_candidate (candidate_id),
  KEY idx_pscl_attempted (attempted_at),
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tenant 1 is the template source copied to every new tenant by the
-- platform provisioning flow.
INSERT INTO phone_screening_templates (tenant_id, name, description, is_default, is_active)
SELECT 1, 'General Phone Screening',
       'Default phone screening questionnaire covering communication, experience, technical skills, and culture fit.',
       1, 1
WHERE NOT EXISTS (
  SELECT 1 FROM phone_screening_templates WHERE tenant_id = 1 AND is_default = 1
);

SET @pst_id = (SELECT id FROM phone_screening_templates WHERE tenant_id = 1 AND is_default = 1 ORDER BY id LIMIT 1);

INSERT INTO phone_screening_questions (template_id, question, weight, max_rating, category, sort_order)
SELECT @pst_id, q.question, q.weight, q.max_rating, q.category, q.sort_order
FROM (
  SELECT 'How would you rate the candidate''s communication skills?' AS question, 1.50 AS weight, 5 AS max_rating, 'communication' AS category, 1 AS sort_order
  UNION ALL SELECT 'How relevant is the candidate''s experience to this role?', 1.50, 5, 'experience', 2
  UNION ALL SELECT 'How would you rate the candidate''s technical knowledge?', 2.00, 5, 'technical', 3
  UNION ALL SELECT 'How well does the candidate fit the company culture?', 1.00, 5, 'culture', 4
  UNION ALL SELECT 'How clear is the candidate about their career goals?', 1.00, 5, 'general', 5
) q
WHERE @pst_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM phone_screening_questions WHERE template_id = @pst_id);

-- ── Message templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  subject VARCHAR(500) DEFAULT NULL,
  body_template LONGTEXT NOT NULL,
  placeholders LONGTEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_system TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_message_templates_tenant_key (tenant_id, template_key),
  KEY idx_message_templates_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Recruitment workflow ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_wft_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  template_id INT NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  stage_key VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  stage_type VARCHAR(50) NOT NULL DEFAULT 'interview',
  responsible_role VARCHAR(50) DEFAULT NULL,
  requires_confirmation TINYINT(1) NOT NULL DEFAULT 1,
  requires_attendance TINYINT(1) NOT NULL DEFAULT 1,
  requires_evaluation TINYINT(1) NOT NULL DEFAULT 1,
  is_optional TINYINT(1) NOT NULL DEFAULT 0,
  allow_skip TINYINT(1) NOT NULL DEFAULT 0,
  auto_advance TINYINT(1) NOT NULL DEFAULT 0,
  form_config LONGTEXT DEFAULT NULL,
  sla_duration INT DEFAULT NULL,
  sla_reminder_after INT DEFAULT NULL,
  sla_escalation_after INT DEFAULT NULL,
  sla_max_delay INT DEFAULT NULL,
  message_template_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_wfs_tenant (tenant_id),
  KEY idx_wfs_template (template_id, stage_order),
  FOREIGN KEY (template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (message_template_id) REFERENCES message_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  workflow_template_id INT NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  trigger_event VARCHAR(100) NOT NULL,
  condition_field VARCHAR(255) NOT NULL DEFAULT 'always',
  condition_operator VARCHAR(50) NOT NULL DEFAULT '==',
  condition_value VARCHAR(500) NOT NULL DEFAULT '',
  action_type VARCHAR(100) NOT NULL,
  action_params LONGTEXT DEFAULT NULL,
  priority INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_wfr_tenant (tenant_id),
  KEY idx_wfr_template (workflow_template_id, priority),
  KEY idx_wfr_trigger (tenant_id, trigger_event, is_active),
  FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workflow_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data LONGTEXT DEFAULT NULL,
  workflow_stage_id INT DEFAULT NULL,
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_we_candidate (candidate_id, created_at),
  KEY idx_we_type (event_type),
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_stage_id) REFERENCES workflow_stages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_workflow_state (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  workflow_template_id INT DEFAULT NULL,
  template_version INT NOT NULL DEFAULT 1,
  current_stage_id INT DEFAULT NULL,
  stage_entered_at DATETIME DEFAULT NULL,
  previous_stage_id INT DEFAULT NULL,
  previous_stage_exited_at DATETIME DEFAULT NULL,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cws_candidate (candidate_id),
  KEY idx_cws_template (workflow_template_id),
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE SET NULL,
  FOREIGN KEY (current_stage_id) REFERENCES workflow_stages(id) ON DELETE SET NULL,
  FOREIGN KEY (previous_stage_id) REFERENCES workflow_stages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- workflow_template_id is selected by candidate creation and job screens.
SET @c = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_jobs' AND COLUMN_NAME='workflow_template_id');
SET @sql = IF(@c=0, 'ALTER TABLE recruitment_jobs ADD COLUMN workflow_template_id INT DEFAULT NULL, ADD INDEX idx_rj_workflow_template (workflow_template_id), ADD FOREIGN KEY (workflow_template_id) REFERENCES workflow_templates(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Manager availability ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS manager_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  slot_type ENUM('weekly','blocked') NOT NULL,
  day_of_week TINYINT DEFAULT NULL,
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  blocked_date DATE DEFAULT NULL,
  reason VARCHAR(255) DEFAULT '',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_mgr_avail_weekly (employee_id, slot_type, day_of_week),
  UNIQUE KEY uq_mgr_avail_blocked (employee_id, slot_type, blocked_date),
  KEY idx_mgr_avail_employee (employee_id, slot_type, is_active),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Interview scheduling ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  candidate_id INT NOT NULL,
  workflow_stage_id INT DEFAULT NULL,
  interview_date DATETIME NOT NULL,
  duration INT NOT NULL DEFAULT 60,
  mode VARCHAR(50) NOT NULL DEFAULT 'video',
  interviewer VARCHAR(255) NOT NULL DEFAULT '',
  location_or_link VARCHAR(500) NOT NULL DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  type ENUM('online','offline') NOT NULL DEFAULT 'online',
  location_name VARCHAR(255) NOT NULL DEFAULT '',
  location_address TEXT,
  dress_code VARCHAR(100) NOT NULL DEFAULT '',
  what_to_bring TEXT,
  map_link VARCHAR(500) NOT NULL DEFAULT '',
  meeting_platform VARCHAR(50) NOT NULL DEFAULT '',
  meeting_link VARCHAR(500) NOT NULL DEFAULT '',
  candidate_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  attendance VARCHAR(50) NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ist_tenant_date (tenant_id, interview_date),
  KEY idx_ist_candidate (candidate_id),
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (workflow_stage_id) REFERENCES workflow_stages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS interview_evaluations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  interview_stage_id INT NOT NULL,
  candidate_id INT NOT NULL,
  evaluated_by VARCHAR(255) NOT NULL DEFAULT '',
  evaluated_by_id INT DEFAULT NULL,
  decision VARCHAR(50) NOT NULL DEFAULT 'hold',
  communication_score INT NOT NULL DEFAULT 0,
  technical_score INT NOT NULL DEFAULT 0,
  cultural_fit_score INT NOT NULL DEFAULT 0,
  overall_score INT NOT NULL DEFAULT 0,
  form_responses LONGTEXT DEFAULT NULL,
  notes TEXT,
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ie_stage (interview_stage_id),
  KEY idx_ie_candidate (candidate_id),
  FOREIGN KEY (interview_stage_id) REFERENCES interview_stages(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Performance and screening results ─────────────────────────
CREATE TABLE IF NOT EXISTS performance_reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  employee_id INT DEFAULT NULL,
  reviewer_id INT DEFAULT NULL,
  period VARCHAR(50) DEFAULT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  overall_score DECIMAL(5,2) DEFAULT NULL,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pr_tenant_status (tenant_id, status),
  KEY idx_pr_employee (employee_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS screening_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  title_id INT DEFAULT NULL,
  job_id INT DEFAULT NULL,
  status VARCHAR(50) DEFAULT NULL,
  overall_status VARCHAR(50) DEFAULT NULL,
  requirements_met INT NOT NULL DEFAULT 0,
  requirements_total INT NOT NULL DEFAULT 0,
  details LONGTEXT DEFAULT NULL,
  requirement_results LONGTEXT DEFAULT NULL,
  automated TINYINT(1) NOT NULL DEFAULT 1,
  most_recommended_count INT NOT NULL DEFAULT 0,
  superstar TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sr_candidate (candidate_id, created_at),
  KEY idx_sr_job (job_id),
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE SET NULL,
  FOREIGN KEY (job_id) REFERENCES recruitment_jobs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

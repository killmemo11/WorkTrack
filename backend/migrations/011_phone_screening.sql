-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

CREATE TABLE IF NOT EXISTS phone_screening_call_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidate_id INT NOT NULL,
  attempted_by VARCHAR(255) NOT NULL DEFAULT '',
  attempted_at DATETIME NOT NULL,
  outcome ENUM('no_answer','reached','wrong_number','busy','voicemail') NOT NULL DEFAULT 'no_answer',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pscl_candidate ON phone_screening_call_log(candidate_id);
CREATE INDEX idx_pscl_attempted ON phone_screening_call_log(attempted_at);

CREATE TABLE IF NOT EXISTS phone_screening_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS phone_screening_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  question TEXT NOT NULL,
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  max_rating INT NOT NULL DEFAULT 5,
  category ENUM('communication','technical','experience','culture','general') NOT NULL DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES phone_screening_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_psq_template ON phone_screening_questions(template_id);

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
  FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES phone_screening_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pse_candidate ON phone_screening_evaluations(candidate_id);

CREATE TABLE IF NOT EXISTS phone_screening_evaluation_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id INT NOT NULL,
  question_id INT NOT NULL,
  rating INT NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (evaluation_id) REFERENCES phone_screening_evaluations(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES phone_screening_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_psea_evaluation ON phone_screening_evaluation_answers(evaluation_id);

-- Default template
INSERT INTO phone_screening_templates (name, description, is_default, is_active) VALUES
('General Phone Screening', 'Default phone screening questionnaire covering communication, experience, technical skills, and culture fit.', 1, 1);

SET @tmpl_id = LAST_INSERT_ID();

INSERT INTO phone_screening_questions (template_id, question, weight, max_rating, category, sort_order) VALUES
(@tmpl_id, 'How would you rate the candidate''s communication skills?', 1.50, 5, 'communication', 1),
(@tmpl_id, 'How relevant is the candidate''s experience to this role?', 1.50, 5, 'experience', 2),
(@tmpl_id, 'How would you rate the candidate''s technical knowledge?', 2.00, 5, 'technical', 3),
(@tmpl_id, 'How well does the candidate fit the company culture?', 1.00, 5, 'culture', 4),
(@tmpl_id, 'How clear is the candidate about their career goals?', 1.00, 5, 'general', 5);

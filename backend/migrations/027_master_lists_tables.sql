-- Copyright (c) 2026 Mohamed Yehia
-- SPDX-License-Identifier: AGPL-3.0

-- Migration 027: create the master skill and certification catalogs.
-- 009 only seeded these tables; no migration ever created them, so every
-- fresh install or snapshot-imported database returned 500 from
-- /api/hr/master-skills and /api/hr/master-certifications.
--
-- The catalog is shared across tenants: every tenant reads the same rows,
-- while tenant_id records which workspace created a custom row so that only
-- the owner may rename or delete it. Seeded rows belong to the default tenant.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS master_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tenant_id INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_master_skills_name (name),
  KEY idx_ms_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS master_certifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  tenant_id INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_master_certifications_name (name),
  KEY idx_mc_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO master_skills (name) VALUES
('Communication'),
('Leadership'),
('Problem Solving'),
('Teamwork'),
('Time Management'),
('Project Management'),
('Critical Thinking'),
('Decision Making'),
('Adaptability'),
('Creativity'),
('Attention to Detail'),
('Organizational Skills'),
('Negotiation'),
('Conflict Resolution'),
('Customer Service'),
('Presentation Skills'),
('Public Speaking'),
('Research'),
('Writing'),
('Data Analysis'),
('Microsoft Excel'),
('Microsoft PowerPoint'),
('Microsoft Word'),
('Microsoft Office'),
('Python'),
('JavaScript'),
('Java'),
('SQL'),
('HTML'),
('CSS'),
('React'),
('Node.js'),
('Agile/Scrum'),
('SAP'),
('AutoCAD'),
('Photoshop'),
('Salesforce'),
('Power BI'),
('Tableau'),
('Digital Marketing'),
('SEO'),
('Graphic Design'),
('Financial Analysis'),
('Accounting'),
('Supply Chain Management'),
('Quality Control'),
('Six Sigma'),
('Risk Management'),
('Strategic Planning'),
('Sales'),
('English'),
('French'),
('German');

INSERT IGNORE INTO master_certifications (name) VALUES
('PMP – Project Management Professional'),
('CFA – Chartered Financial Analyst'),
('CMA – Certified Management Accountant'),
('CPA – Certified Public Accountant'),
('ACCA'),
('SHRM-CP'),
('SHRM-SCP'),
('PHR – Professional in Human Resources'),
('SPHR – Senior Professional in Human Resources'),
('Six Sigma Green Belt'),
('Six Sigma Black Belt'),
('CISSP – Certified Information Systems Security Professional'),
('CISM – Certified Information Security Manager'),
('CEH – Certified Ethical Hacker'),
('CompTIA A+'),
('CompTIA Network+'),
('CompTIA Security+'),
('AWS Certified Solutions Architect'),
('Google Cloud Professional'),
('Microsoft Azure Administrator'),
('MCSE'),
('CCNA'),
('ITIL Foundation'),
('PRINCE2'),
('Certified Scrum Master'),
('SAFe Agilist'),
('Google Analytics Certification'),
('HubSpot Certification'),
('TOEFL'),
('IELTS'),
('CIA – Certified Internal Auditor'),
('CISA – Certified Information Systems Auditor'),
('CRISC – Certified in Risk and Information Systems Control'),
('LEED Green Associate'),
('OSHA 30-Hour Training'),
('ISO 9001 Lead Auditor'),
('Oracle Certified Professional'),
('Microsoft Office Specialist (MOS)');

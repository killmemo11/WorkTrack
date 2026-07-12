-- Email verification codes for tenant signup
-- Stores temporary 6-digit codes for company email verification

CREATE TABLE IF NOT EXISTS email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose ENUM('tenant_signup','other') NOT NULL DEFAULT 'tenant_signup',
  expires_at DATETIME NOT NULL,
  attempts INT DEFAULT 0,
  verified TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ev_email_purpose (email, purpose),
  INDEX idx_ev_expires (expires_at)
);

-- Add new columns to tenant_requests for richer company data
ALTER TABLE tenant_requests
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100) NULL AFTER contact_phone,
  ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL AFTER industry,
  ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255) NULL AFTER website,
  ADD COLUMN IF NOT EXISTS contact_person_title VARCHAR(100) NULL AFTER contact_person_name;

-- Add new columns to tenant_signups (public audit log)
ALTER TABLE tenant_signups
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100) NULL AFTER contact_phone,
  ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL AFTER industry,
  ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255) NULL AFTER website,
  ADD COLUMN IF NOT EXISTS contact_person_title VARCHAR(100) NULL AFTER contact_person_name;

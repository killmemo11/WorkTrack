-- Phase 4: release channels + feature flags
-- Tenants move through channels (stable -> beta -> canary) and individual
-- features can be switched per tenant without a deploy. Flags are evaluated
-- server-side; the frontend only receives the resolved values.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS release_channel VARCHAR(20) NOT NULL DEFAULT 'stable';

CREATE TABLE IF NOT EXISTS feature_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flag_key VARCHAR(120) NOT NULL,
  label VARCHAR(200) NOT NULL,
  description TEXT NULL,
  module VARCHAR(50) NOT NULL DEFAULT 'general',
  default_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_feature_flag_key (flag_key),
  INDEX idx_feature_flag_module (module)
);

CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  tenant_id INT NOT NULL,
  flag_key VARCHAR(120) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_by INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, flag_key),
  INDEX idx_tff_flag (flag_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (flag_key) REFERENCES feature_flags(flag_key) ON DELETE CASCADE,
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO feature_flags (flag_key, label, description, module, default_enabled) VALUES
('billing.reminders', 'Automated invoice reminders', 'Send due-date reminders for unpaid invoices', 'billing', 1),
('billing.online_gateway', 'Online payment gateway', 'Offer card payments at checkout (gateway integration)', 'billing', 0),
('crm.followup_reminders', 'CRM follow-up reminders', 'Surface overdue follow-ups on the marketing dashboard', 'crm', 1);

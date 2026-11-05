-- Phase 2: marketing console
-- 1. Plan price history so a price change does not silently reprice live tenants.
-- 2. An explicit subscription price snapshot per tenant (grandfathering).
-- 3. A light CRM: account + owner contact data only (no employee PII).
--
-- Rollout safety: every existing plan gets a version 1 equal to its current price
-- and every tenant is pinned to its plan's version 1, so nothing is repriced by
-- applying this migration.

CREATE TABLE IF NOT EXISTS plan_price_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  version INT NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
  note VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_plan_price_version (plan_id, version),
  INDEX idx_ppv_plan (plan_id),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

INSERT INTO plan_price_versions (plan_id, version, price_monthly, price_yearly, currency, note)
SELECT sp.id, 1, sp.price_monthly, sp.price_yearly, COALESCE(sp.currency, 'EGP'), 'Initial price at migration 034'
FROM subscription_plans sp
LEFT JOIN plan_price_versions v ON v.plan_id = sp.id AND v.version = 1
WHERE v.id IS NULL;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan_price_version_id INT NULL AFTER plan;

ALTER TABLE tenants
  ADD INDEX IF NOT EXISTS idx_tenant_plan_price_version (plan_price_version_id);

ALTER TABLE tenants
  ADD FOREIGN KEY IF NOT EXISTS fk_tenant_plan_price_version (plan_price_version_id)
    REFERENCES plan_price_versions(id) ON DELETE SET NULL;

UPDATE tenants t
JOIN subscription_plans sp ON sp.slug = t.plan
JOIN plan_price_versions v ON v.plan_id = sp.id AND v.version = 1
SET t.plan_price_version_id = v.id
WHERE t.plan_price_version_id IS NULL;

CREATE TABLE IF NOT EXISTS platform_crm_contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NULL,
  tenant_request_id INT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NULL,
  job_title VARCHAR(100) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  website VARCHAR(255) NULL,
  industry VARCHAR(100) NULL,
  employee_count INT NULL,
  plan_interest VARCHAR(50) NULL,
  stage ENUM('lead','contacted','qualified','proposal','won','lost') NOT NULL DEFAULT 'lead',
  source VARCHAR(50) NOT NULL DEFAULT 'signup',
  owner_admin_id INT NULL,
  next_follow_up_at DATETIME NULL,
  notes TEXT NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_crm_contact_email (email),
  INDEX idx_crm_stage (stage),
  INDEX idx_crm_owner (owner_admin_id),
  INDEX idx_crm_follow_up (next_follow_up_at),
  INDEX idx_crm_tenant (tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_request_id) REFERENCES tenant_requests(id) ON DELETE SET NULL,
  FOREIGN KEY (owner_admin_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS platform_crm_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_id INT NOT NULL,
  type ENUM('note','call','email','meeting','stage_change','follow_up') NOT NULL DEFAULT 'note',
  subject VARCHAR(255) NULL,
  body TEXT NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  admin_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crm_activity_contact (contact_id, occurred_at),
  FOREIGN KEY (contact_id) REFERENCES platform_crm_contacts(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

INSERT IGNORE INTO platform_permissions (perm_key, module, action, label, description) VALUES
('platform.crm.manage', 'crm', 'manage', 'Manage CRM data', 'Create and update CRM contacts, stages and activities');

INSERT IGNORE INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM platform_roles r JOIN platform_permissions p
  ON p.perm_key = 'platform.crm.manage'
WHERE r.name IN ('owner', 'marketing');

-- Backfill one contact per signup email, driven by that email's latest request.
INSERT INTO platform_crm_contacts
  (tenant_id, tenant_request_id, company_name, contact_name, job_title, email, phone,
   website, industry, employee_count, plan_interest, stage, source, created_at)
SELECT
  tr.created_tenant_id,
  tr.id,
  tr.company_name,
  tr.contact_person_name,
  tr.contact_person_title,
  LOWER(TRIM(tr.contact_email)),
  tr.contact_phone,
  tr.website,
  tr.industry,
  tr.employee_count,
  tr.requested_plan,
  CASE tr.status WHEN 'approved' THEN 'won' WHEN 'rejected' THEN 'lost' ELSE 'lead' END,
  'signup',
  tr.created_at
FROM tenant_requests tr
JOIN (
  SELECT LOWER(TRIM(contact_email)) AS email, MAX(id) AS id
  FROM tenant_requests
  GROUP BY LOWER(TRIM(contact_email))
) latest ON latest.id = tr.id
LEFT JOIN platform_crm_contacts c ON c.email = LOWER(TRIM(tr.contact_email))
WHERE c.id IS NULL;

-- Backfill tenants that were created manually (no signup request).
INSERT INTO platform_crm_contacts
  (tenant_id, company_name, email, phone, stage, source, notes, created_at)
SELECT
  t.id,
  t.name,
  LOWER(TRIM(t.contact_email)),
  t.contact_phone,
  'won',
  'manual',
  'Tenant created directly by the platform team',
  t.created_at
FROM tenants t
LEFT JOIN platform_crm_contacts c ON c.email = LOWER(TRIM(t.contact_email))
WHERE t.deleted_at IS NULL AND c.id IS NULL;

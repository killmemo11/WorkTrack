-- Platform RBAC
-- The tenant RBAC tables (roles/permissions/user_roles) are bound to tenant_id,
-- so platform staff get an isolated permission model instead of the single
-- admin_users.is_platform_admin flag.
--
-- Rollout safety: every existing platform admin is granted the `owner` role, so
-- behaviour is unchanged until a narrower role is assigned explicitly.

CREATE TABLE IF NOT EXISTS platform_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  perm_key VARCHAR(120) NOT NULL,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  label VARCHAR(200) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_platform_perm_key (perm_key),
  INDEX idx_platform_perm_module (module)
);

CREATE TABLE IF NOT EXISTS platform_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  is_system TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_platform_role_name (name)
);

CREATE TABLE IF NOT EXISTS platform_role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INT NULL,
  PRIMARY KEY (role_id, permission_id),
  INDEX idx_platform_rp_permission (permission_id),
  FOREIGN KEY (role_id) REFERENCES platform_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES platform_permissions(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS platform_user_roles (
  admin_user_id INT NOT NULL,
  role_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INT NULL,
  PRIMARY KEY (admin_user_id, role_id),
  INDEX idx_platform_ur_role (role_id),
  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES platform_roles(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Permissions, grouped by the console that consumes them.
INSERT IGNORE INTO platform_permissions (perm_key, module, action, label, description) VALUES
('platform.tenants.view',      'tenants',  'view',            'View tenants',              'List and inspect tenant accounts'),
('platform.tenants.create',    'tenants',  'create',          'Create tenants',            'Provision a new tenant workspace'),
('platform.tenants.update',    'tenants',  'update',          'Update tenants',            'Edit tenant details and client accounts'),
('platform.tenants.activate',  'tenants',  'activate',        'Activate tenants',          'Activate or resume a tenant after payment'),
('platform.tenants.suspend',   'tenants',  'suspend',         'Suspend tenants',           'Suspend a tenant workspace'),
('platform.tenants.delete',    'tenants',  'delete',          'Delete tenants',            'Soft-delete a tenant workspace'),
('platform.requests.view',     'requests', 'view',            'View signup requests',      'View incoming tenant requests'),
('platform.requests.manage',   'requests', 'manage',          'Manage signup requests',    'Approve or reject tenant requests'),
('platform.plans.view',        'plans',    'view',            'View plans',                'View subscription plans'),
('platform.plans.manage',      'plans',    'manage',          'Manage plans',              'Create, edit and delete plans'),
('platform.plans.manage_price','plans',    'manage_price',    'Manage plan prices',        'Change plan pricing'),
('platform.payments.view',     'payments', 'view',            'View payments',             'View payment records and revenue'),
('platform.payments.verify',   'payments', 'verify',          'Verify payments',           'Verify or reject payment proofs'),
('platform.crm.view',          'crm',      'view',            'View CRM data',             'View account and owner contact data only'),
('platform.admins.manage',     'admins',   'manage',          'Manage platform admins',    'Create and manage platform staff accounts'),
('platform.support.view',      'support',  'view',            'View support data',         'View tenant diagnostics'),
('platform.support.remediate', 'support',  'remediate',       'Remediate tenant issues',   'Resend links, reset passwords, re-run jobs'),
('platform.support.impersonate','support', 'impersonate',     'Impersonate users',         'Open an audited session as a tenant user'),
('platform.releases.view',     'releases', 'view',            'View releases',             'View release channels and feature flags'),
('platform.releases.manage',   'releases', 'manage',          'Manage releases',           'Assign channels and toggle feature flags'),
('platform.sandbox.manage',    'sandbox',  'manage',          'Manage sandboxes',          'Create and reset sandbox tenants'),
('platform.audit.view',        'audit',    'view',            'View platform audit',       'View platform activity log'),
('platform.settings.manage',   'settings', 'manage',          'Manage platform settings',  'Edit platform-wide settings');

INSERT IGNORE INTO platform_roles (name, display_name, description) VALUES
('owner',     'Owner',               'Full platform access'),
('marketing', 'Marketing',           'Customers, requests, plans, payments and CRM'),
('tech',      'Technical Support',   'Tenant diagnostics, impersonation and remediation'),
('dev',       'Developer',           'Release channels, feature flags and sandboxes');

-- owner: every permission
INSERT IGNORE INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM platform_roles r CROSS JOIN platform_permissions p
WHERE r.name = 'owner';

-- marketing: sales/CRM surface only, no tenant suspend/delete and no admin management
INSERT IGNORE INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM platform_roles r JOIN platform_permissions p
  ON p.perm_key IN (
    'platform.tenants.view',
    'platform.tenants.create',
    'platform.tenants.activate',
    'platform.requests.view',
    'platform.requests.manage',
    'platform.plans.view',
    'platform.plans.manage',
    'platform.plans.manage_price',
    'platform.payments.view',
    'platform.payments.verify',
    'platform.crm.view'
  )
WHERE r.name = 'marketing';

-- tech: diagnose and fix, never billing or lifecycle
INSERT IGNORE INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM platform_roles r JOIN platform_permissions p
  ON p.perm_key IN (
    'platform.tenants.view',
    'platform.support.view',
    'platform.support.remediate',
    'platform.support.impersonate',
    'platform.audit.view'
  )
WHERE r.name = 'tech';

-- dev: release control and sandboxes
INSERT IGNORE INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM platform_roles r JOIN platform_permissions p
  ON p.perm_key IN (
    'platform.tenants.view',
    'platform.releases.view',
    'platform.releases.manage',
    'platform.sandbox.manage',
    'platform.audit.view'
  )
WHERE r.name = 'dev';

-- Preserve current behaviour: existing platform admins become owners.
INSERT IGNORE INTO platform_user_roles (admin_user_id, role_id)
SELECT au.id, r.id FROM admin_users au CROSS JOIN platform_roles r
WHERE au.is_platform_admin = 1 AND r.name = 'owner';

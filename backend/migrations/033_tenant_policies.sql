-- Company policies per tenant (leave, penalties, privacy, other).
-- Rows are versions: editing a published policy creates a new draft row with the
-- next version number, so employees always read an immutable published document
-- and acknowledgement records point at the exact version they accepted.

CREATE TABLE IF NOT EXISTS tenant_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  policy_type ENUM('leave', 'penalties', 'privacy', 'other') NOT NULL,
  title VARCHAR(200) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  requires_ack TINYINT(1) NOT NULL DEFAULT 1,
  effective_at DATETIME NULL,
  published_at DATETIME NULL,
  created_by INT NULL,
  updated_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tenant_policy_version (tenant_id, policy_type, version),
  INDEX idx_tenant_policy_published (tenant_id, is_published, policy_type),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS policy_acknowledgements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  policy_id INT NOT NULL,
  policy_version INT NOT NULL,
  employee_id INT NOT NULL,
  accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  UNIQUE KEY uniq_policy_ack (policy_id, employee_id),
  INDEX idx_policy_ack_tenant (tenant_id, policy_id),
  INDEX idx_policy_ack_employee (tenant_id, employee_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (policy_id) REFERENCES tenant_policies(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permission for the tenant admin console. Granted to tenant_admin for every
-- existing tenant; seedTenantRBAC() covers tenants created after this migration.
INSERT IGNORE INTO permissions (module, action, label, description, is_system, tenant_id)
SELECT 'admin', 'manage_policies', 'Manage Company Policies',
       'Create, edit and publish company policies for employees', 1, t.id
FROM tenants t;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.tenant_id = r.tenant_id
WHERE r.name = 'tenant_admin'
  AND p.module = 'admin' AND p.action = 'manage_policies';

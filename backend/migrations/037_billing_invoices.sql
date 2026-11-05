-- Phase 6: manual invoicing and renewal reminders
-- Money is handled with invoices + bank transfer proof for now; an online
-- gateway stays behind the billing.online_gateway feature flag.

CREATE TABLE IF NOT EXISTS tenant_invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL,
  invoice_number VARCHAR(40) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  status ENUM('draft','sent','paid','void') NOT NULL DEFAULT 'draft',
  due_date DATE NOT NULL,
  issued_at DATETIME NULL,
  sent_at DATETIME NULL,
  paid_at DATETIME NULL,
  payment_method VARCHAR(50) NULL,
  reference VARCHAR(255) NULL,
  notes TEXT NULL,
  last_reminder_at DATETIME NULL,
  reminder_count INT NOT NULL DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_invoice_number (invoice_number),
  INDEX idx_invoice_tenant (tenant_id, status),
  INDEX idx_invoice_due (status, due_date),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_invoice_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  type ENUM('created','sent','reminder','paid','void') NOT NULL,
  notes TEXT NULL,
  admin_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invoice_event (invoice_id, created_at),
  FOREIGN KEY (invoice_id) REFERENCES tenant_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO platform_permissions (perm_key, module, action, label, description) VALUES
('platform.billing.view',   'billing', 'view',   'View invoices',   'View tenant invoices and outstanding balances'),
('platform.billing.manage', 'billing', 'manage', 'Manage invoices', 'Create invoices, record payments and send reminders');

INSERT IGNORE INTO platform_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM platform_roles r JOIN platform_permissions p
  ON p.perm_key IN ('platform.billing.view', 'platform.billing.manage')
WHERE r.name IN ('owner', 'marketing');

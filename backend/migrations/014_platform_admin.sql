-- Platform Admins Table
-- Separate from tenant admins for platform owner

CREATE TABLE IF NOT EXISTS platform_admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Add tenant_id to admin_users (if not exists)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS tenant_id INT NULL AFTER password_hash;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_platform_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER tenant_id;
ALTER TABLE admin_users ADD INDEX IF NOT EXISTS idx_admin_tenant (tenant_id);
ALTER TABLE admin_users ADD FOREIGN KEY IF NOT EXISTS fk_admin_tenant (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255) NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NULL,
  plan VARCHAR(50) DEFAULT 'trial',
  max_employees INT DEFAULT 50,
  status ENUM('pending','active','suspended','cancelled') DEFAULT 'pending',
  trial_ends_at DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tenant_status (status),
  INDEX idx_tenant_slug (slug)
);

-- Tenant Requests table
CREATE TABLE IF NOT EXISTS tenant_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NULL,
  employee_count INT DEFAULT 10,
  message TEXT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  reviewed_by INT NULL,
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_tenant_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tr_status (status),
  INDEX idx_tr_email (contact_email),
  FOREIGN KEY (created_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);
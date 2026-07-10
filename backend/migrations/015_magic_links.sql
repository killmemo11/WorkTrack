-- Magic Link Tokens Table
-- Used for tenant admin first-time login and password reset

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  user_type ENUM('admin','employee') NOT NULL DEFAULT 'admin',
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mlt_user (user_id, user_type),
  INDEX idx_mlt_token (token),
  INDEX idx_mlt_expires (expires_at)
);

-- Public tenant signup requests (from landing page)
CREATE TABLE IF NOT EXISTS tenant_signups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NULL,
  employee_count INT DEFAULT 10,
  message TEXT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ts_email (contact_email),
  INDEX idx_ts_created (created_at)
);
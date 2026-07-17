CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  user_type ENUM('employee','admin','platform') NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user (user_id, user_type),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB;

ALTER TABLE refresh_tokens ADD COLUMN tenant_id INT NULL AFTER user_type;

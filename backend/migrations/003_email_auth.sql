ALTER TABLE employees
  DROP COLUMN microsoft_id,
  ADD COLUMN employee_id INT UNIQUE DEFAULT NULL AFTER id,
  ADD COLUMN username VARCHAR(100) UNIQUE DEFAULT NULL AFTER email,
  ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL AFTER username,
  ADD COLUMN is_verified TINYINT(1) DEFAULT 0 AFTER password_hash,
  ADD COLUMN verification_code VARCHAR(6) DEFAULT NULL AFTER is_verified,
  ADD COLUMN verification_expires DATETIME DEFAULT NULL AFTER verification_code,
  MODIFY email VARCHAR(255) NOT NULL UNIQUE;

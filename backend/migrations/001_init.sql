CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  microsoft_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  department VARCHAR(255) DEFAULT NULL,
  role ENUM('employee', 'admin') DEFAULT 'employee',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  sign_in_time DATETIME NOT NULL,
  sign_out_time DATETIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  sign_out_notes TEXT DEFAULT NULL,
  is_manual_sign_out TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY unique_employee_date (employee_id, date)
);

INSERT INTO employees (microsoft_id, email, name, role) VALUES
('admin-setup', 'admin@placeholder.com', 'Admin', 'admin')
ON DUPLICATE KEY UPDATE role = 'admin';

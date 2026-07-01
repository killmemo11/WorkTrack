// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const pool = require('./shared/config/database');

async function seed() {
  // Create or repair the default admin user so admin login works reliably
  const username = process.env.ADMIN_USERNAME || 'IT';
  const password = process.env.ADMIN_PASSWORD || 'Admin@2026#';
  const [admins] = await pool.query('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);

  if (admins.length === 0) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admin_users (username, password_hash, is_active) VALUES (?, ?, 1)', [username, hash]);
  } else {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE admin_users SET is_active = 1, password_hash = ? WHERE id = ?',
      [hash, admins[0].id]
    );
  }

  // Create default settings if not exist
  const defaults = [
    ['smtp_host', ''],
    ['smtp_port', '587'],
    ['smtp_user', ''],
    ['smtp_pass', ''],
    ['smtp_from', ''],
    ['office_lat', '30.0444'],
    ['office_lng', '31.2357'],
    ['office_radius_meters', '200'],
    ['work_week_start', 'Sunday'],
    ['work_week_end', 'Thursday'],
    ['period_start_day', '15'],
    ['period_end_day', '16'],
    ['logo_data', ''],
    ['allowed_email_domain', ''],
  ];

  for (const [key, value] of defaults) {
    const [existing] = await pool.query('SELECT * FROM settings WHERE `key` = ?', [key]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?)', [key, value]);
    }
  }

  // Service toggles defaults
  const serviceDefaults = [
    ['service_wfh', '1'],
    ['service_office_attendance', '1'],
    ['service_leaves', '1'],
    ['service_recruitment', '1'],
    ['service_people', '1'],
    ['service_manager', '1'],
  ];
  for (const [key, value] of serviceDefaults) {
    const [existing] = await pool.query('SELECT * FROM settings WHERE `key` = ?', [key]);
    if (existing.length === 0) {
      await pool.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?)', [key, value]);
    }
  }

  // Run pending migrations
  const [typeCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'attendance_records' AND COLUMN_NAME = 'type'",
    [process.env.DB_NAME]
  );
  if (typeCol.length === 0) {
    await pool.query("ALTER TABLE attendance_records ADD COLUMN `type` ENUM('wfh','office') NOT NULL DEFAULT 'wfh' AFTER `date`");
    console.log('Migration: added type column to attendance_records');
  }

  const [canWfhCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'can_wfh'",
    [process.env.DB_NAME]
  );
  if (canWfhCol.length === 0) {
    await pool.query("ALTER TABLE employees ADD COLUMN `can_wfh` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active`");
    console.log('Migration: added can_wfh column to employees');
  }

  const [deptTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'departments'",
    [process.env.DB_NAME]
  );
  if (deptTable.length === 0) {
    await pool.query(
      `CREATE TABLE departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        manager_email VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await pool.query(
      `INSERT INTO departments (name, manager_email) VALUES
        ('IT', ''),
        ('HR', ''),
        ('Finance', ''),
        ('Operations', '')`
    );
    console.log('Migration: created departments table with defaults');
  } else {
    const [deptCount] = await pool.query('SELECT COUNT(*) AS cnt FROM departments');
    if (deptCount[0].cnt === 0) {
      await pool.query(
        `INSERT INTO departments (name, manager_email) VALUES
          ('IT', ''),
          ('HR', ''),
          ('Finance', ''),
          ('Operations', '')`
      );
      console.log('Migration: inserted default departments (table was empty)');
    }
  }

  const [deptIdCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'department_id'",
    [process.env.DB_NAME]
  );
  if (deptIdCol.length === 0) {
    await pool.query(
      `ALTER TABLE employees ADD COLUMN department_id INT DEFAULT NULL AFTER department,
       ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL`
    );
    await pool.query(
      `UPDATE employees e JOIN departments d ON e.department = d.name SET e.department_id = d.id`
    );
    console.log('Migration: added department_id column to employees');
  }

  const [pendingDeptCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pending_registrations' AND COLUMN_NAME = 'department_id'",
    [process.env.DB_NAME]
  );
  if (pendingDeptCol.length === 0) {
    await pool.query(
      'ALTER TABLE pending_registrations ADD COLUMN department_id INT DEFAULT NULL AFTER password_hash'
    );
    console.log('Migration: added department_id column to pending_registrations');
  }

  const [holidaysTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'holidays'",
    [process.env.DB_NAME]
  );
  if (holidaysTable.length === 0) {
    await pool.query(
      `CREATE TABLE holidays (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    console.log('Migration: created holidays table');
  }

  // --- v3: phone column ---
  const [phoneCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'phone'",
    [process.env.DB_NAME]
  );
  if (phoneCol.length === 0) {
    await pool.query("ALTER TABLE employees ADD COLUMN phone VARCHAR(20) DEFAULT NULL AFTER email");
    console.log('Migration: added phone column to employees');
  }

  // --- v3: leave_requests table ---
  const [lrTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_requests'",
    [process.env.DB_NAME]
  );
  if (lrTable.length === 0) {
    await pool.query(
      `CREATE TABLE leave_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        type ENUM('annual','sick','casual','personal','unpaid') NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days_count DECIMAL(4,1) NOT NULL,
        reason TEXT,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reviewed_by INT DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )`
    );
    console.log('Migration: created leave_requests table');

    // create indexes
    await pool.query('CREATE INDEX idx_leave_employee ON leave_requests(employee_id)');
    await pool.query('CREATE INDEX idx_leave_status ON leave_requests(status)');
  }

  // --- v3: leave_balances table ---
  const [lbTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_balances'",
    [process.env.DB_NAME]
  );
  if (lbTable.length === 0) {
    await pool.query(
      `CREATE TABLE leave_balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        leave_type ENUM('annual','sick','casual') NOT NULL,
        balance DECIMAL(5,1) NOT NULL DEFAULT 0,
        UNIQUE KEY unique_emp_type (employee_id, leave_type),
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    console.log('Migration: created leave_balances table');

    // Fetch all employees and give default balances
    const [emps] = await pool.query("SELECT id FROM employees WHERE (is_system IS NULL OR is_system = 0)");
    for (const emp of emps) {
      await pool.query('INSERT INTO leave_balances (employee_id, leave_type, balance) VALUES (?,?,?), (?,?,?), (?,?,?)',
        [emp.id, 'annual', 21, emp.id, 'sick', 14, emp.id, 'casual', 7]);
    }
    console.log('Migration: created default leave balances for ' + emps.length + ' employees');
  }

  // --- v3: notifications table ---
  const [notifTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications'",
    [process.env.DB_NAME]
  );
  if (notifTable.length === 0) {
    await pool.query(
      `CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        link VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_notif_employee ON notifications(employee_id)');
    await pool.query('CREATE INDEX idx_notif_read ON notifications(is_read)');
    console.log('Migration: created notifications table');
  }

  // --- v5: leave_types table ---
  const [ltTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_types'",
    [process.env.DB_NAME]
  );
  if (ltTable.length === 0) {
    await pool.query(
      `CREATE TABLE leave_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        label VARCHAR(100) NOT NULL,
        default_balance DECIMAL(5,1) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await pool.query(
      `INSERT INTO leave_types (name, label, default_balance) VALUES
        ('annual', 'Annual', 21),
        ('sick', 'Sick', 14),
        ('casual', 'Casual', 7),
        ('personal', 'Personal', NULL),
        ('unpaid', 'Unpaid', NULL)`
    );
    console.log('Migration: created leave_types table with defaults');
  }

  // --- v4: add 'cancelled' to leave_requests status ENUM ---
  const [statusCol] = await pool.query(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_requests' AND COLUMN_NAME = 'status'",
    [process.env.DB_NAME]
  );
  if (statusCol.length > 0 && !statusCol[0].COLUMN_TYPE.includes('cancelled')) {
    await pool.query("ALTER TABLE leave_requests MODIFY COLUMN status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending'");
    console.log('Migration: added cancelled to leave_requests status ENUM');
  }

  // --- v6: balance_audit table ---
  const [baTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'balance_audit'",
    [process.env.DB_NAME]
  );
  if (baTable.length === 0) {
    await pool.query(
      `CREATE TABLE balance_audit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        leave_type VARCHAR(50) NOT NULL,
        old_balance DECIMAL(5,1) NOT NULL DEFAULT 0,
        new_balance DECIMAL(5,1) NOT NULL DEFAULT 0,
        change_amount DECIMAL(5,1) NOT NULL DEFAULT 0,
        action VARCHAR(50) NOT NULL,
        reference_id INT DEFAULT NULL,
        performed_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_ba_employee ON balance_audit(employee_id)');
    await pool.query('CREATE INDEX idx_ba_action ON balance_audit(action)');
    console.log('Migration: created balance_audit table');
  }

  // --- v7: activity_log table ---
  const [alTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'activity_log'",
    [process.env.DB_NAME]
  );
  if (alTable.length === 0) {
    await pool.query(
      `CREATE TABLE activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT DEFAULT NULL,
        admin_id INT DEFAULT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        ip_address VARCHAR(45) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_al_employee (employee_id),
        INDEX idx_al_admin (admin_id),
        INDEX idx_al_action (action),
        INDEX idx_al_created (created_at)
      )`
    );
    console.log('Migration: created activity_log table');
  }

  // --- v8: add 'manager' to role ENUM ---
  const [roleCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'role'",
    [process.env.DB_NAME]
  );
  if (roleCol.length > 0 && !roleCol[0].COLUMN_TYPE.includes('manager')) {
    await pool.query("ALTER TABLE employees MODIFY COLUMN role ENUM('employee','admin','manager') DEFAULT 'employee'");
    console.log('Migration: added manager to employees role ENUM');
  }

  // --- v9: add reviewed_by_manager_id to leave_requests ---
  const [revByMgrCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_requests' AND COLUMN_NAME = 'reviewed_by_manager_id'",
    [process.env.DB_NAME]
  );
  if (revByMgrCol.length === 0) {
    await pool.query(
      "ALTER TABLE leave_requests ADD COLUMN reviewed_by_manager_id INT DEFAULT NULL AFTER reviewed_by"
    );
    await pool.query(
      "ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_reviewed_by_manager FOREIGN KEY (reviewed_by_manager_id) REFERENCES employees(id) ON DELETE SET NULL"
    );
    await pool.query('CREATE INDEX idx_leave_reviewed_by_mgr ON leave_requests(reviewed_by_manager_id)');
    console.log('Migration: added reviewed_by_manager_id to leave_requests');
  }

  // --- v10: change leave_balances.leave_type to VARCHAR ---
  const [lbTypeCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_balances' AND COLUMN_NAME = 'leave_type'",
    [process.env.DB_NAME]
  );
  if (lbTypeCol.length > 0 && lbTypeCol[0].COLUMN_TYPE.includes('enum')) {
    await pool.query('ALTER TABLE leave_balances MODIFY COLUMN leave_type VARCHAR(50) NOT NULL');
    console.log('Migration: changed leave_balances.leave_type to VARCHAR');
  }

  // --- v11: change leave_requests.type to VARCHAR ---
  const [lrTypeCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_requests' AND COLUMN_NAME = 'type'",
    [process.env.DB_NAME]
  );
  if (lrTypeCol.length > 0 && lrTypeCol[0].COLUMN_TYPE.includes('enum')) {
    await pool.query('ALTER TABLE leave_requests MODIFY COLUMN type VARCHAR(50) NOT NULL');
    console.log('Migration: changed leave_requests.type to VARCHAR');
  }

  // --- v12: add routed_to to leave_types ---
  const [routedToCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'leave_types' AND COLUMN_NAME = 'routed_to'",
    [process.env.DB_NAME]
  );
  if (routedToCol.length === 0) {
    await pool.query(
      "ALTER TABLE leave_types ADD COLUMN routed_to ENUM('manager','admin') NOT NULL DEFAULT 'admin' AFTER is_active"
    );
    await pool.query(
      "UPDATE leave_types SET routed_to = 'manager' WHERE name IN ('annual', 'casual')"
    );
    await pool.query(
      "UPDATE leave_types SET routed_to = 'admin' WHERE name IN ('sick', 'personal', 'unpaid')"
    );
    console.log('Migration: added routed_to to leave_types');
  }

  // --- v13: add 'ceo' to role ENUM ---
  const [roleColV2] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'role'",
    [process.env.DB_NAME]
  );
  if (roleColV2.length > 0 && !roleColV2[0].COLUMN_TYPE.includes('ceo')) {
    await pool.query("ALTER TABLE employees MODIFY COLUMN role ENUM('employee','admin','manager','ceo') DEFAULT 'employee'");
    console.log('Migration: added ceo to employees role ENUM');
  }

  // Add c_level_emails default (deprecated — kept for backward compat)
  const [cleSetting] = await pool.query("SELECT * FROM settings WHERE `key` = 'c_level_emails'");
  if (cleSetting.length === 0) {
    await pool.query("INSERT INTO settings (`key`, `value`) VALUES ('c_level_emails', '')");
    console.log('Migration: added c_level_emails setting');
  }

  // Add ceo_email default
  const [ceoSetting] = await pool.query("SELECT * FROM settings WHERE `key` = 'ceo_email'");
  if (ceoSetting.length === 0) {
    await pool.query("INSERT INTO settings (`key`, `value`) VALUES ('ceo_email', '')");
    console.log('Migration: added ceo_email setting');
  }

  // --- v15: signout_requests table ---
  const [srTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'signout_requests'",
    [process.env.DB_NAME]
  );
  if (srTable.length === 0) {
    await pool.query(
      `CREATE TABLE signout_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        attendance_record_id INT NOT NULL,
        sign_out_time DATETIME NOT NULL,
        notes TEXT,
        status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
        reviewed_by INT DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_sr_employee ON signout_requests(employee_id)');
    await pool.query('CREATE INDEX idx_sr_record ON signout_requests(attendance_record_id)');
    await pool.query('CREATE INDEX idx_sr_status ON signout_requests(status)');
    console.log('Migration: created signout_requests table');
  }

  // --- v16: admin_notifications table ---
  const [anTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'admin_notifications'",
    [process.env.DB_NAME]
  );
  if (anTable.length === 0) {
    await pool.query(
      `CREATE TABLE admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type ENUM('info','success','warning','error') NOT NULL DEFAULT 'info',
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        link VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_admin_notif_admin ON admin_notifications(admin_id)');
    await pool.query('CREATE INDEX idx_admin_notif_read ON admin_notifications(is_read)');
    console.log('Migration: created admin_notifications table');
  }

  // --- v17: Personnel module tables ---
  const [positionsTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'positions'",
    [process.env.DB_NAME]
  );
  if (positionsTable.length === 0) {
    await pool.query(
      `CREATE TABLE positions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department_id INT DEFAULT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
        UNIQUE KEY unique_position_title (title)
      )`
    );
    await pool.query('CREATE INDEX idx_position_department ON positions(department_id)');
    console.log('Migration: created positions table');
  }

  const [posIdCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'position_id'",
    [process.env.DB_NAME]
  );
  if (posIdCol.length === 0) {
    await pool.query(
      "ALTER TABLE employees ADD COLUMN position_id INT DEFAULT NULL AFTER department_id, ADD FOREIGN KEY (position_id) REFERENCES positions(id) ON DELETE SET NULL"
    );
    console.log('Migration: added position_id to employees');
  }

  const [profileTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_profiles'",
    [process.env.DB_NAME]
  );
  if (profileTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL UNIQUE,
        hire_date DATE DEFAULT NULL,
        contract_type ENUM('permanent','temporary','probation','contractor') DEFAULT 'permanent',
        contract_end_date DATE DEFAULT NULL,
        work_type ENUM('full_time','part_time','remote') DEFAULT 'full_time',
        supervisor_id INT DEFAULT NULL,
        nationality VARCHAR(100) DEFAULT NULL,
        birth_date DATE DEFAULT NULL,
        gender ENUM('male','female') DEFAULT NULL,
        marital_status ENUM('single','married','divorced') DEFAULT NULL,
        military_status VARCHAR(100) DEFAULT NULL,
        id_number VARCHAR(50) DEFAULT NULL UNIQUE,
        id_expiry DATE DEFAULT NULL,
        passport_number VARCHAR(50) DEFAULT NULL,
        passport_expiry DATE DEFAULT NULL,
        insurance_number VARCHAR(50) DEFAULT NULL,
        bank_name VARCHAR(255) DEFAULT NULL,
        bank_account VARCHAR(50) DEFAULT NULL,
        address TEXT DEFAULT NULL,
        emergency_contact_name VARCHAR(255) DEFAULT NULL,
        emergency_contact_phone VARCHAR(20) DEFAULT NULL,
        emergency_contact_relation VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (supervisor_id) REFERENCES employees(id) ON DELETE SET NULL
      )`
    );
    console.log('Migration: created employee_profiles table');
  }

  // --- v18: medical insurance fields ---
  const [medInsCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_profiles' AND COLUMN_NAME = 'medical_insurance_number'",
    [process.env.DB_NAME]
  );
  if (medInsCol.length === 0) {
    await pool.query("ALTER TABLE employee_profiles ADD COLUMN `medical_insurance_number` VARCHAR(50) DEFAULT NULL AFTER `insurance_number`");
    await pool.query("ALTER TABLE employee_profiles ADD COLUMN `insurance_card_image` VARCHAR(255) DEFAULT NULL AFTER `medical_insurance_number`");
    console.log('Migration: added medical_insurance_number and insurance_card_image to employee_profiles');
  }

  // --- v19: avatar_path column ---
  const [avatarCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_profiles' AND COLUMN_NAME = 'avatar_path'",
    [process.env.DB_NAME]
  );
  if (avatarCol.length === 0) {
    await pool.query("ALTER TABLE employee_profiles ADD COLUMN `avatar_path` VARCHAR(255) DEFAULT NULL AFTER `insurance_card_image`");
    console.log('Migration: added avatar_path to employee_profiles');
  }

  // --- v20: employee_medical_family table ---
  const [medFamTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_medical_family'",
    [process.env.DB_NAME]
  );
  if (medFamTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_medical_family (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        relation VARCHAR(100) DEFAULT NULL,
        medical_insurance_number VARCHAR(50) DEFAULT NULL,
        insurance_card_image VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    console.log('Migration: created employee_medical_family table');
  }

  const [docsTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_documents'",
    [process.env.DB_NAME]
  );
  if (docsTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        doc_type VARCHAR(50) NOT NULL,
        doc_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        notes TEXT DEFAULT NULL,
        uploaded_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )`
    );
    await pool.query('CREATE INDEX idx_docs_employee ON employee_documents(employee_id)');
    console.log('Migration: created employee_documents table');
  }

  const [eduTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_education'",
    [process.env.DB_NAME]
  );
  if (eduTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_education (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        degree VARCHAR(100) NOT NULL,
        institution VARCHAR(255) NOT NULL,
        field_of_study VARCHAR(255) DEFAULT NULL,
        graduation_year YEAR DEFAULT NULL,
        grade VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_edu_employee ON employee_education(employee_id)');
    console.log('Migration: created employee_education table');
  }

  const [whTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_work_history'",
    [process.env.DB_NAME]
  );
  if (whTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_work_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        company VARCHAR(255) NOT NULL,
        position VARCHAR(255) NOT NULL,
        from_date DATE DEFAULT NULL,
        to_date DATE DEFAULT NULL,
        reason_leaving TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_wh_employee ON employee_work_history(employee_id)');
    console.log('Migration: created employee_work_history table');
  }

  const [certTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_certifications'",
    [process.env.DB_NAME]
  );
  if (certTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_certifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        issuing_authority VARCHAR(255) DEFAULT NULL,
        issue_date DATE DEFAULT NULL,
        expiry_date DATE DEFAULT NULL,
        credential_url VARCHAR(500) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_cert_employee ON employee_certifications(employee_id)');
    console.log('Migration: created employee_certifications table');
  }

  const [statusLogTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_status_log'",
    [process.env.DB_NAME]
  );
  if (statusLogTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_status_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        from_position_id INT DEFAULT NULL,
        to_position_id INT DEFAULT NULL,
        from_department_id INT DEFAULT NULL,
        to_department_id INT DEFAULT NULL,
        effective_date DATE DEFAULT NULL,
        reason TEXT DEFAULT NULL,
        performed_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (from_position_id) REFERENCES positions(id) ON DELETE SET NULL,
        FOREIGN KEY (to_position_id) REFERENCES positions(id) ON DELETE SET NULL,
        FOREIGN KEY (from_department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (to_department_id) REFERENCES departments(id) ON DELETE SET NULL,
        FOREIGN KEY (performed_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )`
    );
    await pool.query('CREATE INDEX idx_status_log_employee ON employee_status_log(employee_id)');
    console.log('Migration: created employee_status_log table');
  }

  // --- v14: add c_level_email to departments ---
  const [cleCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'c_level_email'",
    [process.env.DB_NAME]
  );
  if (cleCol.length === 0) {
    await pool.query(
      "ALTER TABLE departments ADD COLUMN c_level_email VARCHAR(255) NULL AFTER manager_email"
    );
    console.log('Migration: added c_level_email to departments');
  }

  // --- v22: employment_status, resignation_date, annual contract ---
  const [empStatusCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'employment_status'",
    [process.env.DB_NAME]
  );
  if (empStatusCol.length === 0) {
    await pool.query("ALTER TABLE employees ADD COLUMN `employment_status` ENUM('active','resigned') DEFAULT 'active' AFTER `can_wfh`");
    await pool.query("ALTER TABLE employees ADD COLUMN `resignation_date` DATE DEFAULT NULL AFTER `employment_status`");
    console.log('Migration: added employment_status and resignation_date to employees');
  }

  // Update contract_type ENUM: replace 'temporary' with 'annual'
  const [contractTypeCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_profiles' AND COLUMN_NAME = 'contract_type'",
    [process.env.DB_NAME]
  );
  if (contractTypeCol.length > 0 && (contractTypeCol[0].COLUMN_TYPE.includes('temporary') || contractTypeCol[0].COLUMN_TYPE === 'varchar(50)')) {
    await pool.query("UPDATE employee_profiles SET contract_type = 'annual' WHERE contract_type = 'temporary'");
    await pool.query("ALTER TABLE employee_profiles MODIFY COLUMN contract_type ENUM('permanent','annual','probation','contractor') DEFAULT 'permanent'");
    console.log('Migration: changed contract_type ENUM (temporary → annual)');
  }

  // --- v23: resignation_requests table ---
  const [resignReqTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'resignation_requests'",
    [process.env.DB_NAME]
  );
  if (resignReqTable.length === 0) {
    await pool.query(
      `CREATE TABLE resignation_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        reason TEXT DEFAULT NULL,
        resignation_date DATE NOT NULL,
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        reviewed_by INT DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        rejection_reason TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )`
    );
    console.log('Migration: created resignation_requests table');
  }

  // --- v24: asset_catalog table ---
  const [assetCatTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'asset_catalog'",
    [process.env.DB_NAME]
  );
  if (assetCatTable.length === 0) {
    await pool.query(
      `CREATE TABLE asset_catalog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category ENUM('laptop','phone','badge','accessory','other') NOT NULL DEFAULT 'other',
        serial_number VARCHAR(255) DEFAULT NULL,
        brand VARCHAR(255) DEFAULT NULL,
        model VARCHAR(255) DEFAULT NULL,
        purchase_date DATE DEFAULT NULL,
        purchase_price DECIMAL(10,2) DEFAULT NULL,
        status ENUM('available','assigned','damaged','disposed') DEFAULT 'available',
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    await pool.query('CREATE INDEX idx_asset_status ON asset_catalog(status)');
    await pool.query('CREATE INDEX idx_asset_category ON asset_catalog(category)');
    console.log('Migration: created asset_catalog table');
  }

  // --- v25: asset_assignments table ---
  const [assetAssignTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'asset_assignments'",
    [process.env.DB_NAME]
  );
  if (assetAssignTable.length === 0) {
    await pool.query(
      `CREATE TABLE asset_assignments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        employee_id INT NOT NULL,
        assigned_date DATE NOT NULL,
        expected_return_date DATE DEFAULT NULL,
        condition_at_assign TEXT DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        assigned_by INT DEFAULT NULL,
        return_date DATE DEFAULT NULL,
        condition_on_return TEXT DEFAULT NULL,
        return_notes TEXT DEFAULT NULL,
        received_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES asset_catalog(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES admin_users(id) ON DELETE SET NULL,
        FOREIGN KEY (received_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )`
    );
    await pool.query('CREATE INDEX idx_asset_assign_asset ON asset_assignments(asset_id)');
    await pool.query('CREATE INDEX idx_asset_assign_employee ON asset_assignments(employee_id)');
    console.log('Migration: created asset_assignments table');
  }

  // --- v26: asset_history table ---
  const [assetHistTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'asset_history'",
    [process.env.DB_NAME]
  );
  if (assetHistTable.length === 0) {
    await pool.query(
      `CREATE TABLE asset_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_id INT NOT NULL,
        action ENUM('created','assigned','returned','damaged','disposed','transferred','updated') NOT NULL,
        employee_id INT DEFAULT NULL,
        performed_by INT DEFAULT NULL,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES asset_catalog(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY (performed_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )`
    );
    await pool.query('CREATE INDEX idx_asset_hist_asset ON asset_history(asset_id)');
    console.log('Migration: created asset_history table');
  }

  // --- v27: document verification columns ---
  const [docStatusCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_documents' AND COLUMN_NAME = 'status'",
    [process.env.DB_NAME]
  );
  if (docStatusCol.length === 0) {
    await pool.query("ALTER TABLE employee_documents ADD COLUMN `status` ENUM('pending','verified','rejected') DEFAULT 'pending' AFTER `uploaded_by`");
    await pool.query("ALTER TABLE employee_documents ADD COLUMN `reviewed_by` INT DEFAULT NULL AFTER `status`");
    await pool.query("ALTER TABLE employee_documents ADD COLUMN `reviewed_at` DATETIME DEFAULT NULL AFTER `reviewed_by`");
    await pool.query("ALTER TABLE employee_documents ADD COLUMN `rejection_reason` TEXT DEFAULT NULL AFTER `reviewed_at`");
    console.log('Migration: added document verification columns');
  }

  // --- v28: contract_templates table ---
  const [ctTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'contract_templates'",
    [process.env.DB_NAME]
  );
  if (ctTable.length === 0) {
    await pool.query(
      `CREATE TABLE contract_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('permanent','annual','probation','contractor') NOT NULL DEFAULT 'permanent',
        content_html TEXT NOT NULL,
        placeholders TEXT DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    console.log('Migration: created contract_templates table');
  }

  // --- v29: employee_contracts table ---
  const [ecTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_contracts'",
    [process.env.DB_NAME]
  );
  if (ecTable.length === 0) {
    await pool.query(
      `CREATE TABLE employee_contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        template_id INT DEFAULT NULL,
        signed_date DATE DEFAULT NULL,
        start_date DATE DEFAULT NULL,
        end_date DATE DEFAULT NULL,
        content_html TEXT DEFAULT NULL,
        file_path VARCHAR(500) DEFAULT NULL,
        status ENUM('draft','signed','expired','renewed') DEFAULT 'draft',
        signed_by_employee TINYINT(1) DEFAULT 0,
        signed_by_company TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES contract_templates(id) ON DELETE SET NULL
      )`
    );
    await pool.query('CREATE INDEX idx_emp_contracts_employee ON employee_contracts(employee_id)');
    console.log('Migration: created employee_contracts table');
  }

  // --- v30: onboarding/offboarding tables ---
  const [clTemplateTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'checklist_templates'",
    [process.env.DB_NAME]
  );
  if (clTemplateTable.length === 0) {
    await pool.query(
      `CREATE TABLE checklist_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('onboarding','offboarding') NOT NULL,
        department_id INT DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
      )`
    );
    await pool.query(
      `CREATE TABLE checklist_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_id INT NOT NULL,
        task_name VARCHAR(500) NOT NULL,
        assigned_to ENUM('it','hr','admin','manager') NOT NULL DEFAULT 'admin',
        order_index INT DEFAULT 0,
        is_required TINYINT(1) DEFAULT 1,
        days_offset INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
      )`
    );
    await pool.query(
      `CREATE TABLE employee_checklists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        template_id INT NOT NULL,
        started_date DATE NOT NULL,
        status ENUM('in_progress','completed','cancelled') DEFAULT 'in_progress',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES checklist_templates(id) ON DELETE CASCADE
      )`
    );
    await pool.query(
      `CREATE TABLE employee_checklist_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        checklist_id INT NOT NULL,
        item_id INT NOT NULL,
        assigned_to_employee_id INT DEFAULT NULL,
        status ENUM('pending','in_progress','completed') DEFAULT 'pending',
        completed_date DATE DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        completed_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (checklist_id) REFERENCES employee_checklists(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
        FOREIGN KEY (completed_by) REFERENCES admin_users(id) ON DELETE SET NULL
      )`
    );
    await pool.query('CREATE INDEX idx_emp_checklists_employee ON employee_checklists(employee_id)');
    await pool.query('CREATE INDEX idx_emp_checklist_tasks_checklist ON employee_checklist_tasks(checklist_id)');
    console.log('Migration: created onboarding/offboarding tables');
  }

  // --- v31: salary_components table ---
  const [scTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'salary_components'",
    [process.env.DB_NAME]
  );
  if (scTable.length === 0) {
    await pool.query(
      `CREATE TABLE salary_components (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_sc_employee ON salary_components(employee_id)');
    console.log('Migration: created salary_components table');
  }

  // --- v32: birth_place, national_id_place, mother_name in employee_profiles ---
  const [birthPlaceCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_profiles' AND COLUMN_NAME = 'birth_place'",
    [process.env.DB_NAME]
  );
  if (birthPlaceCol.length === 0) {
    await pool.query("ALTER TABLE employee_profiles ADD COLUMN `birth_place` VARCHAR(100) DEFAULT NULL AFTER `birth_date`");
    await pool.query("ALTER TABLE employee_profiles ADD COLUMN `national_id_place` VARCHAR(100) DEFAULT NULL AFTER `id_number`");
    await pool.query("ALTER TABLE employee_profiles ADD COLUMN `mother_name` VARCHAR(255) DEFAULT NULL AFTER `national_id_place`");
    console.log('Migration: added birth_place, national_id_place, mother_name to employee_profiles');
  }

  // --- v33: company info settings ---
  const companyKeys = [
    'company_name', 'company_address', 'company_representative',
    'company_representative_title', 'company_phone', 'company_fax',
    'company_commercial_register', 'company_tax_card',
  ];
  for (const key of companyKeys) {
    const [existing] = await pool.query("SELECT * FROM settings WHERE `key` = ?", [key]);
    if (existing.length === 0) {
      await pool.query("INSERT INTO settings (`key`, `value`) VALUES (?, '')", [key]);
      console.log(`Migration: added setting ${key}`);
    }
  }

  // Add default onboarding/offboarding templates
  const [defaultOnboard] = await pool.query(
    "SELECT id FROM checklist_templates WHERE type = 'onboarding' AND name = 'Default Onboarding' LIMIT 1"
  );
  if (defaultOnboard.length === 0) {
    const [tmpResult] = await pool.query(
      "INSERT INTO checklist_templates (name, type) VALUES ('Default Onboarding', 'onboarding')"
    );
    const templateId = tmpResult.insertId;
    const defaultTasks = [
      { task: 'Prepare personnel file', assignee: 'hr', order: 1 },
      { task: 'Set up email account', assignee: 'it', order: 2 },
      { task: 'Prepare laptop & accessories', assignee: 'it', order: 3 },
      { task: 'Grant system access', assignee: 'it', order: 4 },
      { task: 'Assign employee ID card', assignee: 'admin', order: 5 },
      { task: 'Assign company assets', assignee: 'admin', order: 6 },
      { task: 'Orientation & team introduction', assignee: 'manager', order: 7 },
      { task: 'Add to payroll system', assignee: 'hr', order: 8, daysOffset: 14 },
    ];
    for (const t of defaultTasks) {
      await pool.query(
        'INSERT INTO checklist_items (template_id, task_name, assigned_to, order_index, days_offset) VALUES (?, ?, ?, ?, ?)',
        [templateId, t.task, t.assignee, t.order, t.daysOffset || 0]
      );
    }
    console.log('Migration: created default onboarding template');
  }

  const [defaultOffboard] = await pool.query(
    "SELECT id FROM checklist_templates WHERE type = 'offboarding' AND name = 'Default Offboarding' LIMIT 1"
  );
  if (defaultOffboard.length === 0) {
    const [tmpResult] = await pool.query(
      "INSERT INTO checklist_templates (name, type) VALUES ('Default Offboarding', 'offboarding')"
    );
    const templateId = tmpResult.insertId;
    const defaultTasks = [
      { task: 'Complete resignation formalities', assignee: 'hr', order: 1 },
      { task: 'Return company assets', assignee: 'admin', order: 2 },
      { task: 'Revoke system access', assignee: 'it', order: 3 },
      { task: 'Calculate final settlement', assignee: 'hr', order: 4 },
      { task: 'Update employment status', assignee: 'admin', order: 5 },
    ];
    for (const t of defaultTasks) {
      await pool.query(
        'INSERT INTO checklist_items (template_id, task_name, assigned_to, order_index, days_offset) VALUES (?, ?, ?, ?, ?)',
        [templateId, t.task, t.assignee, t.order, t.daysOffset || 0]
      );
    }
    console.log('Migration: created default offboarding template');
  }

  // --- v34: Recruitment module (jobs + candidates pipeline) ---
  const [recJobsTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_jobs'",
    [process.env.DB_NAME]
  );
  if (recJobsTable.length === 0) {
    await pool.query(
      `CREATE TABLE recruitment_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(255) DEFAULT '',
        type VARCHAR(50) DEFAULT 'Full-Time',
        technical TINYINT(1) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    await pool.query('CREATE INDEX idx_rec_jobs_status ON recruitment_jobs(status)');
    await pool.query('CREATE INDEX idx_rec_jobs_created ON recruitment_jobs(created_at)');
    console.log('Migration: created recruitment_jobs table');
  }

  const [recCandidatesTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_candidates'",
    [process.env.DB_NAME]
  );
  if (recCandidatesTable.length === 0) {
    await pool.query(
      `CREATE TABLE recruitment_candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) DEFAULT '',
        job_id INT DEFAULT NULL,
        job_title VARCHAR(255) DEFAULT '',
        stage VARCHAR(50) DEFAULT 'applied',
        technical TINYINT(1) DEFAULT 0,
        notes TEXT,
        days INT DEFAULT 0,
        cv_filename VARCHAR(255) DEFAULT NULL,
        cv_path VARCHAR(500) DEFAULT NULL,
        score_comm INT DEFAULT 0,
        score_tech INT DEFAULT 0,
        score_fit INT DEFAULT 0,
        test_done TINYINT(1) DEFAULT 0,
        source VARCHAR(100) DEFAULT 'Portal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    await pool.query('CREATE INDEX idx_rec_cand_stage ON recruitment_candidates(stage)');
    await pool.query('CREATE INDEX idx_rec_cand_email ON recruitment_candidates(email)');
    await pool.query('CREATE INDEX idx_rec_cand_job_id ON recruitment_candidates(job_id)');
    await pool.query('CREATE INDEX idx_rec_cand_created ON recruitment_candidates(created_at)');
    console.log('Migration: created recruitment_candidates table');
  }

  const [recHistoryTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_history'",
    [process.env.DB_NAME]
  );
  if (recHistoryTable.length === 0) {
    await pool.query(
      `CREATE TABLE recruitment_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        stage VARCHAR(50) DEFAULT NULL,
        note TEXT,
        created_by VARCHAR(255) DEFAULT 'system',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_rec_hist_candidate ON recruitment_history(candidate_id)');
    await pool.query('CREATE INDEX idx_rec_hist_created ON recruitment_history(created_at)');
    console.log('Migration: created recruitment_history table');
  }

  const [recScorecardsTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_scorecards'",
    [process.env.DB_NAME]
  );
  if (recScorecardsTable.length === 0) {
    await pool.query(
      `CREATE TABLE recruitment_scorecards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        interview VARCHAR(100) DEFAULT NULL,
        interviewer VARCHAR(255) DEFAULT NULL,
        comm INT DEFAULT 0,
        technical INT DEFAULT 0,
        fit INT DEFAULT 0,
        overall INT DEFAULT 0,
        notes TEXT,
        decision VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_rec_sc_candidate ON recruitment_scorecards(candidate_id)');
    console.log('Migration: created recruitment_scorecards table');
  }

  const [recOffersTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_offers'",
    [process.env.DB_NAME]
  );
  if (recOffersTable.length === 0) {
    await pool.query(
      `CREATE TABLE recruitment_offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        candidate_id INT NOT NULL,
        position VARCHAR(255) DEFAULT '',
        department VARCHAR(255) DEFAULT '',
        salary VARCHAR(100) DEFAULT '',
        start_date VARCHAR(50) DEFAULT '',
        reports_to VARCHAR(255) DEFAULT '',
        benefits TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES recruitment_candidates(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_rec_offers_candidate ON recruitment_offers(candidate_id)');
    console.log('Migration: created recruitment_offers table');
  }

  // --- v35: add technical column to positions ---
  const [posTechCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'positions' AND COLUMN_NAME = 'technical'",
    [process.env.DB_NAME]
  );
  if (posTechCol.length === 0) {
    await pool.query("ALTER TABLE positions ADD COLUMN `technical` TINYINT(1) NOT NULL DEFAULT 0 AFTER `description`");
    console.log('Migration: added technical column to positions');
  }

  // --- v36: add position_id to recruitment_jobs ---
  const [rjPosIdCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_jobs' AND COLUMN_NAME = 'position_id'",
    [process.env.DB_NAME]
  );
  if (rjPosIdCol.length === 0) {
    await pool.query("ALTER TABLE recruitment_jobs ADD COLUMN `position_id` INT DEFAULT NULL AFTER `id`");
    console.log('Migration: added position_id to recruitment_jobs');
  }

  // --- v37: grades table ---
  const [gradesTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'grades'",
    [process.env.DB_NAME]
  );
  if (gradesTable.length === 0) {
    await pool.query(
      `CREATE TABLE grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grade_level INT NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        min_salary DECIMAL(12,2) DEFAULT NULL,
        max_salary DECIMAL(12,2) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    // Seed default grades 1–12
    const gradeDefaults = [
      [1,  'Intern 1',       'Entry-level intern', 2000, 3500],
      [2,  'Intern 2',       'Senior intern', 3500, 5000],
      [3,  'Junior 1',       'Junior entry', 5000, 7000],
      [4,  'Junior 2',       'Junior mid', 7000, 9000],
      [5,  'Senior 1',       'Senior entry', 9000, 12000],
      [6,  'Senior 2',       'Senior mid', 12000, 15000],
      [7,  'Supervisor 1',   'Supervisor entry', 15000, 18000],
      [8,  'Supervisor 2',   'Supervisor senior', 18000, 22000],
      [9,  'Manager 1',      'Manager entry', 22000, 28000],
      [10, 'Manager 2',      'Manager senior', 28000, 35000],
      [11, 'Section Head',   'Section head / Director', 35000, 50000],
      [12, 'C-Level',        'Executive / C-Level', 50000, 100000],
    ];
    for (const [level, name, desc, minS, maxS] of gradeDefaults) {
      await pool.query(
        'INSERT INTO grades (grade_level, name, description, min_salary, max_salary) VALUES (?,?,?,?,?)',
        [level, name, desc, minS, maxS]
      );
    }
    console.log('Migration: created grades table with default levels 1–12');
  }

  // --- v38: grade_benefits table ---
  const [gradeBenefitsTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'grade_benefits'",
    [process.env.DB_NAME]
  );
  if (gradeBenefitsTable.length === 0) {
    await pool.query(
      `CREATE TABLE grade_benefits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        grade_id INT NOT NULL,
        benefit_key VARCHAR(100) NOT NULL,
        benefit_value TEXT,
        FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE,
        UNIQUE KEY uq_grade_benefit (grade_id, benefit_key)
      )`
    );
    console.log('Migration: created grade_benefits table');
  }

  // --- v39: department_titles table ---
  const [deptTitlesTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'department_titles'",
    [process.env.DB_NAME]
  );
  if (deptTitlesTable.length === 0) {
    await pool.query(
      `CREATE TABLE department_titles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        grade_id INT DEFAULT NULL,
        description TEXT,
        technical TINYINT(1) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL
      )`
    );
    await pool.query('CREATE INDEX idx_dept_title_department ON department_titles(department_id)');
    await pool.query('CREATE INDEX idx_dept_title_grade ON department_titles(grade_id)');

    // Auto-create standard titles for all existing departments
    const [depts] = await pool.query('SELECT id, name FROM departments');
    const [grades] = await pool.query('SELECT id, grade_level FROM grades ORDER BY grade_level');
    const gradeMap = {};
    grades.forEach(g => { gradeMap[g.grade_level] = g.id; });

    const standard = [
      { title: 'Intern',        sort: 1,  gradeLevel: 1,  technical: 0 },
      { title: 'Junior',        sort: 2,  gradeLevel: 3,  technical: 0 },
      { title: 'Senior',        sort: 3,  gradeLevel: 5,  technical: 0 },
      { title: 'Supervisor',    sort: 4,  gradeLevel: 7,  technical: 0 },
      { title: 'Manager',       sort: 5,  gradeLevel: 9,  technical: 0 },
      { title: 'SectionHead',   sort: 6,  gradeLevel: 11, technical: 0 },
      { title: 'C-Level',       sort: 7,  gradeLevel: 12, technical: 0 },
    ];

    let count = 0;
    for (const dept of depts) {
      for (const s of standard) {
        await pool.query(
          'INSERT INTO department_titles (department_id, title, grade_id, description, technical, sort_order) VALUES (?,?,?,?,?,?)',
          [dept.id, s.title, gradeMap[s.gradeLevel] || null, '', s.technical, s.sort]
        );
        count++;
      }
    }
    console.log(`Migration: created department_titles table and seeded ${count} standard titles`);
  }

  // --- v40: title_evaluation_criteria table ---
  const [evalCriteriaTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'title_evaluation_criteria'",
    [process.env.DB_NAME]
  );
  if (evalCriteriaTable.length === 0) {
    await pool.query(
      `CREATE TABLE title_evaluation_criteria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title_id INT NOT NULL,
        criterion_name VARCHAR(255) NOT NULL,
        weight DECIMAL(5,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE CASCADE
      )`
    );
    console.log('Migration: created title_evaluation_criteria table');
  }

  // --- v41: add grade_id to employees ---
  const [empGradeCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'grade_id'",
    [process.env.DB_NAME]
  );
  if (empGradeCol.length === 0) {
    await pool.query(
      "ALTER TABLE employees ADD COLUMN `grade_id` INT DEFAULT NULL AFTER `position_id`, ADD FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL"
    );
    console.log('Migration: added grade_id to employees');
  }

  // --- v42: add title_id to recruitment_jobs ---
  const [rjTitleIdCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_jobs' AND COLUMN_NAME = 'title_id'",
    [process.env.DB_NAME]
  );
  if (rjTitleIdCol.length === 0) {
    await pool.query(
      "ALTER TABLE recruitment_jobs ADD COLUMN `title_id` INT DEFAULT NULL AFTER `position_id`, ADD FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE SET NULL"
    );
    console.log('Migration: added title_id to recruitment_jobs');
  }

  // --- v43: add job content columns to recruitment_jobs ---
  const [rjRespCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_jobs' AND COLUMN_NAME = 'key_responsibilities'",
    [process.env.DB_NAME]
  );
  if (rjRespCol.length === 0) {
    await pool.query("ALTER TABLE recruitment_jobs ADD COLUMN `key_responsibilities` TEXT AFTER `description`");
    await pool.query("ALTER TABLE recruitment_jobs ADD COLUMN `qualifications` TEXT AFTER `key_responsibilities`");
    await pool.query("ALTER TABLE recruitment_jobs ADD COLUMN `technical_skills` TEXT AFTER `qualifications`");
    await pool.query("ALTER TABLE recruitment_jobs ADD COLUMN `core_competencies` TEXT AFTER `technical_skills`");
    console.log('Migration: added job content columns to recruitment_jobs');
  }

  // --- v44: add title_id to employees ---
  const [empTitleCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'title_id'",
    [process.env.DB_NAME]
  );
  if (empTitleCol.length === 0) {
    await pool.query("ALTER TABLE employees ADD COLUMN `title_id` INT DEFAULT NULL AFTER `position_id`, ADD FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE SET NULL");
    console.log('Migration: added title_id to employees');
  }

  // --- v45: headcount_requests table ---
  const [hcTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'headcount_requests'",
    [process.env.DB_NAME]
  );
  if (hcTable.length === 0) {
    await pool.query(
      `CREATE TABLE headcount_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        requester_id INT NOT NULL,
        department_id INT NOT NULL,
        title_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        job_type ENUM('Full-Time','Part-Time','Contract','Internship') DEFAULT 'Full-Time',
        reason TEXT,
        priority ENUM('normal','urgent') DEFAULT 'normal',
        status ENUM('pending','approved','rejected') DEFAULT 'pending',
        reviewed_by INT DEFAULT NULL,
        reviewed_at DATETIME DEFAULT NULL,
        rejection_reason TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requester_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
        FOREIGN KEY (title_id) REFERENCES department_titles(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL
      )`
    );
    console.log('Migration: created headcount_requests table');
  }

  // --- v46: fix reviewed_by FK to reference employees instead of admin_users ---
  const [fkInfo] = await pool.query(
    `SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'headcount_requests'
       AND COLUMN_NAME = 'reviewed_by' AND REFERENCED_TABLE_NAME = 'admin_users'`,
    [process.env.DB_NAME]
  );
  for (const fk of fkInfo) {
    await pool.query(`ALTER TABLE headcount_requests DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
    await pool.query(`ALTER TABLE headcount_requests ADD FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL`);
    console.log(`Migration: fixed FK ${fk.CONSTRAINT_NAME} on headcount_requests.reviewed_by -> employees(id)`);
  }

  // --- v47: add job content columns to department_titles ---
  const [deptTitlesCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'department_titles' AND COLUMN_NAME = 'job_summary'",
    [process.env.DB_NAME]
  );
  if (deptTitlesCol.length === 0) {
    await pool.query("ALTER TABLE department_titles ADD COLUMN `job_summary` TEXT AFTER `description`");
    await pool.query("ALTER TABLE department_titles ADD COLUMN `key_responsibilities` TEXT AFTER `job_summary`");
    await pool.query("ALTER TABLE department_titles ADD COLUMN `qualifications` TEXT AFTER `key_responsibilities`");
    await pool.query("ALTER TABLE department_titles ADD COLUMN `technical_skills` TEXT AFTER `qualifications`");
    await pool.query("ALTER TABLE department_titles ADD COLUMN `core_competencies` TEXT AFTER `technical_skills`");
    console.log('Migration: added job content columns to department_titles');
  }

  // --- v35: hr_permissions table ---
  const [hrPermTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'hr_permissions'",
    [process.env.DB_NAME]
  );
  if (hrPermTable.length === 0) {
    await pool.query(
      `CREATE TABLE hr_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id INT NOT NULL,
        permission_key VARCHAR(100) NOT NULL,
        granted_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES employees(id) ON DELETE SET NULL,
        UNIQUE KEY unique_emp_perm (employee_id, permission_key)
      )`
    );
    await pool.query('CREATE INDEX idx_hr_perms_employee ON hr_permissions(employee_id)');
    console.log('Migration: created hr_permissions table');
  }

  // Grant default permissions for all HR department employees
  const [hrDept] = await pool.query("SELECT id FROM departments WHERE name = 'HR' LIMIT 1");
  if (hrDept.length > 0) {
    const [hrEmps] = await pool.query(
      "SELECT e.id FROM employees e WHERE e.department_id = ? AND e.is_active = 1",
      [hrDept[0].id]
    );
    const defaultPerms = ['hr:view:employees', 'hr:view:attendance'];
    for (const emp of hrEmps) {
      for (const perm of defaultPerms) {
        await pool.query(
          'INSERT IGNORE INTO hr_permissions (employee_id, permission_key) VALUES (?, ?)',
          [emp.id, perm]
        );
      }
    }
  }

  // --- v48: tasks table (Task Tracking System) ---
  const [tasksTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tasks'",
    [process.env.DB_NAME]
  );
  if (tasksTable.length === 0) {
    await pool.query(
      `CREATE TABLE tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT DEFAULT NULL,
        assigned_by INT NOT NULL,
        assigned_to INT NOT NULL,
        status ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
        priority ENUM('low','medium','high') DEFAULT 'medium',
        due_date DATE DEFAULT NULL,
        notes TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_by) REFERENCES employees(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE CASCADE
      )`
    );
    await pool.query('CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to)');
    await pool.query('CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by)');
    console.log('Migration: created tasks table');
  }

  // --- v49: contacts table (Landing Page Contact Form) ---
  const [contactsTable] = await pool.query(
    "SELECT * FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'contacts'",
    [process.env.DB_NAME]
  );
  if (contactsTable.length === 0) {
    await pool.query(
      `CREATE TABLE contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(255) DEFAULT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
    console.log('Migration: created contacts table');
  }

  // --- v50: add parent_department_id to departments (hierarchical structure) ---
  const [parentDeptCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'parent_department_id'",
    [process.env.DB_NAME]
  );
  if (parentDeptCol.length === 0) {
    await pool.query(
      "ALTER TABLE departments ADD COLUMN parent_department_id INT DEFAULT NULL AFTER c_level_email, ADD FOREIGN KEY (parent_department_id) REFERENCES departments(id) ON DELETE SET NULL"
    );
    console.log('Migration: added parent_department_id to departments');
  }

  // --- v51: add max_headcount to departments ---
  const [deptMaxCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'departments' AND COLUMN_NAME = 'max_headcount'",
    [process.env.DB_NAME]
  );
  if (deptMaxCol.length === 0) {
    await pool.query(
      "ALTER TABLE departments ADD COLUMN max_headcount INT NOT NULL DEFAULT 0 AFTER parent_department_id"
    );
    console.log('Migration: added max_headcount to departments');
  }

  // --- v52: add max_headcount to department_titles ---
  const [deptTitleMaxCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'department_titles' AND COLUMN_NAME = 'max_headcount'",
    [process.env.DB_NAME]
  );
  if (deptTitleMaxCol.length === 0) {
    await pool.query(
      "ALTER TABLE department_titles ADD COLUMN max_headcount INT NOT NULL DEFAULT 0 AFTER core_competencies"
    );
    console.log('Migration: added max_headcount to department_titles');
  }

  // --- v53: add headcount_request_id to recruitment_jobs ---
  const [rjHcReqIdCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'recruitment_jobs' AND COLUMN_NAME = 'headcount_request_id'",
    [process.env.DB_NAME]
  );
  if (rjHcReqIdCol.length === 0) {
    await pool.query(
      "ALTER TABLE recruitment_jobs ADD COLUMN `headcount_request_id` INT DEFAULT NULL AFTER `title_id`, ADD FOREIGN KEY (headcount_request_id) REFERENCES headcount_requests(id) ON DELETE SET NULL"
    );
    console.log('Migration: added headcount_request_id to recruitment_jobs');
  }

  // --- v54: multi-level approval columns for headcount_requests ---
  const [hcManagerStatusCol] = await pool.query(
    "SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'headcount_requests' AND COLUMN_NAME = 'manager_status'",
    [process.env.DB_NAME]
  );
  if (hcManagerStatusCol.length === 0) {
    await pool.query(
      `ALTER TABLE headcount_requests
       ADD COLUMN manager_status ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER status,
       ADD COLUMN reviewed_by_manager_id INT DEFAULT NULL AFTER reviewed_by,
       ADD COLUMN reviewed_by_manager_at DATETIME DEFAULT NULL AFTER reviewed_by_manager_id,
       ADD COLUMN reviewed_by_ceo_id INT DEFAULT NULL AFTER reviewed_by_manager_at,
       ADD COLUMN reviewed_by_ceo_at DATETIME DEFAULT NULL AFTER reviewed_by_ceo_id,
       ADD COLUMN ceo_status ENUM('pending','approved','rejected') DEFAULT 'pending' AFTER manager_status,
       ADD COLUMN manager_rejection_reason TEXT DEFAULT NULL AFTER ceo_status,
       ADD COLUMN ceo_rejection_reason TEXT DEFAULT NULL AFTER manager_rejection_reason,
       ADD FOREIGN KEY (reviewed_by_manager_id) REFERENCES employees(id) ON DELETE SET NULL,
       ADD FOREIGN KEY (reviewed_by_ceo_id) REFERENCES employees(id) ON DELETE SET NULL`
    );
    console.log('Migration: added multi-level approval columns to headcount_requests');
  }
}

module.exports = seed;

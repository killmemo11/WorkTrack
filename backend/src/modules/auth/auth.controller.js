// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const validator = require('validator');
const pool = require('../../shared/config/database');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../../shared/services/email.service');
const { notifyAllAdmins } = require('../../shared/services/notification.service');
const { logActivity } = require('../../shared/services/activity.service');

function generateCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function validatePassword(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

async function register(req, res) {
  const { employee_id, name, email, username, password, department_id } = req.body;

  if (!employee_id || !name || !email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-30 characters (letters, numbers, underscores)' });
  }
  const pwdErr = validatePassword(password);
  if (pwdErr) return res.status(400).json({ error: pwdErr });
  if (name.length > 255) return res.status(400).json({ error: 'Name is too long' });

  // Check email domain restriction
  const [domainRows] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'allowed_email_domain'");
  const allowedDomain = domainRows.length > 0 ? domainRows[0].value.trim() : '';
  if (allowedDomain) {
    const emailDomain = email.split('@')[1];
    const cleanDomain = allowedDomain.startsWith('@') ? allowedDomain.slice(1) : allowedDomain;
    if (!emailDomain || emailDomain.toLowerCase() !== cleanDomain.toLowerCase()) {
      return res.status(400).json({
        error: `Registration is restricted to @${cleanDomain} email addresses. Please use your work email.`
      });
    }
  }

  const [existing] = await pool.query(
    'SELECT id FROM employees WHERE email = ? OR username = ? OR employee_id = ?',
    [email, username, employee_id]
  );
  if (existing.length > 0) {
    return res.status(400).json({ error: 'Email, username, or employee ID already exists' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const code = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    `INSERT INTO pending_registrations (email, employee_id, name, username, password_hash, verification_code, verification_expires, department_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       employee_id = VALUES(employee_id),
       name = VALUES(name),
       password_hash = VALUES(password_hash),
       verification_code = VALUES(verification_code),
       verification_expires = VALUES(verification_expires),
       department_id = VALUES(department_id)`,
    [email, employee_id, name, username, password_hash, code, expires, department_id || null]
  );

  try {
    await sendVerificationEmail({ name, email }, code);
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
  }

  res.status(201).json({ message: 'Verification code sent to your email.', email });
}

async function verify(req, res) {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const [pending] = await pool.query(
    'SELECT * FROM pending_registrations WHERE email = ? AND verification_code = ? AND verification_expires > NOW()',
    [email, code]
  );

  let isNewRegistration = false;
  if (pending.length > 0) {
    const p = pending[0];
    const [insertResult] = await pool.query(
      `INSERT INTO employees (employee_id, name, email, username, password_hash, is_verified, department_id)
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [p.employee_id, p.name, p.email, p.username, p.password_hash, p.department_id]
    );
    isNewRegistration = true;
    // Create default leave balances
    const [typeRows] = await pool.query(
      'SELECT name, default_balance FROM leave_types WHERE default_balance IS NOT NULL'
    );
    for (const t of typeRows) {
      await pool.query(
        'INSERT IGNORE INTO leave_balances (employee_id, leave_type, balance) VALUES (?, ?, ?)',
        [insertResult.insertId, t.name, t.default_balance]
      );
    }
    await pool.query('DELETE FROM pending_registrations WHERE id = ?', [p.id]);
  } else {
    const [legacy] = await pool.query(
      'SELECT * FROM employees WHERE email = ? AND verification_code = ? AND verification_expires > NOW() AND is_verified = 0',
      [email, code]
    );
    if (legacy.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    await pool.query(
      'UPDATE employees SET is_verified = 1, verification_code = NULL, verification_expires = NULL WHERE id = ?',
      [legacy[0].id]
    );
  }

  const [empRows] = await pool.query('SELECT * FROM employees WHERE email = ?', [email]);
  const employee = empRows[0];

  // Auto-detect manager role
  const isManager = await syncManagerRole(employee.id, email);
  // Auto-detect C-level role
  const isGlobalCeo = await syncCLevelRoles(employee.id, email);

  if (isNewRegistration) {
    try {
      await notifyAllAdmins(
        'New Employee Registered',
        `${employee.name} (${employee.employee_id}) has joined the system.`,
        'info',
        '/admin/employees'
      );
    } catch (e) { console.error('New employee notif error:', e); }
  }

  // Re-fetch in case role changed
  const [finalRows] = await pool.query(
    `SELECT e.*, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.id = ?`,
    [employee.id]
  );
  const finalEmp = finalRows[0];

  const token = jwt.sign(
    { id: finalEmp.id, email: finalEmp.email, role: finalEmp.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, employee: { id: finalEmp.id, name: finalEmp.name, email: finalEmp.email, phone: finalEmp.phone, role: finalEmp.role, can_wfh: finalEmp.can_wfh, is_manager: isManager, department_id: finalEmp.department_id, department_name: finalEmp.department_name, is_hr: finalEmp.department_name === 'HR' || finalEmp.role === 'admin', is_global_ceo: isGlobalCeo } });
}

async function login(req, res) {
  const { username, password, rememberMe } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // First try admin_users table
  let [rows] = await pool.query('SELECT * FROM admin_users WHERE username = ?', [username]);
  
  // If not found in admin_users, try employees table
  if (rows.length === 0) {
    [rows] = await pool.query('SELECT * FROM employees WHERE username = ?', [username]);
  }
  
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = rows[0];

  // Check password based on table
  let valid = false;
  if (user.password_hash) {
    valid = await bcrypt.compare(password, user.password_hash);
  } else if (user.password) {
    // For admin_users with plain text password (legacy)
    valid = password === user.password;
  }

  if (!valid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  // Check verification and status based on user type
  let isVerified = true;
  let isActive = true;
  let userEmail = user.email || user.username;
  let userName = user.name || user.username;

  if (user.is_verified !== undefined) {
    isVerified = user.is_verified;
  }
  
  if (user.is_active !== undefined) {
    isActive = user.is_active;
  }

  if (!isVerified) {
    return res.status(403).json({ error: 'Email not verified. Please check your inbox.', email: userEmail });
  }

  if (!isActive) {
    return res.status(403).json({ error: 'Your account has been deactivated. Contact admin.' });
  }

  // Auto-detect manager role
  const isManager = await syncManagerRole(user.id || user.employee_id, user.email);
  // Auto-detect C-level role
  const isGlobalCeo = await syncCLevelRoles(user.id || user.employee_id, user.email);

  // Re-fetch with proper ID handling
  const userId = user.id || user.employee_id;
  const [finalRows] = await pool.query(
    `SELECT e.*, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.id = ?`,
    [userId]
  );
  const finalEmp = finalRows[0];

  const token = jwt.sign(
    { id: userId, email: user.email || user.username, role: user.role || 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? '7d' : '12h' }
  );

  const deptName = (finalEmp?.department_name || '').toLowerCase().replace(/\s+/g, ' ');
  const isHr = deptName === 'hr' || deptName === 'human resources';
  if (isHr) {
    logActivity(null, userId, 'hr_login', `HR employee logged in: ${user.name || user.username}`);
  }

  const employeeName = user.name || user.username || 'IT Admin';
  const employeeEmail = user.email || user.username || 'admin@worktrack.local';

  res.json({ 
    token, 
    employee: { 
      id: userId, 
      name: employeeName, 
      email: employeeEmail, 
      phone: user.phone || '', 
      role: user.role || 'admin',
      can_wfh: finalEmp?.can_wfh,
      is_manager: isManager, 
      department_id: finalEmp?.department_id, 
      department_name: finalEmp?.department_name || 'IT',
      is_hr: isHr, 
      is_global_ceo: isGlobalCeo 
    } 
  });
}

async function resendCode(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const [rows] = await pool.query('SELECT * FROM pending_registrations WHERE email = ?', [email]);
  if (rows.length === 0) {
    return res.status(400).json({ error: 'No pending registration found with this email' });
  }

  const code = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    'UPDATE pending_registrations SET verification_code = ?, verification_expires = ? WHERE id = ?',
    [code, expires, rows[0].id]
  );

  try {
    await sendVerificationEmail(rows[0], code);
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
  }

  res.json({ message: 'Verification code resent. Check your email.' });
}

async function syncManagerRole(employeeId, email) {
  const [deptRows] = await pool.query('SELECT id FROM departments WHERE manager_email = ?', [email]);
  const isManager = deptRows.length > 0;
  if (isManager) {
    const [emp] = await pool.query('SELECT role FROM employees WHERE id = ?', [employeeId]);
    if (emp.length > 0 && emp[0].role !== 'admin' && emp[0].role !== 'ceo') {
      await pool.query('UPDATE employees SET role = ? WHERE id = ?', ['manager', employeeId]);
    }
  } else {
    await pool.query(
      "UPDATE employees SET role = 'employee' WHERE id = ? AND role = 'manager'",
      [employeeId]
    );
  }
  return isManager;
}

async function syncCLevelRoles(employeeId, email) {
  let isGlobalCeoResult = false;
  const [ceoSetting] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email'");
  const ceoEmail = ceoSetting.length > 0 ? ceoSetting[0].value.trim().toLowerCase() : '';
  const isCEO = ceoEmail.length > 0 && email.toLowerCase() === ceoEmail;

  const [deptRows] = await pool.query('SELECT id FROM departments WHERE c_level_email = ?', [email]);
  const isCLevel = deptRows.length > 0;

  if (isCEO) {
    isGlobalCeoResult = true;
    const [emp] = await pool.query('SELECT role FROM employees WHERE id = ?', [employeeId]);
    if (emp.length > 0 && emp[0].role !== 'admin') {
      await pool.query('UPDATE employees SET role = ?, department_id = NULL WHERE id = ?', ['ceo', employeeId]);
    }
  } else if (isCLevel) {
    const [emp] = await pool.query('SELECT role FROM employees WHERE id = ?', [employeeId]);
    if (emp.length > 0 && emp[0].role !== 'admin') {
      // If user is C-Level for exactly one department, set their department_id
      if (deptRows.length === 1) {
        await pool.query('UPDATE employees SET role = ?, department_id = ? WHERE id = ?', ['ceo', deptRows[0].id, employeeId]);
      } else {
        await pool.query('UPDATE employees SET role = ? WHERE id = ?', ['ceo', employeeId]);
      }
    }
  } else {
    const [mgrDepts] = await pool.query('SELECT id FROM departments WHERE manager_email = ?', [email]);
    if (mgrDepts.length === 0) {
      await pool.query(
        "UPDATE employees SET role = 'employee' WHERE id = ? AND role = 'ceo'",
        [employeeId]
      );
    }
  }
  return isGlobalCeoResult;
}

async function me(req, res) {
  const isManager = await syncManagerRole(req.employee.id, req.employee.email);
  const isGlobalCeo = await syncCLevelRoles(req.employee.id, req.employee.email);
  const [rows] = await pool.query(
    `SELECT e.id, e.employee_id, e.name, e.email, e.username, e.phone, e.department_id, e.role,
            e.can_wfh, e.is_active, d.name AS department_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.id = ?`,
    [req.employee.id]
  );
  const emp = rows[0];
  if (emp) {
    emp.is_manager = isManager;
    emp.is_global_ceo = isGlobalCeo;
    emp.is_hr = (emp.department_name || '').toLowerCase().replace(/\s+/g, ' ') === 'hr' || (emp.department_name || '').toLowerCase().replace(/\s+/g, ' ') === 'human resources';

    // Include team members if user is a manager
    if (emp.role === 'manager' || isManager) {
      const [members] = await pool.query(
        `SELECT e.id, e.name, e.email, e.employee_id
         FROM employees e
         WHERE e.department_id = ? AND e.is_active = 1 AND e.id != ?
         ORDER BY e.name ASC`,
        [emp.department_id, emp.id]
      );
      emp.team_members = members;
    } else {
      emp.team_members = [];
    }
  }
  res.json(emp);
}

async function logout(req, res) {
  res.json({ message: 'Logged out' });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  let [rows] = await pool.query('SELECT * FROM employees WHERE email = ? AND is_verified = 1', [email]);
  
  if (rows.length === 0) {
    // Check admin_users (but don't allow password reset for them via email)
    const [adminRows] = await pool.query('SELECT * FROM admin_users WHERE username = ?', [email]);
    if (adminRows.length > 0) {
      return res.status(400).json({ error: 'Admin accounts cannot reset password via email. Contact system administrator.' });
    }
    return res.status(400).json({ error: 'No verified account found with this email' });
  }

  const code = generateCode();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await pool.query(
    'UPDATE employees SET verification_code = ?, verification_expires = ? WHERE id = ?',
    [code, expires, rows[0].id]
  );

  try {
    await sendPasswordResetEmail(rows[0], code);
    res.json({ message: 'Reset code sent to your email.', email });
  } catch (err) {
    console.error('Failed to send password reset email:', err.message);
    // If SMTP not configured, return the code directly for testing
    res.json({ message: 'Development mode - password reset code', email, code });
  }
}

async function resetPassword(req, res) {
  const { email, code, password } = req.body;
  if (!email || !code || !password) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  const pwdErr = validatePassword(password);
  if (pwdErr) return res.status(400).json({ error: pwdErr });

  const [rows] = await pool.query(
    'SELECT * FROM employees WHERE email = ? AND verification_code = ? AND verification_expires > NOW()',
    [email, code]
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE employees SET password_hash = ?, verification_code = NULL, verification_expires = NULL WHERE id = ?',
    [password_hash, rows[0].id]
  );

  res.json({ message: 'Password reset successfully. You can now login with your new password.' });
}

async function hasEmployees(req, res) {
  const [rows] = await pool.query("SELECT COUNT(*) AS cnt FROM employees WHERE is_verified = 1");
  res.json({ hasEmployees: rows[0].cnt > 0 });
}

module.exports = { register, verify, login, resendCode, me, logout, forgotPassword, resetPassword, hasEmployees };


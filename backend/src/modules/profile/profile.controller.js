// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const pool = require('../../shared/config/database');

async function updateProfile(req, res) {
  const employeeId = req.employee.id;
  const { phone } = req.body;

  if (phone !== undefined) {
    await pool.query('UPDATE employees SET phone = ? WHERE id = ?', [phone, employeeId]);
  }

  const [rows] = await pool.query('SELECT id, employee_id, name, email, username, phone, role, can_wfh, department_id FROM employees WHERE id = ?', [employeeId]);
  res.json(rows[0]);
}

async function changePassword(req, res) {
  const employeeId = req.employee.id;
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (new_password.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters' });
  }

  const [rows] = await pool.query('SELECT password_hash FROM employees WHERE id = ?', [employeeId]);
  const valid = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!valid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const password_hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE employees SET password_hash = ? WHERE id = ?', [password_hash, employeeId]);

  res.json({ message: 'Password changed successfully' });
}

module.exports = { updateProfile, changePassword };

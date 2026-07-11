// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

// Known default value — rejected as a new password even if anyone tries to set it.
// Public in the task brief, so we hardcode it as forbidden.
const FORBIDDEN_DEFAULT = '001100WorkTrack';

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const [adminRows] = await pool.query('SELECT * FROM admin_users WHERE username = ?', [username]);
  if (adminRows.length > 0) {
    const valid = await bcrypt.compare(password, adminRows[0].password_hash);
    if (valid) {
      const token = jwt.sign(
        { id: adminRows[0].id, username: adminRows[0].username, type: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      await logActivity(null, adminRows[0].id, 'admin_login', `Admin logged in: ${adminRows[0].username}`);
      return res.json({
        token,
        admin: {
          id: adminRows[0].id,
          username: adminRows[0].username,
          must_change_password: adminRows[0].must_change_password === 1
        }
      });
    }
  }

  const [empRows] = await pool.query(
    `SELECT e.* FROM employees e WHERE e.username = ? AND e.role = 'admin'`,
    [username]
  );
  if (empRows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, empRows[0].password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: empRows[0].id, email: empRows[0].email, role: empRows[0].role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  await logActivity(null, empRows[0].id, 'admin_login', `Admin logged in: ${empRows[0].name}`);

  // Employee-admins have no must_change_password column.
  res.json({
    token,
    admin: {
      id: empRows[0].id,
      username: empRows[0].username,
      name: empRows[0].name,
      must_change_password: false
    }
  });
}

async function me(req, res) {
  if (req.admin.type === 'admin') {
    return res.json({
      id: req.admin.id,
      username: req.admin.username,
      must_change_password: !!req.admin.must_change_password
    });
  }
  res.json({
    id: req.admin.id,
    username: req.admin.username,
    name: req.admin.name,
    must_change_password: false
  });
}

// POST /api/admin/auth/change-password
// Body: { currentPassword, newPassword }
// Must run after requireITAuth (which populates req.admin).
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }

  // Policy validation
  if (typeof newPassword !== 'string' || newPassword.length < 10) {
    return res.status(400).json({ code: 'PASSWORD_POLICY_VIOLATION', error: 'Password must be at least 10 characters' });
  }
  if (newPassword === FORBIDDEN_DEFAULT) {
    return res.status(400).json({ code: 'PASSWORD_POLICY_VIOLATION', error: 'Please choose a different password' });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ code: 'PASSWORD_POLICY_VIOLATION', error: 'New password must differ from current' });
  }
  if (req.admin.username && newPassword.toLowerCase() === String(req.admin.username).toLowerCase()) {
    return res.status(400).json({ code: 'PASSWORD_POLICY_VIOLATION', error: 'Password cannot match your username' });
  }

  // admin_users branch
  if (req.admin.type === 'admin') {
    const [rows] = await pool.query(
      'SELECT id, password_hash, tenant_id FROM admin_users WHERE id = ?',
      [req.admin.id]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
      [newHash, req.admin.id]
    );
    await logActivity(null, req.admin.id, 'admin_password_changed', `Admin changed password: ${req.admin.username}`);
    return res.json({ message: 'Password updated', must_change_password: false });
  }

  // Employee-admin branch
  const [empRows] = await pool.query('SELECT id, password_hash FROM employees WHERE id = ?', [req.admin.id]);
  if (empRows.length === 0) return res.status(401).json({ error: 'Account not found' });

  const valid = await bcrypt.compare(currentPassword, empRows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE employees SET password_hash = ? WHERE id = ?', [newHash, req.admin.id]);
  await logActivity(null, req.admin.id, 'admin_password_changed', `Employee-admin changed password: ${req.admin.username}`);
  res.json({ message: 'Password updated', must_change_password: false });
}

module.exports = { login, me, changePassword };

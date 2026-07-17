// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const tokenService = require('../../shared/services/token.service');

const COOKIE_SECURE = process.env.NODE_ENV === 'production';

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
    const admin = adminRows[0];

    // Check lockout (5 failures in 15 minutes)
    if ((admin.failed_attempts || 0) >= 5 && admin.last_failed_login) {
      const elapsed = Date.now() - new Date(admin.last_failed_login).getTime();
      if (elapsed < 15 * 60 * 1000) {
        return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' });
      }
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      await pool.query(
        'UPDATE admin_users SET failed_attempts = COALESCE(failed_attempts, 0) + 1, last_failed_login = NOW() WHERE id = ?',
        [admin.id]
      ).catch(() => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on success
    await pool.query(
      'UPDATE admin_users SET failed_attempts = 0, last_failed_login = NULL WHERE id = ?',
      [admin.id]
    ).catch(() => {});

    const token = jwt.sign(
      { id: admin.id, username: admin.username, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'admin' }
    );

    const refreshToken = await tokenService.generateRefreshToken(
      admin.id,
      'admin',
      admin.tenant_id
    );

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    await logActivity(null, admin.id, 'admin_login', `Admin logged in: ${admin.username}`);
    return res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        must_change_password: admin.must_change_password === 1
      }
    });
  }

  // Fall through to employee-admin accounts
  const [empRows] = await pool.query(
    `SELECT e.* FROM employees e WHERE e.username = ? AND e.role = 'admin'`,
    [username]
  );
  if (empRows.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const emp = empRows[0];

  // Check lockout for employee-admins
  if ((emp.failed_attempts || 0) >= 5 && emp.last_failed_login) {
    const elapsed = Date.now() - new Date(emp.last_failed_login).getTime();
    if (elapsed < 15 * 60 * 1000) {
      return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' });
    }
  }

  const valid = await bcrypt.compare(password, emp.password_hash);
  if (!valid) {
    await pool.query(
      'UPDATE employees SET failed_attempts = COALESCE(failed_attempts, 0) + 1, last_failed_login = NOW() WHERE id = ?',
      [emp.id]
    ).catch(() => {});
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Reset failed attempts on success
  await pool.query(
    'UPDATE employees SET failed_attempts = 0, last_failed_login = NULL WHERE id = ?',
    [emp.id]
  ).catch(() => {});

  const token = jwt.sign(
    { id: emp.id, email: emp.email, role: emp.role, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'worktrack', audience: 'admin' }
  );

  const refreshToken = await tokenService.generateRefreshToken(
    emp.id,
    'admin',
    emp.tenant_id
  );

  res.cookie('access_token', token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });

  await logActivity(null, emp.id, 'admin_login', `Admin logged in: ${emp.name}`);

  res.json({
    token,
    admin: {
      id: emp.id,
      username: emp.username,
      name: emp.name,
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
  if (typeof newPassword !== 'string' || newPassword.length < 12) {
    return res.status(400).json({ code: 'PASSWORD_POLICY_VIOLATION', error: 'Password must be at least 12 characters' });
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

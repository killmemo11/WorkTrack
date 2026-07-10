// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { sendTenantAdminMagicLink } = require('../../shared/services/platform-email.service');

// Create a magic link token and send email
router.post('/request-magic-link', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const [admins] = await pool.query(
    'SELECT id, username, tenant_id, is_active FROM admin_users WHERE email = ? AND is_platform_admin = 0',
    [email.toLowerCase().trim()]
  );
  if (admins.length === 0) {
    return res.status(200).json({ message: 'If this email belongs to a tenant admin, a magic link has been sent.' });
  }

  const admin = admins[0];
  if (!admin.is_active) {
    return res.status(200).json({ message: 'If this email belongs to a tenant admin, a magic link has been sent.' });
  }

  const [tenants] = await pool.query('SELECT name FROM tenants WHERE id = ?', [admin.tenant_id]);
  const tenantName = tenants[0]?.name || 'WorkTrack';

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await pool.query('DELETE FROM magic_link_tokens WHERE user_id = ? AND user_type = "admin"', [admin.id]);
  await pool.query(
    'INSERT INTO magic_link_tokens (user_id, user_type, token, expires_at, created_at) VALUES (?, "admin", ?, ?, NOW())',
    [admin.id, token, expiresAt]
  );

  const baseUrl = process.env.FRONTEND_URL || 'https://worktrack.ddns.net';
  const magicLink = `${baseUrl}/magic-link?token=${token}`;

  await sendTenantAdminMagicLink(email, admin.username, tenantName, magicLink);
  await logActivity(null, admin.id, 'magic_link_requested', `Magic link requested for ${admin.username}`);

  res.json({ message: 'Magic link sent to your email', token: process.env.NODE_ENV === 'development' ? token : undefined });
});

// Verify magic link token and set password
router.post('/verify-and-set-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const [tokens] = await pool.query(
    'SELECT * FROM magic_link_tokens WHERE token = ? AND user_type = "admin" AND expires_at > NOW() AND used_at IS NULL',
    [token]
  );
  if (tokens.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired magic link' });
  }

  const magicToken = tokens[0];
  const [admins] = await pool.query('SELECT id, username, tenant_id FROM admin_users WHERE id = ?', [magicToken.user_id]);
  if (admins.length === 0) {
    return res.status(400).json({ error: 'Admin account not found' });
  }

  const admin = admins[0];
  const hash = await bcrypt.hash(password, 12);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, admin.id]);
    await conn.query('UPDATE magic_link_tokens SET used_at = NOW() WHERE id = ?', [magicToken.id]);
    await conn.query('DELETE FROM magic_link_tokens WHERE user_id = ? AND user_type = "admin"', [admin.id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logActivity(null, admin.id, 'password_set_via_magic_link', `Password set for ${admin.username} via magic link`);

  const jwtToken = jwt.sign(
    { id: admin.id, username: admin.username, tenant_id: admin.tenant_id, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Password set successfully',
    token: jwtToken,
    admin: { id: admin.id, username: admin.username }
  });
});

module.exports = router;
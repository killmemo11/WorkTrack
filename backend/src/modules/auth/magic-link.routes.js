// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../../shared/config/database');
const tokenService = require('../../shared/services/token.service');
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

  // Dev/test convenience: expose the magic-link token in the API response body so
  // local onboarding doesn't require a working SMTP server. STRICTLY gated —
  // never reachable when NODE_ENV === 'production'. The token alone (without the
  // user row) is also useless cross-tenant.
  const isDev = process.env.NODE_ENV !== 'production';
  res.json({
    message: 'Magic link sent to your email',
    ...(isDev ? { dev_magic_link: magicLink, dev_token: token } : {})
  });
});

// Verify magic link token and set password
router.post('/verify-and-set-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }
  if (password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }

  const [tokens] = await pool.query(
    'SELECT * FROM magic_link_tokens WHERE token = ? AND user_type = "admin" AND expires_at > NOW() AND used_at IS NULL',
    [token]
  );
  if (tokens.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired magic link' });
  }

  const magicToken = tokens[0];
  const [admins] = await pool.query('SELECT id, username, tenant_id, must_change_password FROM admin_users WHERE id = ?', [magicToken.user_id]);
  if (admins.length === 0) {
    return res.status(400).json({ error: 'Admin account not found' });
  }

  const admin = admins[0];
  const hash = bcrypt.hashSync(password, 12);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Set the new password hash. Per Phase 1 design, we LEAVE must_change_password=1
    // so the admin is forced to change it again on the first real interactive login.
    // Defense in depth against magic-link interception / shoulder-surfing during onboarding.
    await conn.query(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [hash, admin.id]
    );
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

  const COOKIE_SECURE = process.env.NODE_ENV === 'production';

  const accessToken = jwt.sign(
    { id: admin.id, username: admin.username, tenant_id: admin.tenant_id, type: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '15m', issuer: 'worktrack', audience: 'admin', algorithm: 'HS256' }
  );

  const refreshToken = await tokenService.generateRefreshToken(admin.id, 'admin', admin.tenant_id);

  res.cookie('access_token', accessToken, {
    httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict',
    maxAge: 15 * 60 * 1000, path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true, secure: COOKIE_SECURE, sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, path: '/',
  });

  res.json({
    message: 'Password set successfully',
    admin: { id: admin.id, username: admin.username, must_change_password: admin.must_change_password === 1 ? true : false }
  });
});

module.exports = router;
const { Router } = require('express');
const jwt = require('jsonwebtoken');
const tokenService = require('../../shared/services/token.service');
const pool = require('../../shared/config/database');
const { isTenantActive, TENANT_INACTIVE_MESSAGE } = require('../../shared/services/tenant.service');

const router = Router();

const COOKIE_SECURE = process.env.NODE_ENV === 'production';

router.post('/refresh', async (req, res) => {
  const realmCookies = {
    employee: 'refresh_token',
    admin: 'admin_refresh_token',
    platform: 'platform_refresh_token',
  };
  const requestedRealm = realmCookies[req.body?.realm] ? req.body.realm : null;
  const rawToken = requestedRealm
    ? req.cookies?.[realmCookies[requestedRealm]]
    : req.cookies?.refresh_token || req.cookies?.admin_refresh_token || req.cookies?.platform_refresh_token;
  if (!rawToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const payload = await tokenService.verifyRefreshToken(rawToken);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
  if (requestedRealm && payload.userType !== requestedRealm) {
    res.clearCookie(realmCookies[requestedRealm], { path: '/' });
    return res.status(401).json({ error: 'Invalid refresh token for this session' });
  }

  if (payload.userType !== 'platform' && payload.tenantId && !(await isTenantActive(payload.tenantId))) {
    await tokenService.revokeRefreshToken(rawToken);
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('admin_refresh_token', { path: '/' });
    return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
  }

  // Refresh token rotation: revoke old token and issue a new one
  await tokenService.revokeRefreshToken(rawToken);

  let newAccessToken;
  let newRefreshToken;
  if (payload.userType === 'platform') {
    const [platformRows] = await pool.query(
      'SELECT id FROM admin_users WHERE id = ? AND is_active = 1 AND is_platform_admin = 1',
      [payload.userId]
    );
    if (platformRows.length === 0) {
      await tokenService.revokeRefreshToken(rawToken);
      res.clearCookie('platform_refresh_token', { path: '/' });
      return res.status(401).json({ error: 'Account is no longer active' });
    }
    newAccessToken = jwt.sign(
      { id: payload.userId, type: 'platform_admin', is_platform_admin: true },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'platform', algorithm: 'HS256' }
    );
    newRefreshToken = await tokenService.generateRefreshToken(payload.userId, 'platform', null);
  } else if (payload.userType === 'admin') {
    const [adminRows] = await pool.query(
      'SELECT id, tenant_id FROM admin_users WHERE id = ? AND is_active = 1 AND is_platform_admin = 0',
      [payload.userId]
    );
    let adminType = 'admin';
    let tenantId = payload.tenantId;
    if (adminRows.length === 0) {
      const [empRows] = await pool.query(
        "SELECT id, tenant_id FROM employees WHERE id = ? AND role = 'admin' AND is_active = 1",
        [payload.userId]
      );
      if (empRows.length === 0) {
        res.clearCookie('admin_refresh_token', { path: '/' });
        return res.status(401).json({ error: 'Account is no longer active' });
      }
      adminType = 'employee_admin';
      tenantId = empRows[0].tenant_id || tenantId;
    } else {
      tenantId = adminRows[0].tenant_id || tenantId;
    }
    if (!tenantId || !(await isTenantActive(tenantId))) {
      res.clearCookie('admin_refresh_token', { path: '/' });
      return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
    }
    newAccessToken = jwt.sign(
      { id: payload.userId, tenant_id: tenantId, type: adminType },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'admin', algorithm: 'HS256' }
    );
    newRefreshToken = await tokenService.generateRefreshToken(payload.userId, 'admin', tenantId);
  } else {
    const [empRows] = await pool.query(
      'SELECT id, tenant_id, role, is_active FROM employees WHERE id = ?',
      [payload.userId]
    );
    if (empRows.length === 0 || !empRows[0].is_active) {
      res.clearCookie('refresh_token', { path: '/' });
      return res.status(401).json({ error: 'Account is no longer active' });
    }
    const emp = empRows[0];
    const tenantId = emp.tenant_id || payload.tenantId || null;
    if (!tenantId || !(await isTenantActive(tenantId))) {
      res.clearCookie('refresh_token', { path: '/' });
      return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
    }
    newAccessToken = jwt.sign(
      {
        id: payload.userId,
        tenant_id: tenantId,
        ...(emp.role === 'admin' ? { type: 'employee_admin' } : {}),
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'employee', algorithm: 'HS256' }
    );
    newRefreshToken = await tokenService.generateRefreshToken(payload.userId, 'employee', tenantId);
  }

  const accessCookie = payload.userType === 'platform'
    ? 'platform_access_token'
    : payload.userType === 'admin'
      ? 'admin_access_token'
      : 'access_token';

  res.cookie(accessCookie, newAccessToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  // Set the appropriate refresh cookie based on user type
  if (payload.userType === 'platform') {
    res.cookie('platform_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  } else if (payload.userType === 'admin') {
    res.cookie('admin_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  } else {
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  res.json({ message: 'Token refreshed' });
});

module.exports = router;

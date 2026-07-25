const { Router } = require('express');
const jwt = require('jsonwebtoken');
const tokenService = require('../../shared/services/token.service');

const router = Router();

const COOKIE_SECURE = process.env.NODE_ENV === 'production';

router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refresh_token || req.cookies?.admin_refresh_token || req.cookies?.platform_refresh_token;
  if (!rawToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const payload = await tokenService.verifyRefreshToken(rawToken);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // Refresh token rotation: revoke old token and issue a new one
  await tokenService.revokeRefreshToken(rawToken);

  let newAccessToken;
  let newRefreshToken;
  if (payload.userType === 'platform') {
    newAccessToken = jwt.sign(
      { id: payload.userId, type: 'platform_admin', is_platform_admin: true },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'platform', algorithm: 'HS256' }
    );
    newRefreshToken = await tokenService.generateRefreshToken(payload.userId, 'platform', null);
  } else if (payload.userType === 'admin') {
    newAccessToken = jwt.sign(
      { id: payload.userId, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'admin', algorithm: 'HS256' }
    );
    newRefreshToken = await tokenService.generateRefreshToken(payload.userId, 'admin', payload.tenantId);
  } else {
    newAccessToken = jwt.sign(
      { id: payload.userId, type: payload.userType },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'employee', algorithm: 'HS256' }
    );
    newRefreshToken = await tokenService.generateRefreshToken(payload.userId, payload.userType, payload.tenantId);
  }

  res.cookie('access_token', newAccessToken, {
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
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  } else if (payload.userType === 'admin') {
    res.cookie('admin_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  } else {
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  res.json({ message: 'Token refreshed' });
});

module.exports = router;

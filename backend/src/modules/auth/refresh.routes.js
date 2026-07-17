const { Router } = require('express');
const jwt = require('jsonwebtoken');
const tokenService = require('../../shared/services/token.service');

const router = Router();

const COOKIE_SECURE = process.env.NODE_ENV === 'production';

router.post('/refresh', async (req, res) => {
  const rawToken = req.cookies?.refresh_token;
  if (!rawToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  const payload = await tokenService.verifyRefreshToken(rawToken);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  let newAccessToken;
  if (payload.userType === 'platform') {
    newAccessToken = jwt.sign(
      { id: payload.userId, type: 'platform_admin', is_platform_admin: true },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'platform' }
    );
  } else if (payload.userType === 'admin') {
    newAccessToken = jwt.sign(
      { id: payload.userId, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'admin' }
    );
  } else {
    newAccessToken = jwt.sign(
      { id: payload.userId, type: payload.userType },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'worktrack', audience: 'employee' }
    );
  }

  res.cookie('access_token', newAccessToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
    path: '/',
  });

  res.json({ access_token: newAccessToken });
});

module.exports = router;

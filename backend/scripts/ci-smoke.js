// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Dependency-free (DB-free) smoke checks used by CI to verify the app boots,
// security headers are applied, CSRF is enforced and logout stays reachable.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-smoke-only-secret-5f4c2a9e7b1d8f3a6c0e2b4d9a7f1c3e';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'ci_smoke';
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'ci-smoke-csrf-secret';

const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

function getCookie(res, name) {
  const cookies = res.headers['set-cookie'] || [];
  const match = cookies.find((c) => c.trim().startsWith(`${name}=`));
  return match ? match.split(';')[0] : null;
}

async function main() {
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'ok' });

  const csp = health.headers['content-security-policy'] || '';
  assert.ok(csp.includes("default-src 'self'"), 'CSP default-src missing');
  assert.ok(csp.includes('https://*.tile.openstreetmap.org'), 'CSP must allow OSM tiles');
  assert.ok(csp.includes('https://meet.jit.si'), 'CSP must allow Jitsi frames');
  assert.equal(health.headers['x-content-type-options'], 'nosniff');
  assert.equal(health.headers['x-frame-options'], 'DENY');

  const permissions = health.headers['permissions-policy'] || '';
  assert.ok(permissions.includes('geolocation=(self)'), 'Permissions-Policy must allow self geolocation');
  assert.ok(permissions.includes('camera=(self "https://meet.jit.si")'), 'Permissions-Policy must allow Jitsi camera');

  const me = await request(app).get('/api/auth/me');
  assert.equal(me.status, 401, 'unauthenticated /api/auth/me must return 401');

  const refreshMissing = await request(app).post('/api/auth/refresh').send({ realm: 'employee' });
  assert.equal(refreshMissing.status, 401, 'refresh without a token must return 401');

  const csrfMissing = await request(app).post('/api/attendance/sign-out').send({});
  assert.equal(csrfMissing.status, 403, 'state-changing request without CSRF token must be rejected');
  assert.equal(csrfMissing.body.error, 'CSRF token missing');

  const csrfCookie = getCookie(health, 'csrf_token');
  assert.ok(csrfCookie, 'safe request should issue a CSRF cookie');
  const csrfToken = csrfCookie.split('=')[1];

  const logout = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', csrfCookie)
    .set('X-CSRF-Token', csrfToken)
    .send({});
  assert.equal(logout.status, 200, 'logout must be reachable without an access token');
  assert.deepEqual(logout.body, { message: 'Logged out' });

  const logoutNoCsrf = await request(app).post('/api/auth/logout').send({});
  assert.equal(logoutNoCsrf.status, 403, 'logout must still require CSRF');

  console.log('CI smoke checks passed');
}

main().catch((err) => {
  console.error('CI smoke checks failed:', err);
  process.exit(1);
});

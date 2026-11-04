// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// DB-free checks for the platform permission gate. The pool is mocked so the
// suite asserts the authorization decisions without a running database.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-platform-permissions-secret-3f9a2c7d1e5b8a4c6d0f2e9b7a1c3d5e';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'ci_platform_permissions';

const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/shared/config/database');
const { requirePlatformPermission } = require('../src/shared/middleware/platform-permission.middleware');

function mockRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

function grant(rows) {
  mock.method(pool, 'query', async () => [rows, []]);
}

async function invoke(req) {
  const res = mockRes();
  let passed = false;
  await requirePlatformPermission('platform.crm.view')(req, res, () => { passed = true; });
  return { res, passed };
}

afterEach(() => mock.restoreAll());

test('rejects an unauthenticated caller', async () => {
  const { res, passed } = await invoke({});
  assert.equal(passed, false);
  assert.equal(res.statusCode, 401);
});

test('grants the owner role every permission', async () => {
  grant([{ role_name: 'owner', perm_key: null }]);
  const { res, passed } = await invoke({ platformAdmin: { id: 101 } });
  assert.equal(passed, true);
  assert.equal(res.statusCode, 200);
});

test('grants a role that holds the required permission', async () => {
  grant([
    { role_name: 'marketing', perm_key: 'platform.crm.view' },
    { role_name: 'marketing', perm_key: 'platform.tenants.view' },
  ]);
  const { passed } = await invoke({ platformAdmin: { id: 102 } });
  assert.equal(passed, true);
});

test('denies a role without the required permission', async () => {
  grant([{ role_name: 'tech', perm_key: 'platform.tenants.view' }]);
  const { res, passed } = await invoke({ platformAdmin: { id: 103 } });
  assert.equal(passed, false);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /platform\.crm\.view/);
});

test('fails closed when the permission lookup errors', async () => {
  mock.method(pool, 'query', async () => { throw new Error('db down'); });
  const { res, passed } = await invoke({ platformAdmin: { id: 104 } });
  assert.equal(passed, false);
  assert.equal(res.statusCode, 500);
});

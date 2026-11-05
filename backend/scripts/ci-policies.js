// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// DB-free checks for company policies: tenant scoping on every read/write,
// published-version immutability, and acknowledgement preconditions.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-policies-only-secret-4a7c1e9b2d6f8a3c5e0b7d9f1a2c4e6b';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'ci_policies';

const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/shared/config/database');
const policies = require('../src/modules/policies/policies.controller');

function mockRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

function installQueryMock(handler) {
  const calls = [];
  mock.method(pool, 'query', async (sql, params = []) => {
    calls.push({ sql, params });
    const rows = await handler(sql, params);
    return [rows || [], []];
  });
  return calls;
}

afterEach(() => mock.restoreAll());

test('employee policy list is scoped to the caller employee and tenant', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await policies.listMyPolicies(
    { tenantId: 7, employee: { id: 42 } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.match(calls[0].sql, /p\.tenant_id = \?/);
  assert.ok(calls[0].params.includes(42));
  assert.ok(calls[0].params.includes(7));
});

test('acknowledging a policy from another tenant resolves to 404', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await policies.acknowledgePolicy(
    { params: { id: '99' }, tenantId: 7, employee: { id: 42 }, ip: '1.2.3.4', get: () => 'ua' },
    res
  );

  assert.equal(res.statusCode, 404);
  assert.match(calls[0].sql, /p\.tenant_id = \?/);
  assert.deepEqual(calls[0].params, ['99', 7]);
});

test('acknowledging a policy that needs no acknowledgement is rejected', async () => {
  installQueryMock(() => [{ id: 5, title: 'Leave', version: 1, requires_ack: 0 }]);
  const res = mockRes();

  await policies.acknowledgePolicy(
    { params: { id: '5' }, tenantId: 7, employee: { id: 42 }, ip: '1.2.3.4', get: () => 'ua' },
    res
  );

  assert.equal(res.statusCode, 400);
});

test('acknowledgement writes tenant, policy version and employee together', async () => {
  const calls = installQueryMock((sql) => {
    if (sql.includes('SELECT accepted_at')) return [{ accepted_at: '2026-11-05 10:00:00' }];
    if (sql.includes('FROM tenant_policies p')) return [{ id: 5, title: 'Leave', version: 3, requires_ack: 1 }];
    return [];
  });
  const res = mockRes();

  await policies.acknowledgePolicy(
    { params: { id: '5' }, tenantId: 7, employee: { id: 42 }, ip: '1.2.3.4', get: () => 'ua' },
    res
  );

  assert.equal(res.statusCode, 200);
  const insert = calls.find((c) => c.sql.includes('INSERT IGNORE INTO policy_acknowledgements'));
  assert.ok(insert, 'expected an acknowledgement insert');
  assert.deepEqual(insert.params.slice(0, 4), [7, 5, 3, 42]);
});

test('published versions cannot be edited', async () => {
  installQueryMock(() => [{ id: 5, title: 'Leave', version: 1, is_published: 1 }]);
  const res = mockRes();

  await policies.updatePolicy(
    { params: { id: '5' }, tenantId: 7, body: { title: 'New title' }, admin: { id: 1, type: 'admin' } },
    res
  );

  assert.equal(res.statusCode, 409);
});

test('publishing retires the previous version of the same policy type', async () => {
  const connCalls = [];
  const conn = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params = []) => {
      connCalls.push({ sql, params });
      return [[], []];
    },
  };
  mock.method(pool, 'getConnection', async () => conn);
  installQueryMock((sql) => {
    if (sql.includes('FROM tenant_policies WHERE id = ? AND tenant_id = ?')) {
      return [{ id: 5, title: 'Leave', policy_type: 'leave', version: 2, is_published: 0 }];
    }
    if (sql.includes('SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?')) {
      return [{ id: 5, title: 'Leave', policy_type: 'leave', version: 2, is_published: 1 }];
    }
    return [];
  });
  const res = mockRes();

  await policies.publishPolicy(
    { params: { id: '5' }, tenantId: 7, body: {}, admin: { id: 1, type: 'admin' } },
    res
  );

  assert.equal(res.statusCode, 200);
  const retire = connCalls.find((c) => c.sql.includes('SET is_published = 0'));
  assert.ok(retire, 'expected previous version to be unpublished');
  assert.deepEqual(retire.params, [7, 'leave']);
  const publish = connCalls.find((c) => c.sql.includes('SET is_published = 1'));
  assert.ok(publish, 'expected the draft to be published');
  assert.deepEqual(publish.params.slice(1), ['5', 7]);
});

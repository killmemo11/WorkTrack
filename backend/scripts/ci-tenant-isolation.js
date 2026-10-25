// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// DB-free tenant-boundary checks. Each controller is exercised with a mocked
// pool so we can assert that tenant filters are part of the SQL and that a
// resource owned by another workspace resolves to 404.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-isolation-only-secret-6d1f4b8c2a5e7f9d3c0b6a8e4f2d1c7b';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'ci_isolation';

const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/shared/config/database');

const fs = require('node:fs');
const path = require('node:path');
const workflow = require('../src/modules/recruitment/workflow.controller');
const messageTemplates = require('../src/modules/recruitment/message-template.controller');
const phoneScreening = require('../src/modules/recruitment/phoneScreening.controller');
const personnel = require('../src/modules/personnel/personnel.controller');
const tasks = require('../src/modules/tasks/tasks.controller');

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

test('workflow templates are always read within the caller tenant', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await workflow.listTemplates({ tenantId: 7 }, res);

  assert.equal(res.statusCode, 200);
  assert.match(calls[0].sql, /wt\.tenant_id = \?/);
  assert.deepEqual(calls[0].params, [7]);
});

test('workflow template from another tenant resolves to 404', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await workflow.getTemplate({ params: { id: '99' }, tenantId: 7 }, res);

  assert.equal(res.statusCode, 404);
  assert.equal(calls[0].params[1], 7);
  assert.match(calls[0].sql, /tenant_id = \?/);
});

test('workflow update cannot touch another tenant template', async () => {
  const calls = installQueryMock((sql) => {
    if (sql.trim().startsWith('UPDATE')) return { affectedRows: 0 };
    return [];
  });
  const res = mockRes();

  await workflow.updateTemplate(
    { params: { id: '99' }, tenantId: 7, body: { name: 'Hijacked' }, admin: { id: 1 } },
    res
  );

  assert.equal(res.statusCode, 404);
  assert.match(calls[0].sql, /WHERE id = \? AND tenant_id = \?/);
  assert.deepEqual(calls[0].params, ['Hijacked', '99', 7]);

  // updateTemplate fires logActivity without awaiting it.
  await new Promise((resolve) => setImmediate(resolve));
});

test('message templates are listed per tenant', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await messageTemplates.listTemplates({ tenantId: 7, query: {} }, res);

  assert.equal(res.statusCode, 200);
  assert.match(calls[0].sql, /tenant_id = \?/);
  assert.deepEqual(calls[0].params, [7]);
});

test('phone screening templates are listed per tenant', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await phoneScreening.listTemplates({ tenantId: 7 }, res);

  assert.equal(res.statusCode, 200);
  assert.match(calls[0].sql, /tenant_id = \?/);
  assert.deepEqual(calls[0].params, [7]);
});

test('employee document lists filter by employee and tenant', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await personnel.getMyDocuments({ employee: { id: 42 }, tenantId: 7 }, res);

  assert.equal(res.statusCode, 200);
  assert.match(calls[0].sql, /employee_id = \? AND tenant_id = \?/);
  assert.deepEqual(calls[0].params, [42, 7]);
});

test('document preview is denied across tenants', async () => {
  const calls = installQueryMock(() => []);
  const res = mockRes();

  await personnel.getDocumentPreview(
    { params: { docId: '5' }, employee: { id: 42 }, tenantId: 7 },
    res
  );

  assert.equal(res.statusCode, 404);
  assert.deepEqual(calls[0].params, ['5', 42, 7]);
});

test('manager cannot read a task outside their department', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM tasks t')) return [{ id: 1, assigned_to: 99, assigned_by: 98, tenant_id: 7 }];
    return [];
  });
  const res = mockRes();

  await tasks.getTask(
    { params: { id: '1' }, tenantId: 7, employee: { id: 42, role: 'manager', department_id: 10 } },
    res
  );

  assert.equal(res.statusCode, 403);
});

test('manager can read a task assigned inside their department', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM tasks t')) return [{ id: 1, assigned_to: 99, assigned_by: 98, tenant_id: 7 }];
    if (sql.includes('FROM employees')) return [{ id: 99 }];
    return [];
  });
  const res = mockRes();

  await tasks.getTask(
    { params: { id: '1' }, tenantId: 7, employee: { id: 42, role: 'manager', department_id: 10 } },
    res
  );

  assert.equal(res.statusCode, 200);
});

test('attendance self-service resolves tenant context', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../src/modules/attendance/attendance.routes.js'),
    'utf8'
  );
  assert.match(source, /router\.use\(authenticate\);\s*router\.use\(resolveTenant\);/);
});

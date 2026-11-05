// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// DB-free checks for the tech, dev and billing consoles: audited impersonation,
// feature-flag resolution, sandbox guards and invoice maths.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-platform-ops-secret-5a7c9e1b3d6f8a0c2e4b6d8f0a1c3e5b';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'ci_platform_ops';

const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const pool = require('../src/shared/config/database');
const support = require('../src/modules/platform/support.controller');
const releases = require('../src/modules/platform/releases.controller');
const sandbox = require('../src/modules/platform/sandbox.controller');
const billing = require('../src/shared/services/billing.service');
const flags = require('../src/shared/services/feature-flags.service');

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    cookies: {},
    cleared: [],
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    cookie(name, value) { this.cookies[name] = value; return this; },
    clearCookie(name) { this.cleared.push(name); return this; },
  };
  return res;
}

function installQueryMock(handler) {
  const calls = [];
  mock.method(pool, 'query', async (sql, params = []) => {
    calls.push({ sql, params });
    const value = await handler(sql, params);
    return Array.isArray(value) ? [value, []] : [value ?? {}, []];
  });
  return calls;
}

afterEach(() => {
  mock.restoreAll();
  flags.clearFeatureCache();
});

test('impersonation issues a scoped admin token and audits the start', async () => {
  const calls = installQueryMock((sql) => {
    if (sql.includes('SELECT id, name, slug, status FROM tenants')) {
      return [{ id: 7, name: 'Acme', slug: 'acme', status: 'active' }];
    }
    if (sql.includes('SELECT id, username, email FROM admin_users')) {
      return [{ id: 42, username: 'acme_admin', email: 'owner@acme.test' }];
    }
    return [];
  });
  const res = mockRes();

  await support.impersonateTenant(
    { params: { id: '7' }, platformAdmin: { id: 900, username: 'tech_lead' } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.cleared, ['admin_access_token', 'admin_refresh_token']);
  const token = jwt.verify(res.cookies.admin_access_token, process.env.JWT_SECRET);
  assert.equal(token.id, 42);
  assert.equal(token.tenant_id, 7);
  assert.equal(token.type, 'admin');
  assert.equal(token.imp, 900);
  assert.ok(token.exp - token.iat <= 30 * 60, 'impersonation token must be short lived');

  const audit = calls.find((c) => c.sql.includes('INSERT INTO activity_log'));
  assert.match(audit.params[3], /impersonated tenant admin acme_admin/);
});

test('impersonation refuses an inactive workspace', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM tenants')) return [{ id: 7, name: 'Acme', slug: 'acme', status: 'suspended' }];
    return [];
  });
  const res = mockRes();

  await support.impersonateTenant(
    { params: { id: '7' }, platformAdmin: { id: 900, username: 'tech_lead' } },
    res
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.cookies.admin_access_token, undefined);
});

test('feature flags prefer a tenant override over the default', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM feature_flags f')) {
      return [
        { flag_key: 'billing.reminders', default_enabled: 1, override_enabled: 0 },
        { flag_key: 'billing.online_gateway', default_enabled: 0, override_enabled: null },
      ];
    }
    return [];
  });

  const values = await flags.getTenantFeatures(3);
  assert.equal(values['billing.reminders'], false);
  assert.equal(values['billing.online_gateway'], false);
  assert.equal(await flags.isFeatureEnabled(3, 'billing.reminders', true), false);
  assert.equal(await flags.isFeatureEnabled(3, 'unknown.flag', true), true);
});

test('tenant release update rejects an unknown channel', async () => {
  const res = mockRes();
  await releases.updateTenantRelease(
    { params: { id: '7' }, body: { release_channel: 'nightly' }, platformAdmin: { id: 900 } },
    res
  );
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /release_channel/);
});

test('tenant release update rejects unknown flags before writing', async () => {
  installQueryMock((sql) => {
    if (sql.includes('SELECT id, name, release_channel FROM tenants')) {
      return [{ id: 7, name: 'Acme', release_channel: 'stable' }];
    }
    if (sql.includes('SELECT flag_key FROM feature_flags')) {
      return [{ flag_key: 'billing.reminders' }];
    }
    return [];
  });
  const res = mockRes();

  await releases.updateTenantRelease(
    {
      params: { id: '7' },
      body: { flags: { 'billing.reminders': true, 'made.up': true } },
      platformAdmin: { id: 900 },
    },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /made\.up/);
});

test('billing periods cover whole months and whole years', () => {
  const monthly = billing.periodBounds('monthly', '2026-02-10');
  assert.equal(monthly.start, '2026-02-01');
  assert.equal(monthly.end, '2026-02-28');

  const yearly = billing.periodBounds('yearly', '2026-03-15');
  assert.equal(yearly.start, '2026-03-01');
  assert.equal(yearly.end, '2027-02-28');
});

test('invoice amount follows the pinned yearly price', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM tenants t') && sql.includes('plan_price_versions v')) {
      return [{
        id: 7, name: 'Acme', contact_email: 'owner@acme.test', plan: 'professional',
        status: 'active', is_sandbox: 0, plan_price_version_id: 55,
        price_monthly: '79.00', price_yearly: '790.00', currency: 'USD',
      }];
    }
    if (sql.includes('INSERT INTO tenant_invoices')) return { insertId: 300 };
    if (sql.includes('SELECT * FROM tenant_invoices WHERE id = ?')) {
      return [{ id: 300, tenant_id: 7, amount: '790.00', currency: 'USD', status: 'draft' }];
    }
    return [];
  });

  const invoice = await billing.createInvoice({ tenantId: 7, cycle: 'yearly', adminId: 900 });
  assert.equal(invoice.amount, '790.00');
  assert.equal(invoice.currency, 'USD');
});

test('sandbox tenants are never billed', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM tenants t') && sql.includes('plan_price_versions v')) {
      return [{
        id: 9, name: 'QA', contact_email: 'qa@test.dev', plan: 'trial',
        status: 'active', is_sandbox: 1, plan_price_version_id: 12,
        price_monthly: '10.00', price_yearly: '100.00', currency: 'USD',
      }];
    }
    return [];
  });

  await assert.rejects(
    () => billing.createInvoice({ tenantId: 9, cycle: 'monthly' }),
    (err) => err.statusCode === 400 && /Sandbox/.test(err.message)
  );
});

test('reminders respect the billing.reminders flag', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM tenant_invoices i JOIN tenants t')) {
      return [{
        id: 300, tenant_id: 7, status: 'sent', amount: '79.00', currency: 'USD',
        invoice_number: 'WT-202611-ABC123', period_start: '2026-11-01', period_end: '2026-11-30',
        due_date: '2026-11-10', tenant_name: 'Acme', contact_email: 'owner@acme.test', is_sandbox: 0,
      }];
    }
    if (sql.includes('FROM feature_flags f')) {
      return [{ flag_key: 'billing.reminders', default_enabled: 0, override_enabled: null }];
    }
    return [];
  });

  const result = await billing.sendReminder(300, 900);
  assert.deepEqual(result, { sent: false, reason: 'feature_disabled' });
});

test('sandbox reset only touches sandbox tenants', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM tenants WHERE id = ? AND is_sandbox = 1')) return [];
    return [];
  });
  const res = mockRes();

  await sandbox.resetSandbox({ params: { id: '4' }, platformAdmin: { id: 900 } }, res);

  assert.equal(res.statusCode, 404);
});

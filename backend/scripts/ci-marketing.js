// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// DB-free checks for the marketing console: CRM pipeline rules, plan price
// versioning, and the price snapshot recorded when a tenant is provisioned.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'ci-marketing-only-secret-6b2d9f4a1c7e3b5d8f0a2c4e6b8d1f3a';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'ci_marketing';

const { test, mock, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/shared/config/database');
const crm = require('../src/modules/platform/crm.controller');
const plans = require('../src/modules/platform/plans.controller');
const platform = require('../src/modules/platform/platform.controller');

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
    const value = await handler(sql, params);
    return Array.isArray(value) ? [value, []] : [value ?? {}, []];
  });
  return calls;
}

function installConnMock(handler) {
  const calls = [];
  const conn = {
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {},
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      const value = await handler(sql, params);
      return Array.isArray(value) ? [value, []] : [value ?? {}, []];
    },
  };
  mock.method(pool, 'getConnection', async () => conn);
  return calls;
}

afterEach(() => mock.restoreAll());

test('creating a contact normalizes the email and assigns the creator', async () => {
  installQueryMock((sql) => {
    if (sql.includes('SELECT id FROM platform_crm_contacts WHERE email = ?')) return [];
    if (sql.includes('FROM platform_crm_contacts c')) {
      return [{ id: 1, company_name: 'ACME', email: 'sales@acme.com', stage: 'lead', owner_admin_id: 5 }];
    }
    return [];
  });
  const connCalls = installConnMock((sql) => {
    if (sql.includes('INSERT INTO platform_crm_contacts')) return { insertId: 1 };
    return [];
  });
  const res = mockRes();

  await crm.createContact(
    { body: { company_name: 'ACME', email: 'Sales@ACME.com' }, platformAdmin: { id: 5 } },
    res
  );

  assert.equal(res.statusCode, 201);
  const insert = connCalls.find((c) => c.sql.includes('INSERT INTO platform_crm_contacts'));
  assert.ok(insert, 'expected a contact insert');
  assert.equal(insert.params[3], 'sales@acme.com');
  assert.equal(insert.params[9], 'lead');
  assert.equal(insert.params[10], 'manual');
  assert.equal(insert.params[11], 5);
});

test('a duplicate contact email is rejected with the existing id', async () => {
  installQueryMock((sql) => {
    if (sql.includes('SELECT id FROM platform_crm_contacts WHERE email = ?')) return [{ id: 9 }];
    return [];
  });
  const res = mockRes();

  await crm.createContact(
    { body: { company_name: 'ACME', email: 'sales@acme.com' }, platformAdmin: { id: 5 } },
    res
  );

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.contact_id, 9);
});

test('closing a deal clears the follow-up and writes a stage change', async () => {
  installQueryMock((sql) => {
    if (sql.includes('SELECT * FROM platform_crm_contacts WHERE id = ?')) {
      return [{ id: 3, company_name: 'ACME', email: 'sales@acme.com', stage: 'lead' }];
    }
    if (sql.includes('FROM platform_crm_contacts c')) return [{ id: 3, stage: 'won' }];
    return [];
  });
  const connCalls = installConnMock(() => []);
  const res = mockRes();

  await crm.updateContact(
    { params: { id: '3' }, body: { stage: 'won' }, platformAdmin: { id: 5 } },
    res
  );

  assert.equal(res.statusCode, 200);
  const update = connCalls.find((c) => c.sql.includes('UPDATE platform_crm_contacts'));
  assert.ok(update, 'expected the contact update');
  assert.match(update.sql, /next_follow_up_at = \?/);
  assert.deepEqual(update.params, ['won', null, 5, '3']);

  const activity = connCalls.find((c) => c.sql.includes('INSERT INTO platform_crm_activities'));
  assert.ok(activity, 'expected a stage change activity');
  assert.equal(activity.params[2], 'Stage: lead -> won');
});

test('contacts linked to a tenant cannot be deleted', async () => {
  installQueryMock(() => [{ id: 3, company_name: 'ACME', tenant_id: 11, tenant_request_id: null }]);
  const res = mockRes();

  await crm.deleteContact({ params: { id: '3' }, platformAdmin: { id: 5 } }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /linked/i);
});

test('an activity needs a subject or a body', async () => {
  installQueryMock(() => []);
  const res = mockRes();

  await crm.addActivity({ params: { id: '3' }, body: {}, platformAdmin: { id: 5 } }, res);

  assert.equal(res.statusCode, 400);
});

test('changing a plan price requires the manage-price permission', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM platform_user_roles')) {
      return [{ role_name: 'marketing', perm_key: 'platform.plans.manage' }];
    }
    if (sql.includes('SELECT * FROM subscription_plans WHERE id = ?')) {
      return [{ id: 1, name: 'Basic', slug: 'basic', price_monthly: '100.00', price_yearly: '1000.00', currency: 'EGP' }];
    }
    return [];
  });
  const res = mockRes();

  await plans.updatePlan(
    { params: { id: '1' }, body: { price_monthly: 150 }, platformAdmin: { id: 9001 } },
    res
  );

  assert.equal(res.statusCode, 403);
  assert.match(res.body.error, /manage_price/);
});

test('a price change appends a new plan price version', async () => {
  installQueryMock((sql) => {
    if (sql.includes('FROM platform_user_roles')) return [{ role_name: 'owner', perm_key: null }];
    if (sql.includes('SELECT * FROM subscription_plans WHERE id = ?')) {
      return [{ id: 1, name: 'Basic', slug: 'basic', price_monthly: '100.00', price_yearly: '1000.00', currency: 'EGP' }];
    }
    if (sql.includes('SELECT name FROM subscription_plans')) return [];
    return [];
  });
  const connCalls = installConnMock((sql) => {
    if (sql.includes('COALESCE(MAX(version)')) return [{ next_version: 2 }];
    return [];
  });
  const res = mockRes();

  await plans.updatePlan(
    { params: { id: '1' }, body: { price_monthly: 150 }, platformAdmin: { id: 9002 } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.price_version, 2);
  const versionInsert = connCalls.find((c) => c.sql.includes('INSERT INTO plan_price_versions'));
  assert.ok(versionInsert, 'expected a new price version');
  assert.deepEqual(versionInsert.params, ['1', 2, 150, '1000.00', 'EGP', null, 9002]);
});

test('a new plan starts at price version 1', async () => {
  installQueryMock((sql) => {
    if (sql.includes('SELECT id FROM subscription_plans WHERE slug = ?')) return [];
    if (sql.includes('SELECT * FROM subscription_plans WHERE id = ?')) return [{ id: 8, slug: 'starter' }];
    return [];
  });
  const connCalls = installConnMock((sql) => {
    if (sql.includes('INSERT INTO subscription_plans')) return { insertId: 8 };
    return [];
  });
  const res = mockRes();

  await plans.createPlan(
    { body: { name: 'Starter', slug: 'starter', price_monthly: 0 }, platformAdmin: { id: 9003 } },
    res
  );

  assert.equal(res.statusCode, 201);
  const versionInsert = connCalls.find((c) => c.sql.includes('INSERT INTO plan_price_versions'));
  assert.ok(versionInsert, 'expected the initial price version');
  assert.deepEqual(versionInsert.params, [8, 0, 0, 'USD', 'Initial price', 9003]);
});

test('approving a request pins the tenant price version and wins the lead', async () => {
  const request = {
    id: 1,
    company_name: 'Acme Ltd',
    contact_email: 'Owner@Acme.com',
    contact_phone: '01000000000',
    requested_plan: 'basic',
  };
  installQueryMock((sql) => {
    if (sql.includes('FROM tenant_requests WHERE id = ? AND status = "pending"')) return [request];
    if (sql.includes('FROM subscription_plans WHERE slug = ?')) {
      return [{ id: 3, slug: 'basic', max_employees: 100, trial_days: 14 }];
    }
    if (sql.includes('FROM plan_price_versions WHERE plan_id = ?')) return [{ id: 77 }];
    return [];
  });
  const connCalls = installConnMock((sql) => {
    if (sql.includes('INSERT INTO tenants')) return { insertId: 55 };
    if (sql.includes('INSERT INTO admin_users')) return { insertId: 66 };
    if (sql.includes('SELECT id, stage FROM platform_crm_contacts WHERE email = ?')) {
      return [{ id: 44, stage: 'lead' }];
    }
    return [];
  });
  const res = mockRes();

  await platform.approveTenantRequest(
    { params: { id: '1' }, body: { plan: 'basic' }, platformAdmin: { id: 5, email: 'ops@worktrack.test' } },
    res
  );

  assert.equal(res.statusCode, 200);
  const tenantInsert = connCalls.find((c) => c.sql.includes('INSERT INTO tenants'));
  assert.ok(tenantInsert, 'expected a tenant insert');
  assert.match(tenantInsert.sql, /plan_price_version_id/);
  assert.equal(tenantInsert.params[5], 77);

  const crmUpdate = connCalls.find((c) => c.sql.includes("stage = 'won'"));
  assert.ok(crmUpdate, 'expected the lead to be marked won');
  assert.deepEqual(crmUpdate.params, [55, '1', 5, 44]);
});

test('approving with an empty body defaults to the requested plan', async () => {
  const request = {
    id: 2,
    company_name: 'Beta LLC',
    contact_email: 'admin@beta.com',
    contact_phone: '01000000001',
    requested_plan: 'trial',
  };
  installQueryMock((sql) => {
    if (sql.includes('FROM tenant_requests WHERE id = ? AND status = "pending"')) return [request];
    if (sql.includes('FROM subscription_plans WHERE slug = ?')) {
      return [{ id: 1, slug: 'trial', max_employees: 25, trial_days: 14 }];
    }
    if (sql.includes('FROM plan_price_versions WHERE plan_id = ?')) return [{ id: 11 }];
    return [];
  });
  const connCalls = installConnMock((sql) => {
    if (sql.includes('INSERT INTO tenants')) return { insertId: 77 };
    if (sql.includes('INSERT INTO admin_users')) return { insertId: 88 };
    return [];
  });
  const res = mockRes();

  // The UI quick-approve sends {}; it must not be rejected by the body schema.
  await platform.approveTenantRequest(
    { params: { id: '2' }, body: {}, platformAdmin: { id: 5, email: 'ops@worktrack.test' } },
    res
  );

  assert.equal(res.statusCode, 200);
  const tenantInsert = connCalls.find((c) => c.sql.includes('INSERT INTO tenants'));
  assert.ok(tenantInsert, 'expected a tenant insert');
  assert.equal(tenantInsert.params[4], 'trial');
  assert.equal(tenantInsert.params[6], 25);
});

test('filtering tenant requests by status qualifies the column in both queries', async () => {
  const calls = installQueryMock((sql) => {
    if (sql.includes('SELECT COUNT(*)')) return [{ total: 1 }];
    if (sql.includes('FROM tenant_requests tr')) return [{ id: 1, company_name: 'Acme', status: 'pending' }];
    return [];
  });
  const res = mockRes();

  await platform.listTenantRequests({ query: { status: 'pending', page: '1', limit: '20' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.total, 1);
  const rowsQuery = calls.find((c) => c.sql.includes('LEFT JOIN tenants t'));
  const countQuery = calls.find((c) => c.sql.includes('SELECT COUNT(*)'));
  assert.ok(rowsQuery, 'expected the rows query');
  assert.ok(countQuery, 'expected the count query');
  // Both tenants and tenant_requests have a status column; the filter must be
  // qualified, and the count query needs the same alias for the clause to parse.
  assert.match(rowsQuery.sql, /tr\.status = \?/);
  assert.match(countQuery.sql, /FROM tenant_requests tr/);
  assert.match(countQuery.sql, /tr\.status = \?/);
  assert.deepEqual(rowsQuery.params, ['pending', 20, 0]);
  assert.deepEqual(countQuery.params, ['pending']);
});

test('moving a tenant to a price version pins it and records the change', async () => {
  const calls = installQueryMock((sql) => {
    if (sql.includes('SELECT id, name, plan, plan_price_version_id FROM tenants')) {
      return [{ id: 4, name: 'Acme', plan: 'basic', plan_price_version_id: 21 }];
    }
    if (sql.includes('FROM plan_price_versions v')) {
      return [{
        id: 22, version: 2, plan_slug: 'basic', plan_name: 'Basic',
        price_monthly: '39.00', price_yearly: '390.00', currency: 'USD',
      }];
    }
    if (sql.includes('SELECT * FROM tenants WHERE id = ?')) {
      return [{ id: 4, name: 'Acme', plan: 'basic', plan_price_version_id: 22 }];
    }
    return [];
  });
  const res = mockRes();

  await platform.updateTenantSubscription(
    { params: { id: '4' }, body: { plan: 'basic', plan_price_version_id: 22, note: 'Renewal' }, platformAdmin: { id: 5 } },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.subscription.price_version_id, 22);
  const update = calls.find((c) => c.sql.includes('UPDATE tenants SET plan = ?'));
  assert.deepEqual(update.params, ['basic', 22, '4']);
  const audit = calls.find((c) => c.sql.includes('INSERT INTO activity_log'));
  assert.match(audit.params[3], /basic -> basic \(price version 2/);
});

test('a price version from another plan is rejected', async () => {
  installQueryMock((sql) => {
    if (sql.includes('SELECT id, name, plan, plan_price_version_id FROM tenants')) {
      return [{ id: 4, name: 'Acme', plan: 'basic' }];
    }
    if (sql.includes('FROM plan_price_versions v')) {
      return [{ id: 31, version: 1, plan_slug: 'enterprise', plan_name: 'Enterprise' }];
    }
    return [];
  });
  const res = mockRes();

  await platform.updateTenantSubscription(
    { params: { id: '4' }, body: { plan: 'basic', plan_price_version_id: 31 }, platformAdmin: { id: 5 } },
    res
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /does not belong to this plan/);
});

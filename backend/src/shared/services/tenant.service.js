// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

const TENANT_INACTIVE_MESSAGE = 'This workspace is not active. Contact your administrator.';

async function getTenantOrNull(tenantId) {
  if (!tenantId) return null;
  const [rows] = await pool.query(
    'SELECT id, name, plan, status, trial_ends_at, max_employees FROM tenants WHERE id = ? AND deleted_at IS NULL',
    [tenantId]
  );
  return rows[0] || null;
}

// A trial workspace stops being usable at the end of its trial_ends_at day,
// even before the daily suspension job persists the status change.
function isTrialExpired(tenant) {
  if (!tenant || tenant.plan !== 'trial' || !tenant.trial_ends_at) return false;
  const end = new Date(tenant.trial_ends_at);
  if (Number.isNaN(end.getTime())) return false;
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

function isTenantUsable(tenant) {
  return !!tenant && tenant.status === 'active' && !isTrialExpired(tenant);
}

async function isTenantActive(tenantId) {
  return isTenantUsable(await getTenantOrNull(tenantId));
}

async function checkEmployeeQuota(tenantId, { includePending = false } = {}) {
  const [[tenant]] = await pool.query(
    'SELECT max_employees FROM tenants WHERE id = ? AND deleted_at IS NULL',
    [tenantId]
  );
  if (!tenant) return { allowed: false, reason: 'not_found', limit: 0, used: 0, remaining: 0 };

  const [[employeeRow]] = await pool.query(
    'SELECT COUNT(*) AS count FROM employees WHERE tenant_id = ? AND (is_system IS NULL OR is_system = 0)',
    [tenantId]
  );
  let used = Number(employeeRow.count);

  if (includePending) {
    const [[pendingRow]] = await pool.query(
      'SELECT COUNT(*) AS count FROM pending_registrations WHERE tenant_id = ? AND verification_expires > NOW()',
      [tenantId]
    );
    used += Number(pendingRow.count);
  }

  const limit = Number(tenant.max_employees);
  const unlimited = !Number.isFinite(limit) || limit <= 0;
  return {
    allowed: unlimited || used < limit,
    limit: unlimited ? null : limit,
    used,
    remaining: unlimited ? null : Math.max(0, limit - used),
  };
}

// Public (unauthenticated) requests carry no JWT. Resolve the workspace from
// ?tenant=<slug> or the request hostname, falling back to the original tenant.
// An explicit inactive/unknown slug must not silently fall back to tenant 1.
async function resolvePublicTenantId(req) {
  const slug = req.query?.tenant;
  if (slug) {
    const [rows] = await pool.query(
      "SELECT id FROM tenants WHERE slug = ? AND status = 'active' AND deleted_at IS NULL",
      [slug]
    );
    return rows.length > 0 ? rows[0].id : null;
  }
  const host = (req.hostname || '').toLowerCase();
  if (host) {
    const [rows] = await pool.query(
      "SELECT id FROM tenants WHERE domain = ? AND status = 'active' AND deleted_at IS NULL",
      [host]
    );
    if (rows.length > 0) return rows[0].id;
  }
  return 1;
}

module.exports = {
  getTenantOrNull,
  isTenantUsable,
  isTrialExpired,
  isTenantActive,
  checkEmployeeQuota,
  resolvePublicTenantId,
  TENANT_INACTIVE_MESSAGE,
};

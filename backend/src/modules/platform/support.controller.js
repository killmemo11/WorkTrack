// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

const IMPERSONATION_TTL_SECONDS = 30 * 60;

async function getTenantDiagnostics(req, res) {
  const { id } = req.params;

  const [tenants] = await pool.query(
    `SELECT t.id, t.name, t.slug, t.status, t.plan, t.plan_price_version_id, t.max_employees,
            t.trial_ends_at, t.created_at, t.contact_email, t.contact_phone,
            v.version AS price_version, v.price_monthly, v.price_yearly, v.currency AS price_currency,
            sp.name AS plan_name
     FROM tenants t
     LEFT JOIN plan_price_versions v ON v.id = t.plan_price_version_id
     LEFT JOIN subscription_plans sp ON sp.slug = t.plan
     WHERE t.id = ? AND t.deleted_at IS NULL`,
    [id]
  );
  if (tenants.length === 0) return res.status(404).json({ error: 'Tenant not found' });
  const tenant = tenants[0];

  const [admins] = await pool.query(
    `SELECT id, username, email, is_active, must_change_password, created_at
     FROM admin_users WHERE tenant_id = ? AND is_platform_admin = 0 ORDER BY id`,
    [id]
  );

  const [[counts]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM employees WHERE tenant_id = ?) AS employees,
       (SELECT COUNT(*) FROM employees WHERE tenant_id = ? AND is_active = 1) AS active_employees,
       (SELECT COUNT(*) FROM departments WHERE tenant_id = ?) AS departments,
       (SELECT COUNT(*) FROM leave_requests WHERE tenant_id = ? AND status = 'pending') AS pending_leaves,
       (SELECT COUNT(*) FROM attendance_records WHERE tenant_id = ? AND date = CURDATE()) AS signins_today,
       (SELECT COUNT(*) FROM tenant_policies WHERE tenant_id = ? AND is_published = 1) AS published_policies`,
    [id, id, id, id, id, id]
  );

  const [services] = await pool.query(
    'SELECT service_key, is_enabled FROM service_toggles WHERE tenant_id = ? ORDER BY service_key',
    [id]
  );

  const [recentActivity] = await pool.query(
    `SELECT id, action, description, created_at
     FROM activity_log WHERE tenant_id = ? ORDER BY id DESC LIMIT 12`,
    [id]
  );

  const warnings = [];
  if (!tenant.plan_price_version_id) warnings.push('Tenant has no pinned price version');
  if (!admins.some((a) => a.is_active)) warnings.push('No active tenant admin can sign in');
  if (admins.some((a) => a.must_change_password)) warnings.push('A tenant admin must change their password');
  if (tenant.status !== 'active') warnings.push(`Workspace is ${tenant.status}`);

  res.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.plan,
      plan_name: tenant.plan_name,
      max_employees: tenant.max_employees,
      trial_ends_at: tenant.trial_ends_at,
      created_at: tenant.created_at,
      contact_email: tenant.contact_email,
      contact_phone: tenant.contact_phone,
    },
    subscription: tenant.plan_price_version_id
      ? {
          price_version_id: tenant.plan_price_version_id,
          price_version: tenant.price_version,
          price_monthly: tenant.price_monthly,
          price_yearly: tenant.price_yearly,
          currency: tenant.price_currency,
        }
      : null,
    admins,
    counts,
    services,
    recent_activity: recentActivity,
    warnings,
  });
}

async function impersonateTenant(req, res) {
  const { id } = req.params;

  const [tenants] = await pool.query(
    'SELECT id, name, slug, status FROM tenants WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (tenants.length === 0) return res.status(404).json({ error: 'Tenant not found' });
  const tenant = tenants[0];
  if (tenant.status !== 'active') {
    return res.status(409).json({ error: 'Only an active workspace can be impersonated' });
  }

  const [admins] = await pool.query(
    `SELECT id, username, email FROM admin_users
     WHERE tenant_id = ? AND is_platform_admin = 0 AND is_active = 1
     ORDER BY id LIMIT 1`,
    [id]
  );
  if (admins.length === 0) {
    return res.status(409).json({ error: 'No active tenant admin to impersonate' });
  }
  const admin = admins[0];

  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      role: 'admin',
      tenant_id: tenant.id,
      type: 'admin',
      imp: req.platformAdmin.id,
      imp_name: req.platformAdmin.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: IMPERSONATION_TTL_SECONDS, issuer: 'worktrack', audience: 'admin', algorithm: 'HS256' }
  );

  // Platform cookies stay intact so the operator can end the session at any
  // time; only the tenant realm cookies are replaced. No refresh token is
  // issued, so the session cannot outlive its TTL.
  res.clearCookie('admin_access_token', { path: '/' });
  res.clearCookie('admin_refresh_token', { path: '/' });
  res.cookie('admin_access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: IMPERSONATION_TTL_SECONDS * 1000,
    path: '/',
  });

  await logActivity(
    null,
    req.platformAdmin.id,
    'platform_impersonation_started',
    `Platform admin ${req.platformAdmin.username} impersonated tenant admin ${admin.username} (tenant ${tenant.id} - ${tenant.name})`,
    { tenant_id: tenant.id }
  );

  res.json({
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status },
    admin: { id: admin.id, username: admin.username },
    expires_in: IMPERSONATION_TTL_SECONDS,
    redirect: '/admin/settings',
  });
}

async function stopImpersonation(req, res) {
  const platformAdmin = req.platformAdmin;

  res.clearCookie('admin_access_token', { path: '/' });
  res.clearCookie('admin_refresh_token', { path: '/' });

  await logActivity(
    null,
    platformAdmin.id,
    'platform_impersonation_stopped',
    `Platform admin ${platformAdmin.username} ended an impersonation session`,
    null
  );

  res.json({ message: 'Impersonation ended', redirect: '/platform/support' });
}

module.exports = { getTenantDiagnostics, impersonateTenant, stopImpersonation };

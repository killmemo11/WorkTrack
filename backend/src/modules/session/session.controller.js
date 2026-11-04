// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../../shared/config/database');
const { getUserPermissions } = require('../../shared/middleware/rbac.middleware');
const { getPlatformAccess } = require('../../shared/middleware/platform-permission.middleware');

const TOKEN_COOKIES = ['platform_access_token', 'admin_access_token', 'access_token'];

function readToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  for (const name of TOKEN_COOKIES) {
    if (req.cookies && req.cookies[name]) return req.cookies[name];
  }
  return null;
}

function tenantFromRow(row) {
  return {
    id: row.tenant_id,
    name: row.tenant_name,
    slug: row.tenant_slug,
    plan: row.tenant_plan,
    status: row.tenant_status,
    trial_ends_at: row.trial_ends_at,
    max_employees: row.max_employees,
  };
}

async function loadServices(tenantId) {
  const [rows] = await pool.query(
    'SELECT service_key, is_enabled FROM service_toggles WHERE tenant_id = ?',
    [tenantId]
  );
  const services = {};
  for (const row of rows) services[row.service_key] = row.is_enabled === 1;
  return services;
}

async function loadTenantRoleNames(userId, userType, tenantId) {
  const [rows] = await pool.query(
    `SELECT r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND ur.user_type = ? AND r.tenant_id = ?`,
    [userId, userType, tenantId]
  );
  return rows.map((row) => row.name);
}

function employeeLanding(employee) {
  if (employee.role === 'admin') return '/admin/settings';
  if (employee.role === 'ceo') return '/ceo';
  if (employee.role === 'manager') return '/manager/approvals';
  const department = (employee.department_name || '').toLowerCase().replace(/\s+/g, ' ');
  if (department === 'hr' || department === 'human resources') return '/hr/hr-settings';
  return '/dashboard';
}

function platformConsole(roles) {
  if (roles.has('owner')) return 'owner';
  if (roles.has('marketing')) return 'marketing';
  if (roles.has('tech')) return 'tech';
  if (roles.has('dev')) return 'dev';
  return null;
}

async function getSessionContext(req, res) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  res.set('Cache-Control', 'no-store');

  if (decoded.type === 'platform_admin') {
    const [rows] = await pool.query(
      'SELECT id, username, email, is_active FROM admin_users WHERE id = ? AND is_platform_admin = 1',
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Platform account not found' });
    }
    if (rows[0].is_active === 0) {
      return res.status(403).json({ error: 'Account deactivated', code: 'ACCOUNT_DISABLED' });
    }

    const access = await getPlatformAccess(rows[0].id);
    return res.json({
      identity: {
        id: rows[0].id,
        type: 'platform_admin',
        username: rows[0].username,
        email: rows[0].email,
        name: rows[0].username,
      },
      tenant: null,
      role: platformConsole(access.roles),
      roles: [...access.roles],
      permissions: [...access.permissions],
      services: {},
      landing: '/platform',
      access: { blocked: false, reason: null },
    });
  }

  if (decoded.type === 'admin') {
    const [rows] = await pool.query(
      `SELECT au.id, au.username, au.email, au.tenant_id, au.is_active, au.must_change_password,
              t.name AS tenant_name, t.slug AS tenant_slug, t.plan AS tenant_plan,
              t.status AS tenant_status, t.trial_ends_at, t.max_employees
       FROM admin_users au
       LEFT JOIN tenants t ON t.id = au.tenant_id AND t.deleted_at IS NULL
       WHERE au.id = ? AND au.is_platform_admin = 0`,
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Admin account not found' });
    }
    const admin = rows[0];
    if (admin.is_active === 0) {
      return res.status(403).json({ error: 'Account deactivated', code: 'ACCOUNT_DISABLED' });
    }
    if (!admin.tenant_id || !admin.tenant_status) {
      return res.status(403).json({ error: 'Workspace not found' });
    }
    if (decoded.tenant_id && decoded.tenant_id !== admin.tenant_id) {
      return res.status(403).json({ error: 'Token tenant mismatch' });
    }

    const [permissions, roles, services] = await Promise.all([
      getUserPermissions(admin.id, 'admin', admin.tenant_id),
      loadTenantRoleNames(admin.id, 'admin', admin.tenant_id),
      loadServices(admin.tenant_id),
    ]);

    const blocked = admin.tenant_status !== 'active';
    return res.json({
      identity: {
        id: admin.id,
        type: 'admin',
        username: admin.username,
        email: admin.email,
        name: admin.username,
      },
      tenant: tenantFromRow(admin),
      role: 'admin',
      roles,
      permissions: [...permissions],
      services,
      landing: admin.must_change_password ? '/admin/change-password' : '/admin/settings',
      access: { blocked, reason: blocked ? 'TENANT_INACTIVE' : null },
    });
  }

  const [rows] = await pool.query(
    `SELECT e.id, e.name, e.email, e.username, e.role, e.is_active, e.tenant_id,
            d.name AS department_name,
            t.name AS tenant_name, t.slug AS tenant_slug, t.plan AS tenant_plan,
            t.status AS tenant_status, t.trial_ends_at, t.max_employees
     FROM employees e
     JOIN tenants t ON t.id = e.tenant_id AND t.deleted_at IS NULL
     LEFT JOIN departments d ON d.id = e.department_id AND d.tenant_id = e.tenant_id
     WHERE e.id = ?`,
    [decoded.id]
  );
  if (rows.length === 0) {
    return res.status(401).json({ error: 'Account not found' });
  }
  const employee = rows[0];
  if (employee.is_active === 0) {
    return res.status(403).json({ error: 'Account deactivated', code: 'ACCOUNT_DISABLED' });
  }
  if (decoded.tenant_id && decoded.tenant_id !== employee.tenant_id) {
    return res.status(403).json({ error: 'Token tenant mismatch' });
  }

  const [permissions, roles, services] = await Promise.all([
    getUserPermissions(employee.id, 'employee', employee.tenant_id),
    loadTenantRoleNames(employee.id, 'employee', employee.tenant_id),
    loadServices(employee.tenant_id),
  ]);

  const blocked = employee.tenant_status !== 'active';
  return res.json({
    identity: {
      id: employee.id,
      type: 'employee',
      username: employee.username,
      email: employee.email,
      name: employee.name,
    },
    tenant: tenantFromRow(employee),
    role: employee.role,
    roles,
    permissions: [...permissions],
    services,
    landing: employeeLanding(employee),
    access: { blocked, reason: blocked ? 'TENANT_INACTIVE' : null },
  });
}

module.exports = { getSessionContext };

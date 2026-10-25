const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { TENANT_INACTIVE_MESSAGE } = require('../services/tenant.service');
const JWT_VERIFY_OPTIONS = { algorithms: ['HS256'] };

// Strict IT-admin gate — accepts admin_users tokens ("type":"admin") OR
// employees tokens where employees.role === 'admin'. This is the LEGACY
// "IT Admin employee" semantics retained by all callers that rely on
// role='admin' employees being authorized here.
const requireITAuth = async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && (req.cookies.access_token || req.cookies.admin_access_token)) {
    token = req.cookies.access_token || req.cookies.admin_access_token;
  }
  if (!token) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS);

    if (decoded.type === 'platform_admin') {
      return res.status(403).json({ error: 'Employee or tenant-admin token required' });
    }

    if (decoded.type === 'admin') {
      const [rows] = await pool.query(
        `SELECT au.id, au.tenant_id, au.is_active, au.is_platform_admin, au.must_change_password,
                t.status AS tenant_status
         FROM admin_users au
         LEFT JOIN tenants t ON au.tenant_id = t.id AND t.deleted_at IS NULL
         WHERE au.id = ?`,
        [decoded.id]
      );
      if (rows.length > 0) {
        if (rows[0].is_platform_admin === 1) return res.status(403).json({ error: 'Employee or tenant-admin token required' });
        if (rows[0].is_active === 0) return res.status(403).json({ error: 'IT admin account is deactivated' });
        if (rows[0].tenant_id && rows[0].tenant_status !== 'active') {
          return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
        }
        req.admin = { ...decoded, tenant_id: rows[0].tenant_id, must_change_password: rows[0].must_change_password === 1 };
        return next();
      }
      // No admin_users row: this is an employee-admin token issued to employees.role='admin'.
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.email, e.username, e.role, e.is_active, e.tenant_id, t.status AS tenant_status
       FROM employees e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE e.id = ? AND t.deleted_at IS NULL`,
      [decoded.id]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    if (rows[0].tenant_status !== 'active') return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    if (rows[0].role !== 'admin') return res.status(403).json({ error: 'Admin access required' });

    req.admin = { id: rows[0].id, name: rows[0].name, username: rows[0].username, role: rows[0].role, type: 'employee_admin', tenant_id: rows[0].tenant_id, must_change_password: false };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

// Looser variant: same authN + is_active + tenant resolution as requireITAuth,
// but DROPS the hardcoded `role !== 'admin'` check on the employee branch.
// Fine-grained authorization moves to requirePermission() per route.
// Used by /api/it and /api/audit (Phase 3 + 4). Legacy callers keep strict requireITAuth.
const requireAnyActiveToken = async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && (req.cookies.access_token || req.cookies.admin_access_token)) {
    token = req.cookies.access_token || req.cookies.admin_access_token;
  }
  if (!token) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, JWT_VERIFY_OPTIONS);

    if (decoded.type === 'platform_admin') {
      return res.status(403).json({ error: 'Employee or tenant-admin token required' });
    }

    if (decoded.type === 'admin') {
      const [rows] = await pool.query(
        `SELECT au.id, au.tenant_id, au.is_active, au.is_platform_admin, au.must_change_password,
                t.status AS tenant_status
         FROM admin_users au
         LEFT JOIN tenants t ON au.tenant_id = t.id AND t.deleted_at IS NULL
         WHERE au.id = ?`,
        [decoded.id]
      );
      if (rows.length > 0) {
        if (rows[0].is_platform_admin === 1) return res.status(403).json({ error: 'Employee or tenant-admin token required' });
        if (rows[0].is_active === 0) return res.status(403).json({ error: 'Account is deactivated' });
        if (rows[0].tenant_id && rows[0].tenant_status !== 'active') {
          return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
        }
        req.admin = { ...decoded, tenant_id: rows[0].tenant_id, must_change_password: rows[0].must_change_password === 1 };
        return next();
      }
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.email, e.username, e.role, e.is_active, e.tenant_id, t.status AS tenant_status
       FROM employees e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE e.id = ? AND t.deleted_at IS NULL`,
      [decoded.id]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    if (rows[0].tenant_status !== 'active') return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    // NOTE: no role gate. Authorization deferred to per-route requirePermission().

    req.admin = { id: rows[0].id, name: rows[0].name, username: rows[0].username, role: rows[0].role, type: 'employee_admin', tenant_id: rows[0].tenant_id, must_change_password: false };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

module.exports = { requireITAuth, requireAnyActiveToken };

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { TENANT_INACTIVE_MESSAGE } = require('../services/tenant.service');
const { requirePasswordChangeGate } = require('./password-gate.middleware');

const requireHR = async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && (req.cookies.access_token || req.cookies.admin_access_token)) {
    token = req.cookies.access_token || req.cookies.admin_access_token;
  }
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    if (decoded.type === 'platform_admin') {
      return res.status(403).json({ error: 'Employee or tenant-admin token required' });
    }

    if (decoded.type === 'admin') {
      const [admins] = await pool.query(
        `SELECT au.id, au.username, au.tenant_id, au.is_active, au.must_change_password, t.status AS tenant_status
         FROM admin_users au
         JOIN tenants t ON au.tenant_id = t.id
         WHERE au.id = ? AND t.deleted_at IS NULL`,
        [decoded.id]
      );
      if (admins.length > 0) {
        if (admins[0].is_active === 0) return res.status(403).json({ error: 'Account is deactivated' });
        if (admins[0].tenant_status !== 'active') {
          return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
        }
        req.admin = {
          ...admins[0],
          must_change_password: admins[0].must_change_password === 1,
        };
        req.hr = admins[0];
        req.tenantId = admins[0].tenant_id;
        return requirePasswordChangeGate(req, res, next);
      }
    }

    const [rows] = await pool.query(
      `SELECT e.id, e.name, e.email, e.department_id, e.role, e.is_active, e.is_verified, e.tenant_id,
              d.name AS department_name, t.status AS tenant_status
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       JOIN tenants t ON e.tenant_id = t.id
       WHERE e.id = ? AND t.deleted_at IS NULL`,
      [decoded.id]
    );

    if (rows.length === 0) return res.status(401).json({ error: 'Account not found' });
    if (rows[0].tenant_status !== 'active') {
      return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
    }
    if ((decoded.type === 'admin' || decoded.type === 'employee_admin') && rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'HR access required' });
    }
    if (decoded.tenant_id && rows[0].tenant_id !== decoded.tenant_id) {
      return res.status(403).json({ error: 'Token tenant mismatch' });
    }
    if (!rows[0].is_active) return res.status(403).json({ error: 'Account is deactivated' });
    if (!rows[0].is_verified) return res.status(403).json({ error: 'Email not verified' });

    const emp = rows[0];
    const dept = (emp.department_name || '').toLowerCase().replace(/\s+/g, ' ');
    const isHR = dept === 'hr' || dept === 'human resources' || emp.role === 'admin';

    if (!isHR) {
      return res.status(403).json({ error: 'HR access required' });
    }

    req.employee = emp;
    req.hr = emp;
    req.tenantId = emp.tenant_id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { requireHR };

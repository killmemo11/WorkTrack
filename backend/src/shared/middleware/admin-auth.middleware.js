// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { TENANT_INACTIVE_MESSAGE } = require('../services/tenant.service');

const requireAdminAuth = async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && (req.cookies.admin_access_token || req.cookies.access_token)) {
    token = req.cookies.admin_access_token || req.cookies.access_token;
  }
  if (!token) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Employee-admin tokens are issued to employees.role='admin'. Use a distinct
    // type so their id can never be matched against an unrelated admin_users row.
    if (decoded.type === 'employee_admin') {
      const [rows] = await pool.query(
        `SELECT e.id, e.name, e.username, e.email, e.role, e.department_id, e.is_active, e.tenant_id,
                t.status AS tenant_status
         FROM employees e
         JOIN tenants t ON e.tenant_id = t.id
         WHERE e.id = ? AND e.role = 'admin' AND t.deleted_at IS NULL`,
        [decoded.id]
      );
      if (rows.length === 0) return res.status(401).json({ error: 'Admin account not found' });
      if (!rows[0].is_active) return res.status(403).json({ error: 'Admin account is deactivated' });
      if (rows[0].tenant_status !== 'active') return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
      req.admin = { ...decoded, ...rows[0], type: 'employee_admin', is_platform_admin: false };
      return next();
    }

    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Admin token required' });
    }

    const [rows] = await pool.query(
      `SELECT au.id, au.tenant_id, au.is_active, au.is_platform_admin, t.status AS tenant_status
       FROM admin_users au
       LEFT JOIN tenants t ON au.tenant_id = t.id AND t.deleted_at IS NULL
       WHERE au.id = ?`,
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Admin account not found' });
    }
    if (rows[0].is_active === 0) {
      return res.status(403).json({ error: 'Admin account is deactivated' });
    }
    if (rows[0].tenant_id && rows[0].tenant_status !== 'active') {
      return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
    }
    req.admin = { ...decoded, tenant_id: rows[0].tenant_id, is_platform_admin: rows[0].is_platform_admin === 1 };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

module.exports = { requireAdminAuth };

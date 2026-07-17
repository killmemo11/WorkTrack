// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const requireAdminAuth = async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  if (!token) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Admin token required' });
    }
    // Check admin_users first, then fall back to employees with role='admin'
    let [rows] = await pool.query('SELECT id, tenant_id, is_active, is_platform_admin FROM admin_users WHERE id = ?', [decoded.id]);
    if (rows.length === 0) {
      [rows] = await pool.query("SELECT id, department_id, role FROM employees WHERE id = ? AND role = 'admin'", [decoded.id]);
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Admin account not found' });
      }
      req.admin = { ...decoded, tenant_id: decoded.tenant_id || null, is_platform_admin: false };
      return next();
    }
    if (rows[0].is_active === 0) {
      return res.status(403).json({ error: 'Admin account is deactivated' });
    }
    req.admin = { ...decoded, tenant_id: rows[0].tenant_id, is_platform_admin: rows[0].is_platform_admin === 1 };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid admin token' });
  }
};

module.exports = { requireAdminAuth };

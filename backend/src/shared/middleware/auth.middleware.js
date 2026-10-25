// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { TENANT_INACTIVE_MESSAGE } = require('../services/tenant.service');

const authenticate = async (req, res, next) => {
  let token;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.type === 'admin' || decoded.type === 'platform_admin') {
      return res.status(403).json({ error: 'Admin token cannot access employee endpoints' });
    }
    const [rows] = await pool.query(
      `SELECT e.*, t.status AS tenant_status
       FROM employees e
       JOIN tenants t ON e.tenant_id = t.id
       WHERE e.id = ? AND t.deleted_at IS NULL`,
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Employee not found' });
    }
    if (rows[0].tenant_status !== 'active') {
      return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });
    }
    if (!rows[0].is_active) {
      return res.status(403).json({ error: 'Account deactivated. Contact admin.' });
    }
    if (decoded.tenant_id && rows[0].tenant_id !== decoded.tenant_id) {
      return res.status(403).json({ error: 'Token tenant mismatch' });
    }
    if (rows[0].employment_status === 'resigned' && rows[0].resignation_date) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const resDate = new Date(rows[0].resignation_date);
      if (today > resDate) {
        req.readOnly = true;
      }
    }
    req.employee = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticate };

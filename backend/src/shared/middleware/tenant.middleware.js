// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Resolve tenant_id from the authenticated user's token
// Attaches req.tenantId for all downstream middleware/controllers
const resolveTenant = async (req, res, next) => {
  try {
    // Priority 1: Platform admin (no tenant context — accesses all tenants)
    if (req.platformAdmin) {
      req.tenantId = req.body?.tenant_id || req.query?.tenant_id || null;
      return next();
    }

    // Priority 2: admin_users (tenant admins / IT admins)
    if (req.admin && req.admin.type === 'admin') {
      const [rows] = await pool.query(
        'SELECT tenant_id, is_platform_admin FROM admin_users WHERE id = ?',
        [req.admin.id]
      );
      if (rows.length > 0) {
        if (rows[0].is_platform_admin === 1) {
          req.tenantId = req.body?.tenant_id || req.query?.tenant_id || null;
        } else {
          req.tenantId = rows[0].tenant_id || 1;
        }
      } else {
        req.tenantId = 1;
      }
      return next();
    }

    // Priority 2.5: employee-admin (it-auth sets req.admin with type: 'employee_admin')
    if (req.admin && req.admin.type !== 'admin') {
      req.tenantId = req.admin.tenant_id || 1;
      return next();
    }

    // Priority 3: employee (HR, manager, CEO, regular employee)
    if (req.employee || req.hr) {
      const empId = req.employee?.id || req.hr?.id;
      const [rows] = await pool.query(
        'SELECT tenant_id FROM employees WHERE id = ?',
        [empId]
      );
      if (rows.length > 0) {
        req.tenantId = rows[0].tenant_id || 1;
      } else {
        req.tenantId = 1;
      }
      return next();
    }

    // Default fallback
    req.tenantId = 1;
    next();
  } catch (err) {
    console.error('resolveTenant error:', err);
    req.tenantId = 1;
    next();
  }
};

module.exports = { resolveTenant };
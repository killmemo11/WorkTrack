// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

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
        } else if (rows[0].tenant_id) {
          req.tenantId = rows[0].tenant_id;
        } else {
          return res.status(403).json({ error: 'Admin account has no tenant assigned' });
        }
      } else {
        return res.status(401).json({ error: 'Admin account not found' });
      }
      return next();
    }

    // Priority 2.5: employee-admin (it-auth sets req.admin with type: 'employee_admin')
    if (req.admin && req.admin.type !== 'admin') {
      if (req.admin.tenant_id) {
        req.tenantId = req.admin.tenant_id;
      } else {
        return res.status(403).json({ error: 'Employee-admin has no tenant assigned' });
      }
      return next();
    }

    // Priority 3: employee (HR, manager, CEO, regular employee)
    if (req.employee || req.hr) {
      const empId = req.employee?.id || req.hr?.id;
      const [rows] = await pool.query(
        'SELECT tenant_id FROM employees WHERE id = ?',
        [empId]
      );
      if (rows.length > 0 && rows[0].tenant_id) {
        req.tenantId = rows[0].tenant_id;
      } else {
        return res.status(403).json({ error: 'Employee has no tenant assigned' });
      }
      return next();
    }

    // No recognized auth context — reject
    return res.status(401).json({ error: 'Authentication required to resolve tenant' });
  } catch (err) {
    console.error('resolveTenant error:', err);
    return res.status(500).json({ error: 'Failed to resolve tenant context' });
  }
};

module.exports = { resolveTenant };
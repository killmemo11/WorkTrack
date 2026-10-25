// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');
const logger = require('../utils/logger');
const { getTenantOrNull, isTenantUsable, TENANT_INACTIVE_MESSAGE } = require('../services/tenant.service');
const { runWithTenant } = require('../utils/tenant-context');

// Resolve tenant_id from the authenticated user's token and reject inactive workspaces.
// Attaches req.tenantId (and req.tenant) for all downstream middleware/controllers.
const resolveTenant = async (req, res, next) => {
  try {
    // Priority 1: Platform admin (no tenant context — accesses all tenants)
    if (req.platformAdmin) {
      const requestedTenantId = req.body?.tenant_id || req.query?.tenant_id || null;
      if (requestedTenantId) {
        const tenant = await getTenantOrNull(requestedTenantId);
        if (!isTenantUsable(tenant)) {
          return res.status(400).json({ error: 'Invalid or inactive tenant_id' });
        }
        req.tenant = tenant;
      }
      req.tenantId = requestedTenantId;
      return runWithTenant(requestedTenantId, next);
    }

    let tenantId = null;

    // Priority 2: admin_users (tenant admins / IT admins)
    if (req.admin && req.admin.type === 'admin') {
      const [rows] = await pool.query(
        'SELECT tenant_id, is_platform_admin FROM admin_users WHERE id = ?',
        [req.admin.id]
      );
      if (rows.length === 0) {
        return res.status(401).json({ error: 'Admin account not found' });
      }
      if (rows[0].is_platform_admin === 1) {
        const requestedTenantId = req.body?.tenant_id || req.query?.tenant_id || null;
        if (requestedTenantId) {
          const tenant = await getTenantOrNull(requestedTenantId);
          if (!isTenantUsable(tenant)) {
            return res.status(400).json({ error: 'Invalid or inactive tenant_id' });
          }
          req.tenant = tenant;
        }
        req.tenantId = requestedTenantId;
        return runWithTenant(requestedTenantId, next);
      }
      tenantId = rows[0].tenant_id;
      if (!tenantId) {
        return res.status(403).json({ error: 'Admin account has no tenant assigned' });
      }
    } else if (req.admin) {
      // Priority 2.5: employee-admin (it-auth sets req.admin with type: 'employee_admin')
      tenantId = req.admin.tenant_id;
      if (!tenantId) {
        return res.status(403).json({ error: 'Employee-admin has no tenant assigned' });
      }
    } else if (req.employee || req.hr) {
      // Priority 3: employee (HR, manager, CEO, regular employee)
      const empId = req.employee?.id || req.hr?.id;
      tenantId = req.employee?.tenant_id || req.hr?.tenant_id || null;
      if (!tenantId && empId) {
        const [rows] = await pool.query('SELECT tenant_id FROM employees WHERE id = ?', [empId]);
        tenantId = rows[0]?.tenant_id || null;
      }
      if (!tenantId) {
        return res.status(403).json({ error: 'Employee has no tenant assigned' });
      }
    } else {
      return res.status(401).json({ error: 'Authentication required to resolve tenant' });
    }

    const tenant = await getTenantOrNull(tenantId);
    if (!tenant) return res.status(403).json({ error: 'Workspace not found' });
    if (!isTenantUsable(tenant)) return res.status(403).json({ error: TENANT_INACTIVE_MESSAGE });

    req.tenant = tenant;
    req.tenantId = tenant.id;
    // Propagate the workspace through async call chains (mail/meeting services
    // read tenant-scoped settings without taking a tenant argument).
    return runWithTenant(tenant.id, next);
  } catch (err) {
    logger.error('resolveTenant error:', err);
    return res.status(500).json({ error: 'Failed to resolve tenant context' });
  }
};

// Guard for every route mounted under /employees/:id — rejects IDs that belong to another tenant.
const requireEmployeeInTenant = async (req, res, next) => {
  try {
    const employeeId = parseInt(req.params.id, 10);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({ error: 'Invalid employee id' });
    }
    if (!req.tenantId) {
      return res.status(403).json({ error: 'Tenant context required' });
    }
    const [rows] = await pool.query(
      'SELECT id FROM employees WHERE id = ? AND tenant_id = ?',
      [employeeId, req.tenantId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    next();
  } catch (err) {
    logger.error('requireEmployeeInTenant error:', err);
    return res.status(500).json({ error: 'Failed to verify employee ownership' });
  }
};

module.exports = { resolveTenant, requireEmployeeInTenant };

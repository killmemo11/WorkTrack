// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

// Backward-compatible: old callers (employeeId, adminId, action, description)
// keep working. New callers can pass a 5th metadata arg:
//   logActivity(empId, adminId, action, desc, { old_value, new_value })
// or the legacy (empId, adminId, action, desc, null, tenantId) positional form.
async function logActivity(employeeId, adminId, action, description, metaOrTenantId, tenantId) {
  let oldVal = null;
  let newVal = null;
  let resolvedTenantId = tenantId || null;

  if (metaOrTenantId && typeof metaOrTenantId === 'object') {
    oldVal = metaOrTenantId.old_value || null;
    newVal = metaOrTenantId.new_value || null;
    if (metaOrTenantId.tenant_id) resolvedTenantId = metaOrTenantId.tenant_id;
  } else if (typeof metaOrTenantId === 'number' || typeof metaOrTenantId === 'string') {
    // Legacy positional: logActivity(emp, admin, action, desc, null, tenantId)
    resolvedTenantId = metaOrTenantId;
  }

  await pool.query(
    `INSERT INTO activity_log (employee_id, admin_id, action, description, old_value, new_value, tenant_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [employeeId || null, adminId || null, action, description || '', oldVal, newVal, resolvedTenantId || 1]
  );
}

module.exports = { logActivity };

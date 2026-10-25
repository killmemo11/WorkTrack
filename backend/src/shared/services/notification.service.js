// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

// Tenant is derived from the recipient so callers cannot forget to pass it.
async function createNotification(employeeId, title, message, type = 'info', link = null) {
  await pool.query(
    `INSERT INTO notifications (employee_id, title, message, type, link, tenant_id)
     VALUES (?, ?, ?, ?, ?, (SELECT tenant_id FROM employees WHERE id = ?))`,
    [employeeId, title, message, type, link, employeeId]
  );
}

async function createAdminNotification(adminId, title, message, type = 'info', link = null) {
  await pool.query(
    `INSERT INTO admin_notifications (admin_id, title, message, type, link, tenant_id)
     VALUES (?, ?, ?, ?, ?, (SELECT tenant_id FROM admin_users WHERE id = ?))`,
    [adminId, title, message, type, link, adminId]
  );
}

async function notifyAllAdmins(title, message, type = 'info', link = null, tenantId = null) {
  if (!tenantId) {
    throw new Error('notifyAllAdmins requires tenantId');
  }
  const [rows] = await pool.query(
    'SELECT id FROM admin_users WHERE is_active = 1 AND tenant_id = ?',
    [tenantId]
  );
  for (const admin of rows) {
    await createAdminNotification(admin.id, title, message, type, link);
  }
}

module.exports = { createNotification, createAdminNotification, notifyAllAdmins };

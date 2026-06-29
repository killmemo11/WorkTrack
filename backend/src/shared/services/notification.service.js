// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

async function createNotification(employeeId, title, message, type = 'info', link = null) {
  await pool.query(
    'INSERT INTO notifications (employee_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
    [employeeId, title, message, type, link]
  );
}

async function createAdminNotification(adminId, title, message, type = 'info', link = null) {
  await pool.query(
    'INSERT INTO admin_notifications (admin_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
    [adminId, title, message, type, link]
  );
}

async function notifyAllAdmins(title, message, type = 'info', link = null) {
  const [rows] = await pool.query('SELECT id FROM admin_users WHERE is_active = 1');
  for (const admin of rows) {
    await createAdminNotification(admin.id, title, message, type, link);
  }
}

module.exports = { createNotification, createAdminNotification, notifyAllAdmins };

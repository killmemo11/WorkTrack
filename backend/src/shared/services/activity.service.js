// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

async function logActivity(employeeId, adminId, action, description) {
  await pool.query(
    `INSERT INTO activity_log (employee_id, admin_id, action, description)
     VALUES (?, ?, ?, ?)`,
    [employeeId || null, adminId || null, action, description || '']
  );
}

module.exports = { logActivity };

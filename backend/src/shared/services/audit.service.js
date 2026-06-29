// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');

async function logBalanceChange(employeeId, leaveType, oldBalance, newBalance, action, referenceId, performedBy) {
  await pool.query(
    `INSERT INTO balance_audit (employee_id, leave_type, old_balance, new_balance, change_amount, action, reference_id, performed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [employeeId, leaveType, oldBalance, newBalance, parseFloat(newBalance) - parseFloat(oldBalance), action, referenceId || null, performedBy || null]
  );
}

module.exports = { logBalanceChange };

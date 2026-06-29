// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { createNotification, notifyAllAdmins } = require('../../shared/services/notification.service');
const { logBalanceChange } = require('../../shared/services/audit.service');

async function getLeaveTypes(req, res) {
  const [rows] = await pool.query('SELECT * FROM leave_types ORDER BY id');
  const [resetRows] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'last_balance_reset'");
  res.json({
    types: rows,
    last_reset: resetRows.length > 0 ? resetRows[0].value : null,
  });
}

async function updateLeaveType(req, res) {
  const { id } = req.params;
  const { label, default_balance, is_active } = req.body;
  if (!label || label.trim() === '') {
    return res.status(400).json({ error: 'Label is required' });
  }
  await pool.query(
    'UPDATE leave_types SET label = ?, default_balance = ?, is_active = ? WHERE id = ?',
    [label, default_balance != null ? default_balance : null, is_active ?? 1, id]
  );
  res.json({ message: 'Leave type updated' });
}

async function resetLeaveBalances(req, res) {
  const adminId = req.admin?.id || req.hr?.id || null;

  const [typeRows] = await pool.query(
    'SELECT name, default_balance FROM leave_types WHERE default_balance IS NOT NULL AND is_active = 1'
  );
  if (typeRows.length === 0) {
    return res.status(400).json({ error: 'No leave types with balance configured' });
  }

  const typeNames = typeRows.map(t => t.name);
  const placeholders = typeNames.map(() => '?').join(',');

  // Get all affected balances in one query
  const [allBalances] = await pool.query(
    `SELECT lb.id, lb.employee_id, lb.leave_type, lb.balance AS old_balance
     FROM leave_balances lb
     JOIN employees e ON lb.employee_id = e.id AND (e.is_system IS NULL OR e.is_system = 0)
     WHERE lb.leave_type IN (${placeholders})`,
    typeNames
  );

  // Reset all balances in one UPDATE per type
  for (const t of typeRows) {
    await pool.query(
      `UPDATE leave_balances lb
       JOIN employees e ON lb.employee_id = e.id AND (e.is_system IS NULL OR e.is_system = 0)
       SET lb.balance = ?
       WHERE lb.leave_type = ?`,
      [t.default_balance, t.name]
    );
  }

  // Log changes only for balances that actually changed
  for (const b of allBalances) {
    const t = typeRows.find(tr => tr.name === b.leave_type);
    if (t && parseFloat(b.old_balance) !== parseFloat(t.default_balance)) {
      await logBalanceChange(b.employee_id, b.leave_type, parseFloat(b.old_balance), parseFloat(t.default_balance), 'reset', null, adminId);
    }
  }

  // Record reset time
  await pool.query(
    "INSERT INTO settings (`key`, `value`) VALUES ('last_balance_reset', NOW()) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)"
  );

  try {
    await notifyAllAdmins('Leave Balances Reset', `All leave balances have been reset to default values by an admin.`, 'info');
  } catch (e) { console.error('Reset notification error:', e); }

  res.json({ message: 'All leave balances reset to defaults' });
}

module.exports = { getLeaveTypes, updateLeaveType, resetLeaveBalances };


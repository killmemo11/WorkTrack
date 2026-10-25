// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { isWorkDay, getDaysInMonth } = require('../../shared/utils/work-day.util');
const emailService = require('../../shared/services/email.service');
const { createNotification } = require('../../shared/services/notification.service');
const { logBalanceChange } = require('../../shared/services/audit.service');
const { logActivity } = require('../../shared/services/activity.service');
const logger = require('../../shared/utils/logger');

function getDatesBetween(start, end) {
  const dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function getMyLeaves(req, res) {
  const employeeId = req.employee.id;
  const tenantId = req.employee.tenant_id;
  const [rows] = await pool.query(
    'SELECT * FROM leave_requests WHERE employee_id = ? AND tenant_id = ? ORDER BY created_at DESC',
    [employeeId, tenantId]
  );
  const [balances] = await pool.query(
    `SELECT lb.*, lt.default_balance AS total
     FROM leave_balances lb
     JOIN leave_types lt ON lb.leave_type = lt.name AND lt.tenant_id = lb.tenant_id
     WHERE lb.employee_id = ? AND lb.tenant_id = ?`,
    [employeeId, tenantId]
  );
  res.json({ leaves: rows, balances });
}

async function createLeave(req, res) {
  const employeeId = req.employee.id;
  const tenantId = req.employee.tenant_id;
  const { type, start_date, end_date, reason } = req.body;

  if (!type || !start_date || !end_date) {
    return res.status(400).json({ error: 'Type, start date, and end date are required' });
  }

  // Validate type is active
  const [validTypes] = await pool.query('SELECT name, default_balance FROM leave_types WHERE is_active = 1 AND tenant_id = ?', [tenantId]);
  const typeConfig = validTypes.find((t) => t.name === type);
  if (!typeConfig) {
    return res.status(400).json({ error: 'Invalid or disabled leave type' });
  }
  const hasBalance = typeConfig.default_balance !== null;

  // Get work week settings
  const [settingsRows] = await pool.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('work_week_start', 'work_week_end') AND tenant_id = ?",
    [tenantId]
  );
  const s = {};
  for (const row of settingsRows) s[row.key] = row.value;
  const workWeekStart = s.work_week_start || 'Sunday';
  const workWeekEnd = s.work_week_end || 'Thursday';

  // Get holidays in range
  const [holidays] = await pool.query(
    'SELECT date FROM holidays WHERE date >= ? AND date <= ? AND tenant_id = ?',
    [start_date, end_date, tenantId]
  );
  const holidaySet = new Set(holidays.map((h) => new Date(h.date).toISOString().split('T')[0]));

  const start = new Date(start_date + 'T00:00:00');
  const end = new Date(end_date + 'T00:00:00');
  if (start > end) {
    return res.status(400).json({ error: 'Start date must be before end date' });
  }

  // Check for overlap with existing approved/pending leaves
  const [overlap] = await pool.query(
    `SELECT id FROM leave_requests WHERE employee_id = ? AND tenant_id = ? AND status IN ('pending','approved')
     AND start_date <= ? AND end_date >= ?`,
    [employeeId, tenantId, end_date, start_date]
  );
  if (overlap.length > 0) {
    return res.status(400).json({ error: 'You already have a pending or approved leave request that overlaps with this date range.' });
  }

  const allDates = getDatesBetween(start, end);
  let daysCount = 0;
  for (const d of allDates) {
    const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (isWorkDay(d, workWeekStart, workWeekEnd) && !holidaySet.has(dayStr)) {
      daysCount++;
    }
  }

  if (daysCount === 0) {
    return res.status(400).json({ error: 'Selected range contains no work days (weekends or holidays)' });
  }

  // Check balance if type has balance tracking
  if (hasBalance) {
    const [balRows] = await pool.query(
      'SELECT balance FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND tenant_id = ?',
      [employeeId, type, tenantId]
    );
    const balance = balRows.length > 0 ? parseFloat(balRows[0].balance) : 0;
    if (daysCount > balance) {
      return res.status(400).json({ error: `Insufficient ${type} leave balance. You have ${balance} days remaining but requested ${daysCount} days.` });
    }
  }

  const [result] = await pool.query(
    'INSERT INTO leave_requests (employee_id, type, start_date, end_date, days_count, reason, status, tenant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [employeeId, type, start_date, end_date, daysCount, reason || null, 'pending', tenantId]
  );
  const leaveId = result.insertId;

  // Notification to employee
  await createNotification(
    employeeId,
    'Leave Request Submitted',
    `Your ${type} leave request for ${daysCount} day(s) (${start_date} → ${end_date}) has been submitted for approval.`,
    'info',
    '/leaves'
  );

  // Email to employee
  try {
    const [empRows] = await pool.query('SELECT name, email FROM employees WHERE id = ? AND tenant_id = ?', [employeeId, tenantId]);
    await emailService.sendLeaveConfirmationEmail(empRows[0], { id: leaveId, type, start_date, end_date, days_count: daysCount });
  } catch (e) { logger.error('Leave confirmation email error:', e); }

  await logActivity(employeeId, null, 'leave_submitted', `Submitted ${type} leave request for ${daysCount} day(s) (${start_date} → ${end_date})`);

  // Find and notify the appropriate approver with fallback chain
  const [routeRows] = await pool.query('SELECT routed_to FROM leave_types WHERE name = ? AND is_active = 1 AND tenant_id = ?', [type, tenantId]);
  const isManagerRouted = routeRows.length > 0 && routeRows[0].routed_to === 'manager';
  if (isManagerRouted) {
    try {
      const [empRows] = await pool.query(
        'SELECT e.name, e.email, e.department_id, e.role FROM employees e WHERE e.id = ? AND e.tenant_id = ?',
        [employeeId, tenantId]
      );
      let targetEmail = null;
      if (empRows[0].department_id) {
        const [deptRows] = await pool.query(
          'SELECT manager_email, c_level_email FROM departments WHERE id = ? AND tenant_id = ?',
          [empRows[0].department_id, tenantId]
        );
        if (deptRows.length > 0) {
          if (empRows[0].role === 'manager') {
            // Manager leave → C-Level, fallback to admin
            targetEmail = deptRows[0]?.c_level_email;
          } else {
            // Employee leave → Manager, fallback to C-Level, fallback to admin
            targetEmail = deptRows[0]?.manager_email || deptRows[0]?.c_level_email;
          }
        }
      }
      if (targetEmail) {
        const [approverRows] = await pool.query(
          'SELECT name, email FROM employees WHERE email = ? AND tenant_id = ?',
          [targetEmail, tenantId]
        );
        if (approverRows.length > 0) {
          await emailService.sendManagerLeaveNotificationEmail(
            approverRows[0],
            empRows[0],
            { id: leaveId, type, start_date, end_date, days_count: daysCount, reason }
          );
        }
      }
      // If no approver found, notify via smtp_from as fallback
      if (!targetEmail) {
        const [smtpRows] = await pool.query(
          "SELECT `value` FROM settings WHERE `key` = 'smtp_from' AND tenant_id = ?",
          [tenantId]
        );
        const fallbackEmail = smtpRows.length > 0 ? smtpRows[0].value : null;
        if (fallbackEmail) {
          await emailService.sendManagerLeaveNotificationEmail(
            { name: 'Admin', email: fallbackEmail },
            empRows[0],
            { id: leaveId, type, start_date, end_date, days_count: daysCount, reason }
          );
        }
      }
    } catch (e) { logger.error('Manager notification email error:', e); }
  }

  res.status(201).json({ message: 'Leave request submitted', id: leaveId });
}

async function cancelLeave(req, res) {
  const employeeId = req.employee.id;
  const tenantId = req.employee.tenant_id;
  const { id } = req.params;

  const conn = await pool.getConnection();
  let leave;
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      'SELECT * FROM leave_requests WHERE id = ? AND employee_id = ? AND tenant_id = ? AND status IN (?, ?) FOR UPDATE',
      [id, employeeId, tenantId, 'pending', 'approved']
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Leave request not found or cannot be cancelled' });
    }

    leave = rows[0];
    const wasApproved = leave.status === 'approved';

    await conn.query('UPDATE leave_requests SET status = ? WHERE id = ? AND tenant_id = ?', ['cancelled', id, tenantId]);

    // Restore balance if leave was previously approved
    if (wasApproved) {
      const [ltRows] = await conn.query('SELECT default_balance FROM leave_types WHERE name = ? AND tenant_id = ?', [leave.type, tenantId]);
      if (ltRows.length > 0 && ltRows[0].default_balance !== null) {
        const [balRows] = await conn.query(
          'SELECT balance FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND tenant_id = ? FOR UPDATE',
          [employeeId, leave.type, tenantId]
        );
        if (balRows.length > 0) {
          const oldBal = parseFloat(balRows[0].balance);
          const newBalance = oldBal + parseFloat(leave.days_count);
          await conn.query(
            'UPDATE leave_balances SET balance = ? WHERE employee_id = ? AND leave_type = ? AND tenant_id = ?',
            [newBalance, employeeId, leave.type, tenantId]
          );
          await logBalanceChange(employeeId, leave.type, oldBal, newBalance, 'restore', id, null, conn);
        }
      }
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logActivity(employeeId, null, 'leave_cancelled', `Cancelled ${leave.type} leave (${leave.start_date} → ${leave.end_date})`);

  res.json({ message: 'Leave request cancelled' });
}

module.exports = { getMyLeaves, createLeave, cancelLeave };



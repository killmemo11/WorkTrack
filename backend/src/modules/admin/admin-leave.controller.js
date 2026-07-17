// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const emailService = require('../../shared/services/email.service');
const logger = require('../../shared/utils/logger');
const { createNotification } = require('../../shared/services/notification.service');
const { logBalanceChange } = require('../../shared/services/audit.service');
const { logActivity } = require('../../shared/services/activity.service');
const { updateLeaveBalanceBody, rejectLeaveBody } = require('../../shared/validations/schemas');

async function getAllLeaves(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { status, employee_id, type } = req.query;

  let where = ['1=1'];
  let params = [];

  if (status) { where.push('lr.status = ?'); params.push(status); }
  if (employee_id) { where.push('lr.employee_id = ?'); params.push(employee_id); }
  if (type) { where.push('lr.type = ?'); params.push(type); }

  const whereClause = where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT lr.*, e.name as employee_name, e.email as employee_email, e.employee_id as emp_number,
            d.name as department_name, e.role as employee_role
     FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE ${whereClause}
     ORDER BY lr.status = 'pending' DESC, lr.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     WHERE ${whereClause}`,
    params
  );

  const result = rows.map((r) => ({
    ...r,
    is_self_approval: r.employee_role === 'admin',
  }));

  res.json({
    leaves: result,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function approveLeave(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;

  const [rows] = await pool.query('SELECT * FROM leave_requests WHERE id = ? AND status = ?', [id, 'pending']);
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Leave request not found or already processed' });
  }

  const leave = rows[0];

  const [ltRows] = await pool.query('SELECT default_balance FROM leave_types WHERE name = ?', [leave.type]);
  if (ltRows.length > 0 && ltRows[0].default_balance !== null) {
    const [balRows] = await pool.query(
      'SELECT balance FROM leave_balances WHERE employee_id = ? AND leave_type = ?',
      [leave.employee_id, leave.type]
    );
    if (balRows.length > 0) {
      const oldBal = parseFloat(balRows[0].balance);
      const newBalance = oldBal - parseFloat(leave.days_count);
      await pool.query(
        'UPDATE leave_balances SET balance = ? WHERE employee_id = ? AND leave_type = ?',
        [Math.max(0, newBalance), leave.employee_id, leave.type]
      );
      await logBalanceChange(leave.employee_id, leave.type, oldBal, Math.max(0, newBalance), 'deduct', id, adminId);
    }
  }

  await pool.query(
    'UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
    ['approved', adminId, id]
  );

  await createNotification(
    leave.employee_id,
    'Leave Approved',
    `Your ${leave.type} leave for ${leave.days_count} day(s) (${leave.start_date} → ${leave.end_date}) has been approved.`,
    'success',
    '/leaves'
  );

  try {
    const [empRows] = await pool.query('SELECT name, email FROM employees WHERE id = ?', [leave.employee_id]);
    await emailService.sendLeaveApprovedEmail(empRows[0], leave);
  } catch (e) { logger.error('Leave approved email error:', e); }

  await logActivity(leave.employee_id, adminId, 'leave_approved', `Admin approved ${leave.type} leave (${leave.start_date} → ${leave.end_date}, ${leave.days_count} day(s))`);

  res.json({ message: 'Leave approved' });
}

async function rejectLeave(req, res) {
  const { error } = rejectLeaveBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { rejection_reason } = req.body;

  const [rows] = await pool.query('SELECT * FROM leave_requests WHERE id = ? AND status = ?', [id, 'pending']);
  if (rows.length === 0) {
    return res.status(400).json({ error: 'Leave request not found or already processed' });
  }

  const leave = rows[0];

  await pool.query(
    'UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?',
    ['rejected', adminId, rejection_reason || null, id]
  );

  await createNotification(
    leave.employee_id,
    'Leave Rejected',
    rejection_reason
      ? `Your ${leave.type} leave request was rejected: ${rejection_reason}`
      : `Your ${leave.type} leave request was rejected.`,
    'error',
    '/leaves'
  );

  try {
    const [empRows] = await pool.query('SELECT name, email FROM employees WHERE id = ?', [leave.employee_id]);
    await emailService.sendLeaveRejectedEmail(empRows[0], leave, rejection_reason);
  } catch (e) { logger.error('Leave rejected email error:', e); }

  await logActivity(leave.employee_id, adminId, 'leave_rejected', `Admin rejected ${leave.type} leave (${leave.start_date} → ${leave.end_date}): ${rejection_reason || 'No reason'}`);

  res.json({ message: 'Leave rejected' });
}

async function updateLeaveBalance(req, res) {
  const { error } = updateLeaveBalanceBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const adjustments = [];

  // Support both: old format { annual, sick, casual } and new { balances: { annual: 21, ... } }
  const balances = req.body.balances || {};
  if (req.body.annual !== undefined) balances.annual = req.body.annual;
  if (req.body.sick !== undefined) balances.sick = req.body.sick;
  if (req.body.casual !== undefined) balances.casual = req.body.casual;

  const typeNames = Object.keys(balances);
  for (const typeName of typeNames) {
    const newVal = parseFloat(balances[typeName]);
    if (isNaN(newVal)) continue;
    const [bal] = await pool.query('SELECT balance FROM leave_balances WHERE employee_id = ? AND leave_type = ?', [id, typeName]);
    const oldBal = bal.length > 0 ? parseFloat(bal[0].balance) : 0;
    await pool.query(
      'INSERT INTO leave_balances (employee_id, leave_type, balance) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE balance = ?',
      [id, typeName, newVal, newVal]
    );
    if (oldBal !== newVal) {
      adjustments.push({ type: typeName, old: oldBal, new: newVal });
    }
  }

  for (const adj of adjustments) {
    await logBalanceChange(parseInt(id), adj.type, adj.old, adj.new, 'adjust', null, adminId);
  }

  const adjSummary = adjustments.map(a => `${a.type}: ${a.old} → ${a.new}`).join(', ');
  if (adjSummary) {
    await logActivity(parseInt(id), adminId, 'leave_balance_adjusted', `Adjusted leave balance for employee #${id}: ${adjSummary}`);
  }

  res.json({ message: 'Leave balance updated' });
}

module.exports = { getAllLeaves, approveLeave, rejectLeave, updateLeaveBalance };


// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { createNotification } = require('../../shared/services/notification.service');
const { logActivity } = require('../../shared/services/activity.service');
const emailService = require('../../shared/services/email.service');
const logger = require('../../shared/utils/logger');

async function getManagerPendingResignations(req, res) {
  const deptId = req.employee.department_id;
  const [rows] = await pool.query(
    `SELECT rr.*, e.name AS employee_name, e.email AS employee_email
     FROM resignation_requests rr
     JOIN employees e ON rr.employee_id = e.id
     WHERE rr.status = 'pending'
       AND e.department_id = ?
       AND e.id != ?
     ORDER BY rr.created_at DESC`,
    [deptId, req.employee.id]
  );
  res.json(rows);
}

async function managerApproveResignation(req, res) {
  try {
    const { id } = req.params;
    const [request] = await pool.query('SELECT * FROM resignation_requests WHERE id = ? AND status = ?', [id, 'pending']);
    if (request.length === 0) return res.status(404).json({ error: 'Pending resignation request not found' });
    const r = request[0];
    await pool.query('UPDATE resignation_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?', ['approved', req.employee.id, id]);
    await pool.query('UPDATE employees SET employment_status = ?, resignation_date = ? WHERE id = ?', ['resigned', r.resignation_date, r.employee_id]);
    await pool.query(
      'INSERT INTO employee_status_log (employee_id, action, effective_date, performed_by, reason) VALUES (?, ?, ?, ?, ?)',
      [r.employee_id, 'resigned', r.resignation_date, req.employee.id, r.reason || 'Resignation approved by manager']
    );
    try {
      await logActivity(r.employee_id, null, 'resignation_approved', `Resignation approved by manager: ${req.employee.name}`);
    } catch (e) { logger.error('Resignation approved activity log error:', e); }
    try {
      await createNotification(r.employee_id, 'Resignation Approved', 'Your resignation request has been approved.', 'info', '/leaves');
    } catch (e) { logger.error('Resignation approved notification error:', e); }
    res.json({ message: 'Resignation approved' });
  } catch (err) {
    logger.error('managerApproveResignation error:', err);
    res.status(500).json({ error: 'Failed to approve resignation request' });
  }
}

async function managerRejectResignation(req, res) {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    const [request] = await pool.query('SELECT * FROM resignation_requests WHERE id = ? AND status = ?', [id, 'pending']);
    if (request.length === 0) return res.status(404).json({ error: 'Pending resignation request not found' });
    await pool.query('UPDATE resignation_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?', ['rejected', req.employee.id, rejection_reason, id]);
    try {
      await logActivity(request[0].employee_id, null, 'resignation_rejected', `Resignation rejected by manager: ${req.employee.name} - ${rejection_reason}`);
    } catch (e) { logger.error('Resignation rejected activity log error:', e); }
    try {
      await createNotification(request[0].employee_id, 'Resignation Rejected', `Your resignation request has been rejected. Reason: ${rejection_reason}`, 'info', '/leaves');
    } catch (e) { logger.error('Resignation rejected notification error:', e); }
    res.json({ message: 'Resignation rejected' });
  } catch (err) {
    logger.error('managerRejectResignation error:', err);
    res.status(500).json({ error: 'Failed to reject resignation request' });
  }
}

module.exports = { getManagerPendingResignations, managerApproveResignation, managerRejectResignation };

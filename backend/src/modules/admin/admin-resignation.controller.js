// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { createNotification } = require('../../shared/services/notification.service');
const { logActivity } = require('../../shared/services/activity.service');

async function getAllResignations(req, res) {
  const { status } = req.query;
  let where = '';
  let params = [];
  if (status) { where = 'WHERE rr.status = ?'; params.push(status); }
  const [rows] = await pool.query(
    `SELECT rr.*, e.name AS employee_name, e.email AS employee_email,
            au.username AS reviewed_by_name
     FROM resignation_requests rr
     JOIN employees e ON rr.employee_id = e.id
     LEFT JOIN admin_users au ON rr.reviewed_by = au.id
     ${where}
     ORDER BY rr.created_at DESC`, params
  );
  res.json(rows);
}

async function adminApproveResignation(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const [request] = await pool.query('SELECT * FROM resignation_requests WHERE id = ? AND status = ?', [id, 'pending']);
  if (request.length === 0) return res.status(404).json({ error: 'Pending resignation request not found' });
  const r = request[0];

  if (!req.query.force) {
    const [assets] = await pool.query(
      `SELECT ac.name, ac.serial_number, ac.category, aa.assigned_date
       FROM asset_assignments aa
       JOIN asset_catalog ac ON aa.asset_id = ac.id
       WHERE aa.employee_id = ? AND aa.return_date IS NULL
       ORDER BY aa.assigned_date DESC`, [r.employee_id]
    );
    if (assets.length > 0) {
      return res.status(409).json({
        error: 'Employee has unreturned assets',
        assets: assets.map(a => `${a.name} (${a.serial_number || 'no serial'})`),
      });
    }
  }

  await pool.query('UPDATE resignation_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?', ['approved', adminId, id]);
  await pool.query('UPDATE employees SET employment_status = ?, resignation_date = ? WHERE id = ?', ['resigned', r.resignation_date, r.employee_id]);
  await pool.query(
    'INSERT INTO employee_status_log (employee_id, action, effective_date, performed_by, reason) VALUES (?, ?, ?, ?, ?)',
    [r.employee_id, 'resigned', r.resignation_date, adminId, r.reason || 'Resignation approved by admin']
  );
  logActivity(r.employee_id, adminId, 'resignation_approved', `Resignation approved by admin`);
  await createNotification(r.employee_id, 'Resignation Approved', 'Your resignation request has been approved.', 'info', '/leaves');
  res.json({ message: 'Resignation approved' });
}

async function adminRejectResignation(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { rejection_reason } = req.body;
  const [request] = await pool.query('SELECT * FROM resignation_requests WHERE id = ? AND status = ?', [id, 'pending']);
  if (request.length === 0) return res.status(404).json({ error: 'Pending resignation request not found' });
  await pool.query('UPDATE resignation_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?', ['rejected', adminId, rejection_reason || null, id]);
  logActivity(request[0].employee_id, adminId, 'resignation_rejected', `Resignation rejected by admin`);
  await createNotification(request[0].employee_id, 'Resignation Rejected', `Your resignation request has been rejected.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`, 'info', '/leaves');
  res.json({ message: 'Resignation rejected' });
}

module.exports = { getAllResignations, adminApproveResignation, adminRejectResignation };
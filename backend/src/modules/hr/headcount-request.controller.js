// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { createNotification } = require('../../shared/services/notification.service');
const { checkHeadcountCapacity } = require('../../shared/utils/headcount.util');

async function createRequest(req, res) {
  const { department_id, title_id, quantity, job_type, reason, priority } = req.body;
  const deptId = department_id || req.employee?.department_id;
  if (!deptId || !title_id) return res.status(400).json({ error: 'Department and title are required' });

  const requesterId = req.employee?.id || req.admin?.id;
  if (!requesterId) return res.status(401).json({ error: 'Authentication required' });

  // Validate headcount capacity
  const capacity = await checkHeadcountCapacity({ department_id: deptId, title_id, additional: quantity || 1 });
  if (!capacity.hasCapacity) {
    const reasons = [];
    if (capacity.deptOverLimit) reasons.push(`Department at capacity (${capacity.deptAvailable} remaining)`);
    if (capacity.titleOverLimit) reasons.push(`Title at capacity (${capacity.titleAvailable} remaining)`);
    return res.status(400).json({ error: `Headcount limit exceeded. ${reasons.join('; ')}.` });
  }

  const [result] = await pool.query(
    `INSERT INTO headcount_requests (requester_id, department_id, title_id, quantity, job_type, reason, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [requesterId, deptId, title_id, quantity || 1, job_type || 'Full-Time', reason || null, priority || 'normal']
  );

  // Notify HR admins
  const [requester] = await pool.query('SELECT name FROM employees WHERE id = ?', [requesterId]);
  const [admins] = await pool.query('SELECT id FROM employees WHERE role = ? AND is_active = 1', ['admin']);
  for (const admin of admins) {
    await createNotification(admin.id, 'New Headcount Request',
      `${requester[0]?.name || 'A manager'} requested a new position.`,
      'info', '/hr/headcount-requests');
  }

  res.status(201).json({ message: 'Request submitted', id: result.insertId });
}

async function getRequests(req, res) {
  const { status } = req.query;
  let where = '';
  let params = [];
  if (status) { where = 'WHERE hcr.status = ?'; params.push(status); }

  const [rows] = await pool.query(
    `SELECT hcr.*, e.name AS requester_name, d.name AS department_name, dt.title AS title_name
     FROM headcount_requests hcr
     JOIN employees e ON hcr.requester_id = e.id
     JOIN departments d ON hcr.department_id = d.id
     JOIN department_titles dt ON hcr.title_id = dt.id
     ${where}
     ORDER BY hcr.created_at DESC`, params
  );
  res.json(rows);
}

async function getMyRequests(req, res) {
  const requesterId = req.employee?.id;
  if (!requesterId) return res.status(401).json({ error: 'Authentication required' });

  const [rows] = await pool.query(
    `SELECT hcr.*, d.name AS department_name, dt.title AS title_name
     FROM headcount_requests hcr
     JOIN departments d ON hcr.department_id = d.id
     JOIN department_titles dt ON hcr.title_id = dt.id
     WHERE hcr.requester_id = ?
     ORDER BY hcr.created_at DESC`, [requesterId]
  );
  res.json(rows);
}

async function approveRequest(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { auto_create_job } = req.body;

  const [request] = await pool.query('SELECT * FROM headcount_requests WHERE id = ? AND status = ?', [id, 'pending']);
  if (request.length === 0) return res.status(404).json({ error: 'Pending request not found' });
  const r = request[0];

  // Re-validate headcount capacity (situation may have changed since request was created)
  const capacity = await checkHeadcountCapacity({ department_id: r.department_id, title_id: r.title_id, additional: r.quantity });
  if (!capacity.hasCapacity) {
    const reasons = [];
    if (capacity.deptOverLimit) reasons.push(`Department at capacity (${capacity.deptAvailable} remaining)`);
    if (capacity.titleOverLimit) reasons.push(`Title at capacity (${capacity.titleAvailable} remaining)`);
    return res.status(400).json({ error: `Cannot approve — headcount limit exceeded. ${reasons.join('; ')}.` });
  }

  await pool.query(
    'UPDATE headcount_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
    ['approved', adminId, id]
  );

  let jobId = null;
  if (auto_create_job) {
    const [titleRow] = await pool.query(
      'SELECT title, job_summary, key_responsibilities, qualifications, technical_skills, core_competencies FROM department_titles WHERE id = ?',
      [r.title_id]
    );
    const t = titleRow[0] || {};
    const title = t.title || 'Position';
    const [deptRow] = await pool.query('SELECT name FROM departments WHERE id = ?', [r.department_id]);
    const deptName = deptRow[0]?.name || '';
    const [jobResult] = await pool.query(
      `INSERT INTO recruitment_jobs (title, department, type, status, description, title_id, key_responsibilities, qualifications, technical_skills, core_competencies)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?)`,
      [title, deptName, r.job_type, r.reason || '', r.title_id, t.job_summary || null, t.key_responsibilities || null, t.qualifications || null, t.technical_skills || null, t.core_competencies || null]
    );
    jobId = jobResult.insertId;
  }

  await createNotification(r.requester_id, 'Request Approved',
    'Your headcount request has been approved.', 'success', '/manager/team-requests');

  res.json({ message: 'Request approved', job_id: jobId });
}

async function rejectRequest(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { rejection_reason } = req.body;

  const [request] = await pool.query('SELECT * FROM headcount_requests WHERE id = ? AND status = ?', [id, 'pending']);
  if (request.length === 0) return res.status(404).json({ error: 'Pending request not found' });
  const r = request[0];

  await pool.query(
    'UPDATE headcount_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?',
    ['rejected', adminId, rejection_reason || null, id]
  );

  await createNotification(r.requester_id, 'Request Rejected',
    `Your headcount request was rejected.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`,
    'error', '/manager/team-requests');

  res.json({ message: 'Request rejected' });
}

module.exports = { createRequest, getRequests, getMyRequests, approveRequest, rejectRequest };
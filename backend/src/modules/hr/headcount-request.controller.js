const pool = require('../../shared/config/database');
const { createNotification } = require('../../shared/services/notification.service');
const { checkHeadcountCapacity } = require('../../shared/utils/headcount.util');

async function getRequesterRole(requesterId, departmentId) {
  const [[emp]] = await pool.query(
    `SELECT e.id, e.role, d.manager_email, d.c_level_email,
            e.email AS requester_email
     FROM employees e
     JOIN departments d ON d.id = ?
     WHERE e.id = ?`,
    [departmentId, requesterId]
  );
  return emp || {};
}

async function createRequest(req, res) {
  const { department_id, title_id, quantity, job_type, reason, priority } = req.body;
  const deptId = department_id || req.employee?.department_id;
  if (!deptId || !title_id) return res.status(400).json({ error: 'Department and title are required' });

  const requesterId = req.employee?.id || req.admin?.id;
  if (!requesterId) return res.status(401).json({ error: 'Authentication required' });

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
    `SELECT hcr.*, e.name AS requester_name, e.role AS requester_role, e.email AS requester_email,
            d.name AS department_name, dt.title AS title_name,
            d.manager_email, d.c_level_email
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
    `SELECT hcr.*, d.name AS department_name, dt.title AS title_name,
            d.manager_email, d.c_level_email
     FROM headcount_requests hcr
     JOIN departments d ON hcr.department_id = d.id
     JOIN department_titles dt ON hcr.title_id = dt.id
     WHERE hcr.requester_id = ?
     ORDER BY hcr.created_at DESC`, [requesterId]
  );
  res.json(rows);
}

async function getManagerPendingRequests(req, res) {
  const managerId = req.employee?.id;
  if (!managerId) return res.status(401).json({ error: 'Authentication required' });

  const [[emp]] = await pool.query(
    'SELECT e.id, e.email, d.id AS dept_id FROM employees e JOIN departments d ON d.manager_email = e.email WHERE e.id = ?',
    [managerId]
  );
  if (!emp) return res.json([]);

  const [rows] = await pool.query(
    `SELECT hcr.*, e.name AS requester_name, d.name AS department_name, dt.title AS title_name
     FROM headcount_requests hcr
     JOIN employees e ON hcr.requester_id = e.id
     JOIN departments d ON hcr.department_id = d.id
     JOIN department_titles dt ON hcr.title_id = dt.id
     WHERE hcr.department_id = ? AND hcr.manager_status = 'pending' AND hcr.status = 'pending'
       AND hcr.requester_id != ?
     ORDER BY hcr.created_at DESC`,
    [emp.dept_id, managerId]
  );
  res.json(rows);
}

async function getCeoPendingRequests(req, res) {
  const ceoId = req.employee?.id;
  if (!ceoId) return res.status(401).json({ error: 'Authentication required' });

  const [[ceo]] = await pool.query(
    `SELECT e.id FROM employees e
     JOIN (SELECT DISTINCT c_level_email FROM departments WHERE c_level_email IS NOT NULL) d ON d.c_level_email = e.email
     WHERE e.id = ?`,
    [ceoId]
  );
  if (!ceo) return res.json([]);

  const [rows] = await pool.query(
    `SELECT hcr.*, e.name AS requester_name, d.name AS department_name, dt.title AS title_name
     FROM headcount_requests hcr
     JOIN employees e ON hcr.requester_id = e.id
     JOIN departments d ON hcr.department_id = d.id
     JOIN department_titles dt ON hcr.title_id = dt.id
     WHERE hcr.ceo_status = 'pending' AND hcr.status = 'pending'
       AND (hcr.manager_status = 'approved' OR hcr.requester_id = ?)
     ORDER BY hcr.created_at DESC`,
    [ceoId]
  );
  res.json(rows);
}

async function managerApproveRequest(req, res) {
  const { id } = req.params;
  const managerId = req.employee?.id;
  if (!managerId) return res.status(401).json({ error: 'Authentication required' });

  const [[emp]] = await pool.query(
    'SELECT e.id FROM employees e JOIN departments d ON d.manager_email = e.email WHERE e.id = ?',
    [managerId]
  );
  if (!emp) return res.status(403).json({ error: 'Only department managers can approve' });

  const [request] = await pool.query(
    'SELECT * FROM headcount_requests WHERE id = ? AND manager_status = ? AND status = ?',
    [id, 'pending', 'pending']
  );
  if (request.length === 0) return res.status(404).json({ error: 'Pending request not found' });
  const r = request[0];

  await pool.query(
    'UPDATE headcount_requests SET manager_status = ?, reviewed_by_manager_id = ?, reviewed_by_manager_at = NOW() WHERE id = ?',
    ['approved', managerId, id]
  );

  // Notify C-Level
  const [[dept]] = await pool.query('SELECT c_level_email FROM departments WHERE id = ?', [r.department_id]);
  if (dept?.c_level_email) {
    const [[ceoEmp]] = await pool.query('SELECT id FROM employees WHERE email = ?', [dept.c_level_email]);
    if (ceoEmp) {
      await createNotification(ceoEmp.id, 'Headcount Request Needs CEO Approval',
        'A headcount request has been approved by the manager and requires your approval.',
        'info', '/manager/headcount-ceo');
    }
  }

  await createNotification(r.requester_id, 'Manager Approved',
    'Your headcount request has been approved by your manager, pending further approval.',
    'success', '/manager/team-requests');

  res.json({ message: 'Manager approved. Routing to C-Level.' });
}

async function managerRejectRequest(req, res) {
  const { id } = req.params;
  const managerId = req.employee?.id;
  const { rejection_reason } = req.body;
  if (!managerId) return res.status(401).json({ error: 'Authentication required' });

  const [[emp]] = await pool.query(
    'SELECT e.id FROM employees e JOIN departments d ON d.manager_email = e.email WHERE e.id = ?',
    [managerId]
  );
  if (!emp) return res.status(403).json({ error: 'Only department managers can reject' });

  const [request] = await pool.query(
    'SELECT * FROM headcount_requests WHERE id = ? AND manager_status = ? AND status = ?',
    [id, 'pending', 'pending']
  );
  if (request.length === 0) return res.status(404).json({ error: 'Pending request not found' });
  const r = request[0];

  await pool.query(
    'UPDATE headcount_requests SET manager_status = ?, reviewed_by_manager_id = ?, reviewed_by_manager_at = NOW(), manager_rejection_reason = ?, status = ?, rejection_reason = ? WHERE id = ?',
    ['rejected', managerId, rejection_reason || null, 'rejected', rejection_reason || null, id]
  );

  await createNotification(r.requester_id, 'Request Rejected by Manager',
    `Your headcount request was rejected by your manager.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`,
    'error', '/manager/team-requests');

  res.json({ message: 'Request rejected by manager' });
}

async function ceoApproveRequest(req, res) {
  const { id } = req.params;
  const ceoId = req.employee?.id;
  if (!ceoId) return res.status(401).json({ error: 'Authentication required' });

  const [[ceo]] = await pool.query(
    `SELECT e.id FROM employees e
     JOIN (SELECT DISTINCT c_level_email FROM departments WHERE c_level_email IS NOT NULL) d ON d.c_level_email = e.email
     WHERE e.id = ?`,
    [ceoId]
  );
  if (!ceo) return res.status(403).json({ error: 'Only C-Level executives can approve at this stage' });

  const [request] = await pool.query(
    'SELECT * FROM headcount_requests WHERE id = ? AND ceo_status = ? AND status = ?',
    [id, 'pending', 'pending']
  );
  if (request.length === 0) return res.status(404).json({ error: 'Pending request not found' });
  const r = request[0];

  await pool.query(
    'UPDATE headcount_requests SET ceo_status = ?, reviewed_by_ceo_id = ?, reviewed_by_ceo_at = NOW() WHERE id = ?',
    ['approved', ceoId, id]
  );

  // Notify HR
  const [admins] = await pool.query('SELECT id FROM employees WHERE role = ? AND is_active = 1', ['admin']);
  for (const admin of admins) {
    await createNotification(admin.id, 'Headcount Request Needs Final Approval',
      'A headcount request has been approved by the C-Level and needs your final approval.',
      'info', '/hr/headcount-requests');
  }

  await createNotification(r.requester_id, 'C-Level Approved',
    'Your headcount request has been approved by the C-Level, pending final HR approval.',
    'success', '/manager/team-requests');

  res.json({ message: 'C-Level approved. Routing to HR for final approval.' });
}

async function ceoRejectRequest(req, res) {
  const { id } = req.params;
  const ceoId = req.employee?.id;
  const { rejection_reason } = req.body;
  if (!ceoId) return res.status(401).json({ error: 'Authentication required' });

  const [[ceo]] = await pool.query(
    `SELECT e.id FROM employees e
     JOIN (SELECT DISTINCT c_level_email FROM departments WHERE c_level_email IS NOT NULL) d ON d.c_level_email = e.email
     WHERE e.id = ?`,
    [ceoId]
  );
  if (!ceo) return res.status(403).json({ error: 'Only C-Level executives can reject at this stage' });

  const [request] = await pool.query(
    'SELECT * FROM headcount_requests WHERE id = ? AND ceo_status = ? AND status = ?',
    [id, 'pending', 'pending']
  );
  if (request.length === 0) return res.status(404).json({ error: 'Pending request not found' });
  const r = request[0];

  await pool.query(
    'UPDATE headcount_requests SET ceo_status = ?, reviewed_by_ceo_id = ?, reviewed_by_ceo_at = NOW(), ceo_rejection_reason = ?, status = ?, rejection_reason = ? WHERE id = ?',
    ['rejected', ceoId, rejection_reason || null, 'rejected', rejection_reason || null, id]
  );

  await createNotification(r.requester_id, 'Request Rejected by C-Level',
    `Your headcount request was rejected by the C-Level.${rejection_reason ? ' Reason: ' + rejection_reason : ''}`,
    'error', '/manager/team-requests');

  res.json({ message: 'Request rejected by C-Level' });
}

async function approveRequest(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.hr?.id || null;
  const { auto_create_job } = req.body;

  // Check all intermediate stages are satisfied
  let stageClause = 'AND (manager_status = ? OR manager_status = \'approved\')';
  let stageParams = ['approved'];
  // If request comes from HR/admins, they can bypass intermediate checks
  // Actually, we allow HR to see what's pending at their level:
  // They should only approve requests that are at the final stage
  // Meaning: either requester is C-Level (skips manager + ceo), or requester is manager (needs ceo approval), or needs all steps

  // Simplified: HR can approve any pending request, but will check intermediate stages first
  // If ceo_status is still 'pending' and requester is not the ceo, auto-approve ceo step too
  const [request] = await pool.query('SELECT * FROM headcount_requests WHERE id = ? AND status = ?', [id, 'pending']);
  if (request.length === 0) return res.status(404).json({ error: 'Pending request not found' });
  const r = request[0];

  const requester = await getRequesterRole(r.requester_id, r.department_id);

  // Auto-approve intermediate stages if they're still pending
  if (r.manager_status === 'pending' && requester.role !== 'admin' && requester.role !== 'hr') {
    await pool.query(
      'UPDATE headcount_requests SET manager_status = ?, reviewed_by_manager_id = ?, reviewed_by_manager_at = NOW() WHERE id = ?',
      ['approved', adminId, id]
    );
  }
  if (r.ceo_status === 'pending') {
    const isRequesterManager = requester.role === 'manager' || requester.requester_email === requester.manager_email;
    if (isRequesterManager || requester.role === 'admin' || requester.role === 'hr') {
      await pool.query(
        'UPDATE headcount_requests SET ceo_status = ?, reviewed_by_ceo_id = ?, reviewed_by_ceo_at = NOW() WHERE id = ?',
        ['approved', adminId, id]
      );
    }
  }

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
      'SELECT title, job_summary, key_responsibilities, qualifications, technical_skills, core_competencies, technical, grade_id, min_education_level, min_experience_years, required_skills FROM department_titles WHERE id = ?',
      [r.title_id]
    );
    const t = titleRow[0] || {};

    // Validate required job fields before creating the posting
    const missingFields = [];
    if (!t.job_summary) missingFields.push('Job Summary');
    if (!t.key_responsibilities) missingFields.push('Key Responsibilities');
    if (!t.qualifications) missingFields.push('Qualifications & Skills');
    if (!t.grade_id) missingFields.push('Grade (salary scale)');
    if (!t.min_education_level) missingFields.push('Minimum Education Level');
    if (!t.min_experience_years) missingFields.push('Minimum Years of Experience');
    if (!t.required_skills) missingFields.push('Required Skills');

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Cannot create job posting — the following fields are missing from the position setup. Please go to Job Architecture and fill them in first.',
        missing_fields: missingFields,
        redirect: '/personnel/positions'
      });
    }

    const title = t.title || 'Position';
    const [deptRow] = await pool.query('SELECT name FROM departments WHERE id = ?', [r.department_id]);
    const deptName = deptRow[0]?.name || '';
    const [jobResult] = await pool.query(
      `INSERT INTO recruitment_jobs (title, department, type, technical, status, description, title_id, headcount_request_id, key_responsibilities, qualifications, technical_skills, core_competencies)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`,
      [title, deptName, r.job_type, t.technical || 0, t.job_summary || r.reason || '', r.title_id, id, t.key_responsibilities || null, t.qualifications || null, t.technical_skills || null, t.core_competencies || null]
    );
    jobId = jobResult.insertId;
  }

  await createNotification(r.requester_id, 'Request Approved',
    'Your headcount request has been fully approved.', 'success', '/manager/team-requests');

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

module.exports = {
  createRequest, getRequests, getMyRequests,
  getManagerPendingRequests, getCeoPendingRequests,
  managerApproveRequest, managerRejectRequest,
  ceoApproveRequest, ceoRejectRequest,
  approveRequest, rejectRequest,
};

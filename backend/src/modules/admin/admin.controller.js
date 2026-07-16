// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { isWorkDay, getDaysInMonth, formatDateCairo } = require('../../shared/utils/work-day.util');
const { createNotification } = require('../../shared/services/notification.service');
const { logActivity } = require('../../shared/services/activity.service');
const { runMissingSignOutCheck } = require('../../shared/jobs/missing-signout-reminder.job');
const { formatUpdatedFieldsSummary, formatUpdatedFieldChanges } = require('../../shared/utils/activity-log.util');

async function getEmployees(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { department_id } = req.query;
  const tenantId = req.tenantId;

  let where = ["(e.is_system IS NULL OR e.is_system = 0)"];
  let params = [];

  if (tenantId) { where.push('e.tenant_id = ?'); params.push(tenantId); }
  if (department_id) { where.push('e.department_id = ?'); params.push(department_id); }

  const whereClause = 'WHERE ' + where.join(' AND ');

  const [rows] = await pool.query(
    `SELECT e.id, e.employee_id, e.email, e.name, e.username, e.department, e.department_id, e.grade_id, e.title_id,
            d.name as department_name, e.role, e.is_active, e.can_wfh, e.employment_status,
            DATE_FORMAT(e.resignation_date, '%Y-%m-%d') AS resignation_date,
            e.is_verified, e.created_at,
            ep.avatar_path, g.name AS grade_name, g.grade_level AS grade_level,
            dt.title AS position_title
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN employee_profiles ep ON e.id = ep.employee_id
     LEFT JOIN grades g ON e.grade_id = g.id
     LEFT JOIN department_titles dt ON e.title_id = dt.id
     ${whereClause}
     ORDER BY e.name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM employees e ${whereClause}`, params
  );

  res.json({
    employees: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function updateEmployee(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const { name, email, username, employee_id, department, department_id, grade_id, title_id, role, is_active, can_wfh, employment_status, resignation_date } = req.body;

  const [oldRows] = await pool.query(
    'SELECT name, email, username, employee_id, department, department_id, grade_id, title_id, role, is_active, can_wfh, employment_status, resignation_date FROM employees WHERE id = ?' + (tenantId ? ' AND tenant_id = ?' : ''),
    tenantId ? [id, tenantId] : [id]
  );
  if (oldRows.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  const oldEmployee = oldRows[0];

  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }
  if (username !== undefined) { fields.push('username = ?'); values.push(username); }
  if (employee_id !== undefined) { fields.push('employee_id = ?'); values.push(employee_id); }
  if (department !== undefined) { fields.push('department = ?'); values.push(department); }
  if (department_id !== undefined) { fields.push('department_id = ?'); values.push(department_id || null); }
  if (grade_id !== undefined) { fields.push('grade_id = ?'); values.push(grade_id || null); }
  if (title_id !== undefined) { fields.push('title_id = ?'); values.push(title_id || null); }
  if (role !== undefined) { fields.push('role = ?'); values.push(role); }
  if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active); }
  if (can_wfh !== undefined) { fields.push('can_wfh = ?'); values.push(can_wfh); }
  if (employment_status !== undefined) { fields.push('employment_status = ?'); values.push(employment_status); }

  let resignationDateValue;
  if (resignation_date !== undefined) {
    resignationDateValue = null;
    if (resignation_date) {
      const d = new Date(resignation_date);
      if (!isNaN(d.getTime())) {
        resignationDateValue = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      }
    }
    fields.push('resignation_date = ?');
    values.push(resignationDateValue);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);
  await pool.query(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values);

  // Send notification to employee if their data was changed (skip balance-only updates)
  await createNotification(id, 'Profile Updated', 'Your profile has been updated by an administrator.', 'info');

  const newEmployeeData = {
    name: name !== undefined ? name : oldEmployee.name,
    email: email !== undefined ? email : oldEmployee.email,
    username: username !== undefined ? username : oldEmployee.username,
    employee_id: employee_id !== undefined ? employee_id : oldEmployee.employee_id,
    department: department !== undefined ? department : oldEmployee.department,
    department_id: department_id !== undefined ? (department_id || null) : oldEmployee.department_id,
    grade_id: grade_id !== undefined ? (grade_id || null) : oldEmployee.grade_id,
    title_id: title_id !== undefined ? (title_id || null) : oldEmployee.title_id,
    role: role !== undefined ? role : oldEmployee.role,
    is_active: is_active !== undefined ? is_active : oldEmployee.is_active,
    can_wfh: can_wfh !== undefined ? can_wfh : oldEmployee.can_wfh,
    employment_status: employment_status !== undefined ? employment_status : oldEmployee.employment_status,
    resignation_date: resignation_date !== undefined ? resignationDateValue : oldEmployee.resignation_date,
  };

  const changedFields = fields.map((field) => field.split(' =')[0]);
  const changeDescription = formatUpdatedFieldChanges(oldEmployee, newEmployeeData, changedFields);
  const updatedFieldsSummary = formatUpdatedFieldsSummary(changedFields);
  await logActivity(parseInt(id), req.admin?.id || req.hr?.id || null, 'profile_updated', changeDescription
    ? `Updated profile fields: ${changeDescription}`
    : `Updated profile fields: ${updatedFieldsSummary || 'profile data'}`);

  const [rows] = await pool.query(
    `SELECT e.id, e.employee_id, e.email, e.name, e.username, e.department, e.department_id,
            d.name as department_name, e.role, e.is_active, e.can_wfh, e.employment_status,
            DATE_FORMAT(e.resignation_date, '%Y-%m-%d') AS resignation_date,
            e.is_verified
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.id = ?`, [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
  res.json(rows[0]);
}

async function getRecords(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const { employee_id, date_from, date_to } = req.query;
  const tenantId = req.tenantId;

  let where = [];
  let params = [];

  if (tenantId) { where.push('a.tenant_id = ?'); params.push(tenantId); }
  if (employee_id) { where.push('a.employee_id = ?'); params.push(employee_id); }
  if (date_from) { where.push('a.date >= ?'); params.push(date_from); }
  if (date_to) { where.push('a.date <= ?'); params.push(date_to); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT a.*, e.name as employee_name, e.email as employee_email, e.employee_id as emp_number
     FROM attendance_records a
     JOIN employees e ON a.employee_id = e.id
     ${whereClause}
     ORDER BY a.date DESC, a.sign_in_time DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM attendance_records a ${whereClause}`, params
  );

  const formatted = rows.map(r => ({
    ...r,
    date: r.date instanceof Date ? formatDateCairo(r.date) : r.date,
  }));

  res.json({
    records: formatted,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function exportExcel(req, res) {
  const XLSX = require('xlsx');
  const { date_from, date_to, employee_id } = req.query;
  const tenantId = req.tenantId;

  let where = [];
  let params = [];

  if (tenantId) { where.push('a.tenant_id = ?'); params.push(tenantId); }
  if (employee_id) { where.push('a.employee_id = ?'); params.push(employee_id); }
  if (date_from) { where.push('a.date >= ?'); params.push(date_from); }
  if (date_to) { where.push('a.date <= ?'); params.push(date_to); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT a.date, a.type, e.name as employee_name, e.email, e.employee_id as emp_number,
            a.sign_in_time, a.sign_out_time, a.notes, a.is_manual_sign_out
     FROM attendance_records a
     JOIN employees e ON a.employee_id = e.id
     ${whereClause}
     ORDER BY a.date DESC`,
    params
  );

  const data = rows.map((r) => ({
    Date: r.date,
    Type: (r.type || 'wfh').charAt(0).toUpperCase() + (r.type || 'wfh').slice(1),
    'Employee Name': r.employee_name,
    'Emp ID': r.emp_number || '',
    Email: r.email,
    'Sign In': r.sign_in_time ? new Date(r.sign_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    'Sign Out': r.sign_out_time ? new Date(r.sign_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    Duration: r.sign_out_time
      ? ((new Date(r.sign_out_time) - new Date(r.sign_in_time)) / (1000 * 60 * 60)).toFixed(1) + 'h'
      : '',
    Notes: r.notes || '',
    'Manual Sign Out': r.is_manual_sign_out ? 'Yes' : 'No',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  const colWidths = [
    { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 28 },
    { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 30 }, { wch: 14 },
  ];
  ws['!cols'] = colWidths;

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const logAdminId = req.admin?.id || req.hr?.id || null;
  await logActivity(null, logAdminId, 'report_exported', `Exported attendance report (${rows.length} records, ${date_from || '—'} → ${date_to || '—'})`);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
  res.send(buf);
}

async function getEmployee(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const [rows] = await pool.query(
    `SELECT e.id, e.employee_id, e.email, e.name, e.username, e.phone, e.department, e.department_id, e.grade_id, e.title_id,
            d.name as department_name, e.role, e.is_active, e.can_wfh, e.employment_status,
            DATE_FORMAT(e.resignation_date, '%Y-%m-%d') AS resignation_date,
            e.is_verified, e.created_at,
            dt.title AS position_title
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN department_titles dt ON e.title_id = dt.id
     WHERE e.id = ?` + (tenantId ? ' AND e.tenant_id = ?' : ''),
    tenantId ? [id, tenantId] : [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

  // Get leave balances (dynamic for all types)
  const [balances] = await pool.query('SELECT leave_type, balance FROM leave_balances WHERE employee_id = ?', [id]);
  const bal = {};
  for (const b of balances) bal[b.leave_type] = parseFloat(b.balance);
  rows[0].balances = bal;
  // Legacy hardcoded fields for backwards compat
  rows[0].annual_balance = bal.annual || 0;
  rows[0].sick_balance = bal.sick || 0;
  rows[0].casual_balance = bal.casual || 0;

  res.json(rows[0]);
}

async function deleteEmployee(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const [rows] = await pool.query(
    'SELECT id, name, email FROM employees WHERE id = ?' + (tenantId ? ' AND tenant_id = ?' : ''),
    tenantId ? [id, tenantId] : [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const empLabel = rows[0].name || rows[0].email || id;
    await conn.query('DELETE FROM attendance_records WHERE employee_id = ?', [id]);
    await conn.query('DELETE FROM employees WHERE id = ?', [id]);
    await conn.commit();
    await logActivity(parseInt(id), req.admin?.id || req.hr?.id || null, 'employee_deleted', `Deleted employee: ${empLabel}`);
    res.json({ message: 'Employee and all related records deleted' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteRecord(req, res) {
  const { id } = req.params;
  const tenantId = req.tenantId;
  const [rows] = await pool.query(
    'SELECT ar.*, e.name AS employee_name FROM attendance_records ar LEFT JOIN employees e ON ar.employee_id = e.id WHERE ar.id = ?' + (tenantId ? ' AND ar.tenant_id = ?' : ''),
    tenantId ? [id, tenantId] : [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Record not found' });

  const rec = rows[0];
  await pool.query('DELETE FROM attendance_records WHERE id = ?', [id]);

  const adminId = req.admin?.id || req.hr?.id || null;
  await logActivity(rec.employee_id, adminId, 'record_deleted', `Attendance record deleted — ${rec.employee_name || 'Employee #'+rec.employee_id} on ${rec.date} (sign-in: ${rec.sign_in_time || '—'})`);

  res.json({ message: 'Record deleted' });
}

async function getStats(req, res) {
  const tenantId = req.tenantId;
  const tenantFilter = tenantId ? ' AND e.tenant_id = ?' : '';
  const [totalEmployees] = await pool.query(
    `SELECT COUNT(*) as count FROM employees e WHERE (e.is_system IS NULL OR e.is_system = 0)${tenantFilter}`,
    tenantId ? [tenantId] : []
  );
  const [todayStats] = await pool.query(
    `SELECT COUNT(*) as signed_in, SUM(CASE WHEN sign_out_time IS NOT NULL THEN 1 ELSE 0 END) as signed_out
     FROM attendance_records a
     WHERE a.date = CURDATE()` + (tenantId ? ' AND a.tenant_id = ?' : ''),
    tenantId ? [tenantId] : []
  );
  const [recentActivity] = await pool.query(
    `SELECT a.date, COUNT(DISTINCT a.employee_id) as employees_count
     FROM attendance_records a
     WHERE a.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)` + (tenantId ? ' AND a.tenant_id = ?' : '') + `
     GROUP BY a.date ORDER BY a.date DESC`,
    tenantId ? [tenantId] : []
  );

  res.json({
    totalEmployees: totalEmployees[0].count,
    todaySignedIn: todayStats[0].signed_in || 0,
    todaySignedOut: todayStats[0].signed_out || 0,
    recentActivity,
  });
}

async function getMonthlyReport(req, res) {
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  const tenantId = req.tenantId;

  const [settingsRows] = await pool.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('work_week_start', 'work_week_end')"
  );
  const s = {};
  for (const row of settingsRows) s[row.key] = row.value;
  const workWeekStart = s.work_week_start || 'Sunday';
  const workWeekEnd = s.work_week_end || 'Thursday';

  const [holidays] = await pool.query(
    'SELECT date FROM holidays WHERE YEAR(date) = ? AND MONTH(date) = ?',
    [year, month]
  );
  const holidaySet = new Set(holidays.map((h) => new Date(h.date).toISOString().split('T')[0]));

  const daysInMonth = getDaysInMonth(year, month);
  let totalWorkDays = 0;
  const workDates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = date.toISOString().split('T')[0];
    if (isWorkDay(date, workWeekStart, workWeekEnd) && !holidaySet.has(dateStr)) {
      totalWorkDays++;
      workDates.push(dateStr);
    }
  }

  const tenantFilter = tenantId ? ' AND e.tenant_id = ?' : '';
  const tenantAttFilter = tenantId ? ' AND a.tenant_id = ?' : '';
  const [rows] = await pool.query(
    `SELECT
       e.id, e.name, e.email, e.employee_id,
       COUNT(a.id) as days_worked,
       COALESCE(SUM(TIMESTAMPDIFF(MINUTE, a.sign_in_time, a.sign_out_time)), 0) as total_minutes,
       SUM(CASE WHEN a.sign_out_time IS NULL THEN 1 ELSE 0 END) as missing_sign_outs,
       SUM(CASE WHEN a.type = 'wfh' OR a.type IS NULL THEN 1 ELSE 0 END) as wfh_days,
       SUM(CASE WHEN a.type = 'office' THEN 1 ELSE 0 END) as office_days
     FROM employees e
     LEFT JOIN attendance_records a
       ON a.employee_id = e.id AND YEAR(a.date) = ? AND MONTH(a.date) = ?${tenantAttFilter}
      WHERE (e.is_system IS NULL OR e.is_system = 0)${tenantFilter}
     GROUP BY e.id
     ORDER BY days_worked DESC, e.name ASC`,
    tenantId ? [year, month, tenantId, tenantId] : [year, month]
  );

  // Fetch leave balances for the report
  const [allBalances] = await pool.query('SELECT * FROM leave_balances');
  const balanceMap = {};
  for (const b of allBalances) {
    if (!balanceMap[b.employee_id]) balanceMap[b.employee_id] = {};
    balanceMap[b.employee_id][b.leave_type] = b.balance;
  }

  const report = rows.map((r) => {
    const pastWorkDays = workDates.filter((wd) => wd <= now.toISOString().split('T')[0]).length;
    const absenceDays = Math.max(0, pastWorkDays - (r.days_worked || 0));
    const empBal = balanceMap[r.id] || {};
    return {
      ...r,
      total_hours: r.total_minutes > 0 ? parseFloat((r.total_minutes / 60).toFixed(1)) : 0,
      avg_hours_per_day: r.days_worked > 0 ? parseFloat((r.total_minutes / 60 / r.days_worked).toFixed(1)) : 0,
      wfh_days: r.wfh_days || 0,
      office_days: r.office_days || 0,
      absence_days: absenceDays,
      balances: empBal,
      annual_balance: empBal.annual || 0,
      sick_balance: empBal.sick || 0,
      casual_balance: empBal.casual || 0,
    };
  });

  const activeEmployees = report.filter((r) => r.days_worked > 0);

  res.json({
    year,
    month,
    report,
    summary: {
      total_employees: report.length,
      active_employees: activeEmployees.length,
      total_hours: parseFloat(activeEmployees.reduce((s, r) => s + r.total_hours, 0).toFixed(1)),
      total_days: activeEmployees.reduce((s, r) => s + r.days_worked, 0),
    },
  });
}

async function getPendingSignoutRequests(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const tenantId = req.tenantId;
  const tenantFilter = tenantId ? ' AND sr.tenant_id = ?' : '';

  const [rows] = await pool.query(
    `SELECT sr.*, a.date, a.sign_in_time, e.name as employee_name, e.email as employee_email,
            d.name as department_name
     FROM signout_requests sr
     JOIN attendance_records a ON sr.attendance_record_id = a.id
     JOIN employees e ON sr.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE sr.status = 'pending'${tenantFilter}
     ORDER BY sr.created_at ASC
     LIMIT ? OFFSET ?`,
    tenantId ? [tenantId, limit, offset] : [limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM signout_requests sr WHERE sr.status = 'pending'${tenantFilter}`,
    tenantId ? [tenantId] : []
  );

  res.json({
    requests: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function adminApproveSignoutRequest(req, res) {
  const { id } = req.params;
  const adminId = req.admin?.id || req.employee?.id;
  const tenantId = req.tenantId;

  const [rows] = await pool.query(
    "SELECT * FROM signout_requests WHERE id = ? AND status = 'pending'" + (tenantId ? ' AND tenant_id = ?' : ''),
    tenantId ? [id, tenantId] : [id]
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Sign-out request not found or already processed' });
  }

  const sr = rows[0];
  await pool.query(
    'UPDATE signout_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
    ['approved', adminId, id]
  );

  await pool.query(
    'UPDATE attendance_records SET sign_out_time = ?, is_manual_sign_out = 1 WHERE id = ?',
    [sr.sign_out_time, sr.attendance_record_id]
  );

  await createNotification(
    sr.employee_id,
    'Sign-Out Request Approved',
    'Your sign-out request has been approved by an administrator.',
    'success',
    '/missing-signout'
  );

  try {
    const [empRows] = await pool.query('SELECT name, email FROM employees WHERE id = ?', [sr.employee_id]);
    const [recRows] = await pool.query('SELECT date FROM attendance_records WHERE id = ?', [sr.attendance_record_id]);
    const emailService = require('../../shared/services/email.service');
    await emailService.sendSignOutRequestApprovedEmail(empRows[0], {
      date: recRows[0].date,
      signOutTime: new Date(sr.sign_out_time).toLocaleTimeString(),
    });
  } catch (e) { console.error('Sign-out approved email error:', e); }

  await logActivity(sr.employee_id, adminId, 'signout_approved', `Admin approved sign-out request (record #${sr.attendance_record_id})`);

  res.json({ message: 'Sign-out request approved' });
}

async function adminRejectSignoutRequest(req, res) {
  const { id } = req.params;
  const { rejection_reason } = req.body;
  const adminId = req.admin?.id || req.employee?.id;
  const tenantId = req.tenantId;

  const [rows] = await pool.query(
    "SELECT * FROM signout_requests WHERE id = ? AND status = 'pending'" + (tenantId ? ' AND tenant_id = ?' : ''),
    tenantId ? [id, tenantId] : [id]
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Sign-out request not found or already processed' });
  }

  const sr = rows[0];
  await pool.query(
    'UPDATE signout_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? WHERE id = ?',
    ['rejected', adminId, rejection_reason || null, id]
  );

  await createNotification(
    sr.employee_id,
    'Sign-Out Request Rejected',
    rejection_reason
      ? `Your sign-out request was rejected by an administrator: ${rejection_reason}`
      : 'Your sign-out request was rejected by an administrator.',
    'error',
    '/missing-signout'
  );

  try {
    const [empRows] = await pool.query('SELECT name, email FROM employees WHERE id = ?', [sr.employee_id]);
    const [recRows] = await pool.query('SELECT date FROM attendance_records WHERE id = ?', [sr.attendance_record_id]);
    const emailService = require('../../shared/services/email.service');
    await emailService.sendSignOutRequestRejectedEmail(empRows[0], { date: recRows[0].date, signOutTime: '' }, rejection_reason);
  } catch (e) { console.error('Sign-out rejected email error:', e); }

  await logActivity(sr.employee_id, adminId, 'signout_rejected', `Admin rejected sign-out request (record #${sr.attendance_record_id}): ${rejection_reason || 'No reason'}`);

  res.json({ message: 'Sign-out request rejected' });
}

async function updateRecordSignOut(req, res) {
  const { id } = req.params;
  const { sign_out_time, notes } = req.body;
  const tenantId = req.tenantId;

  if (!sign_out_time) {
    return res.status(400).json({ error: 'Sign-out time is required' });
  }

  const [rows] = await pool.query(
    'SELECT * FROM attendance_records WHERE id = ?' + (tenantId ? ' AND tenant_id = ?' : ''),
    tenantId ? [id, tenantId] : [id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Record not found' });
  }

  await pool.query(
    'UPDATE attendance_records SET sign_out_time = ?, is_manual_sign_out = 1, notes = COALESCE(?, notes) WHERE id = ?',
    [new Date(sign_out_time), notes || null, id]
  );

  await logActivity(rows[0].employee_id, req.admin?.id || req.hr?.id || null, 'signout_direct_update', `Admin directly set sign-out time on record #${id}`);

  res.json({ message: 'Sign-out time updated' });
}

async function triggerMissingSignOutCheck(req, res) {
  try {
    const result = await runMissingSignOutCheck();
    const logAdminId = req.admin?.id || req.hr?.id || null;
    await logActivity(null, logAdminId, 'missing_signout_check', `Triggered missing sign-out check — ${result.processed || 0} processed, ${result.reminded || 0} reminded`);
    res.json({ message: 'Check complete', ...result });
  } catch (err) {
    console.error('[Admin] Error triggering missing sign-out check:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getEmployees, getEmployee, updateEmployee, deleteEmployee, getRecords, deleteRecord, exportExcel, getStats, getMonthlyReport, getPendingSignoutRequests, adminApproveSignoutRequest, adminRejectSignoutRequest, updateRecordSignOut, triggerMissingSignOutCheck };



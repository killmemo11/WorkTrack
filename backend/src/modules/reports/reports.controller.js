// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { isWorkDay, getDaysInMonth } = require('../../shared/utils/work-day.util');
const XLSX = require('xlsx');

function getDateRangeWorkDays(from, to, workWeekStart, workWeekEnd, holidaySet) {
  let count = 0;
  const current = new Date(from);
  while (current <= to) {
    const d = current.toISOString().split('T')[0];
    if (isWorkDay(current, workWeekStart, workWeekEnd) && !holidaySet.has(d)) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

async function exportKayanReport(req, res) {
  const { date_from, date_to, employee_id } = req.query;

  let where = [];
  let params = [];

  if (employee_id) { where.push('a.employee_id = ?'); params.push(employee_id); }
  if (date_from) { where.push('a.date >= ?'); params.push(date_from); }
  if (date_to) { where.push('a.date <= ?'); params.push(date_to); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT a.date, a.sign_in_time, a.sign_out_time,
            e.employee_id as code
     FROM attendance_records a
     JOIN employees e ON a.employee_id = e.id
     ${whereClause}
     ORDER BY a.date ASC, e.employee_id ASC`,
    params
  );

  const data = [];
  for (const r of rows) {
    if (r.sign_in_time) {
      data.push({
        Code: r.code || '',
        'Punch Date': r.date,
        'Punch Time': new Date(r.sign_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        Function: 'I',
      });
    }
    if (r.sign_out_time) {
      data.push({
        Code: r.code || '',
        'Punch Date': r.date,
        'Punch Time': new Date(r.sign_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        Function: 'O',
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kayan');

  ws['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
  ];

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=kayan_report.xlsx');
  res.send(buf);
}

async function exportAttendanceReport(req, res) {
  const { date_from, date_to, employee_id } = req.query;

  let where = [];
  let params = [];

  if (employee_id) { where.push('a.employee_id = ?'); params.push(employee_id); }
  if (date_from) { where.push('a.date >= ?'); params.push(date_from); }
  if (date_to) { where.push('a.date <= ?'); params.push(date_to); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT a.date, a.type, e.name as employee_name, e.email, e.employee_id as emp_number,
            e.department, d.name as department_name,
            a.sign_in_time, a.sign_out_time, a.notes, a.is_manual_sign_out
     FROM attendance_records a
     JOIN employees e ON a.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     ${whereClause}
     ORDER BY a.date DESC, e.name ASC`,
    params
  );

  const data = rows.map((r) => ({
    Date: r.date,
    Type: (r.type || 'wfh').charAt(0).toUpperCase() + (r.type || 'wfh').slice(1),
    'Employee Name': r.employee_name,
    'Emp ID': r.emp_number || '',
    Email: r.email,
    Department: r.department_name || r.department || '',
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

  ws['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 28 },
    { wch: 18 }, { wch: 10 }, { wch: 10 },
    { wch: 10 }, { wch: 30 }, { wch: 14 },
  ];

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.xlsx');
  res.send(buf);
}

async function exportLeaveReport(req, res) {
  const { date_from, date_to, status, employee_id } = req.query;

  let where = [];
  let params = [];

  if (employee_id) { where.push('lr.employee_id = ?'); params.push(employee_id); }
  if (date_from) { where.push('lr.start_date >= ?'); params.push(date_from); }
  if (date_to) { where.push('lr.end_date <= ?'); params.push(date_to); }
  if (status) { where.push('lr.status = ?'); params.push(status); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT lr.id, lr.type, lr.start_date, lr.end_date, lr.days_count, lr.status, lr.reason,
            lr.rejection_reason, lr.created_at, lr.reviewed_at,
            e.name as employee_name, e.email, e.employee_id as emp_number,
            d.name as department_name
     FROM leave_requests lr
     JOIN employees e ON lr.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     ${whereClause}
     ORDER BY lr.created_at DESC`,
    params
  );

  const data = rows.map((r) => ({
    ID: r.id,
    Employee: r.employee_name,
    'Emp ID': r.emp_number || '',
    Email: r.email,
    Department: r.department_name || '',
    Type: r.type.charAt(0).toUpperCase() + r.type.slice(1),
    'Start Date': r.start_date,
    'End Date': r.end_date,
    Days: r.days_count,
    Status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    Reason: r.reason || '',
    'Rejection Reason': r.rejection_reason || '',
    Submitted: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    Reviewed: r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '',
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leaves');

  ws['!cols'] = [
    { wch: 6 }, { wch: 22 }, { wch: 10 }, { wch: 28 },
    { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    { wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 30 },
    { wch: 14 }, { wch: 14 },
  ];

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=leave_report.xlsx');
  res.send(buf);
}

async function getBalanceAudit(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { employee_id, action } = req.query;

  let where = [];
  let params = [];

  if (employee_id) { where.push('ba.employee_id = ?'); params.push(employee_id); }
  if (action) { where.push('ba.action = ?'); params.push(action); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT ba.*, e.name as employee_name, e.employee_id as emp_number
     FROM balance_audit ba
     JOIN employees e ON ba.employee_id = e.id
     ${whereClause}
     ORDER BY ba.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM balance_audit ba ${whereClause}`, params
  );

  res.json({
    entries: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function getActivityLog(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const { employee_id, action } = req.query;

  let where = [];
  let params = [];

  if (employee_id) { where.push('(al.employee_id = ? OR al.admin_id = ?)'); params.push(employee_id, employee_id); }
  if (action) { where.push('al.action = ?'); params.push(action); }

  const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

  const [rows] = await pool.query(
    `SELECT al.*,
            COALESCE(au.username, actor_e.name, target_e.name, 'System') as actor_name,
            CASE
              WHEN al.admin_id IS NOT NULL AND au.id IS NOT NULL THEN 'Admin'
              WHEN al.admin_id IS NOT NULL AND actor_e.id IS NOT NULL THEN 'Employee'
              WHEN al.employee_id IS NOT NULL THEN 'Employee'
              ELSE 'System'
            END as actor_type,
            actor_e.employee_id as actor_employee_number,
            COALESCE(target_e.name, 'System') as target_name,
            target_e.employee_id as target_employee_number,
            CASE WHEN al.employee_id IS NOT NULL THEN 'Employee' ELSE 'System' END as target_type
     FROM activity_log al
     LEFT JOIN admin_users au ON al.admin_id = au.id
     LEFT JOIN employees actor_e ON al.admin_id = actor_e.id
     LEFT JOIN employees target_e ON al.employee_id = target_e.id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) as total FROM activity_log al ${whereClause}`, params
  );

  res.json({
    entries: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit),
  });
}

async function exportEmployeeSummary(req, res) {
  const { date_from, date_to } = req.query;

  if (!date_from || !date_to) {
    return res.status(400).json({ error: 'date_from and date_to are required' });
  }

  const from = new Date(date_from + 'T00:00:00');
  const to = new Date(date_to + 'T00:00:00');

  // Get work week settings
  const [settingsRows] = await pool.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('work_week_start', 'work_week_end')"
  );
  const s = {};
  for (const row of settingsRows) s[row.key] = row.value;
  const workWeekStart = s.work_week_start || 'Sunday';
  const workWeekEnd = s.work_week_end || 'Thursday';

  // Get holidays in range
  const [holidays] = await pool.query(
    'SELECT date FROM holidays WHERE date >= ? AND date <= ?',
    [date_from, date_to]
  );
  const holidaySet = new Set(holidays.map((h) => new Date(h.date).toISOString().split('T')[0]));

  const totalWorkDays = getDateRangeWorkDays(from, to, workWeekStart, workWeekEnd, holidaySet);

  // Get all employees
  const [employees] = await pool.query(
    "SELECT e.id, e.employee_id, e.name, e.email, d.name as department_name FROM employees e LEFT JOIN departments d ON e.department_id = d.id WHERE (e.is_system IS NULL OR e.is_system = 0) ORDER BY e.name"
  );

  // Get attendance per employee
  const [attendance] = await pool.query(
    `SELECT a.employee_id,
            COUNT(*) as days_worked,
            SUM(TIMESTAMPDIFF(MINUTE, a.sign_in_time, a.sign_out_time)) as total_minutes,
            SUM(CASE WHEN a.type = 'office' THEN 1 ELSE 0 END) as office_days,
            SUM(CASE WHEN a.type = 'wfh' OR a.type IS NULL THEN 1 ELSE 0 END) as wfh_days,
            SUM(CASE WHEN a.sign_out_time IS NULL THEN 1 ELSE 0 END) as missing_sign_outs
     FROM attendance_records a
     WHERE a.date >= ? AND a.date <= ?
     GROUP BY a.employee_id`,
    [date_from, date_to]
  );
  const attMap = {};
  for (const a of attendance) attMap[a.employee_id] = a;

  // Get approved leave days per employee within the range (count only days that fall in range)
  const [leaves] = await pool.query(
    `SELECT lr.employee_id, lr.type, lr.days_count,
            lr.start_date, lr.end_date
     FROM leave_requests lr
     WHERE lr.status = 'approved'
       AND lr.start_date <= ? AND lr.end_date >= ?`,
    [date_to, date_from]
  );

  const leaveMap = {};
  const leaveTypeTotals = {};
  for (const l of leaves) {
    if (!leaveMap[l.employee_id]) leaveMap[l.employee_id] = [];
    leaveMap[l.employee_id].push(l);
    if (!leaveTypeTotals[l.employee_id]) leaveTypeTotals[l.employee_id] = {};
    const lStart = new Date(Math.max(new Date(l.start_date), from));
    const lEnd = new Date(Math.min(new Date(l.end_date), to));
    let daysInRange = 0;
    const current = new Date(lStart);
    while (current <= lEnd) {
      const d = current.toISOString().split('T')[0];
      if (isWorkDay(current, workWeekStart, workWeekEnd) && !holidaySet.has(d)) daysInRange++;
      current.setDate(current.getDate() + 1);
    }
    leaveTypeTotals[l.employee_id][l.type] = (leaveTypeTotals[l.employee_id][l.type] || 0) + daysInRange;
  }

  const data = employees.map((emp) => {
    const att = attMap[emp.id] || { days_worked: 0, total_minutes: 0, office_days: 0, wfh_days: 0, missing_sign_outs: 0 };
    const empLeaves = leaveTypeTotals[emp.id] || {};
    const totalLeaveDays = Object.values(empLeaves).reduce((s, v) => s + v, 0);
    const totalHours = att.total_minutes > 0 ? parseFloat((att.total_minutes / 60).toFixed(1)) : 0;
    const absenceDays = Math.max(0, totalWorkDays - att.days_worked - totalLeaveDays);

    return {
      'Employee Name': emp.name,
      'Emp ID': emp.employee_id || '',
      Email: emp.email,
      Department: emp.department_name || '',
      'Total Work Days': totalWorkDays,
      'Days Worked': att.days_worked,
      'WFH Days': att.wfh_days,
      'Office Days': att.office_days,
      'Absence Days': absenceDays,
      'Total Leave Days': totalLeaveDays,
      'Annual Leave Days': empLeaves.annual || 0,
      'Sick Leave Days': empLeaves.sick || 0,
      'Casual Leave Days': empLeaves.casual || 0,
      'Personal Leave Days': empLeaves.personal || 0,
      'Unpaid Leave Days': empLeaves.unpaid || 0,
      'Total Hours': totalHours + 'h',
      'Avg Hours/Day': att.days_worked > 0 ? parseFloat((totalHours / att.days_worked).toFixed(1)) + 'h' : '0h',
      'Missing Sign-Outs': att.missing_sign_outs,
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employee Summary');

  ws['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 28 }, { wch: 18 },
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 },
    { wch: 12 }, { wch: 14 }, { wch: 16 },
  ];

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=employee_summary.xlsx');
  res.send(buf);
}

module.exports = { exportKayanReport, exportAttendanceReport, exportLeaveReport, exportEmployeeSummary, getBalanceAudit, getActivityLog };


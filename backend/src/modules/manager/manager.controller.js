// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { isWorkDay, getDaysInMonth } = require('../../shared/utils/work-day.util');

async function getManagerTeamDashboard(req, res) {
  const managerId = req.employee.id;

  const [mgrRows] = await pool.query('SELECT department_id FROM employees WHERE id = ?', [managerId]);
  if (!mgrRows[0].department_id) {
    return res.json({ team: [], summary: null });
  }
  const deptId = mgrRows[0].department_id;

  // Get work week settings
  const [settingsRows] = await pool.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('work_week_start', 'work_week_end')"
  );
  const s = {};
  for (const row of settingsRows) s[row.key] = row.value;
  const workWeekStart = s.work_week_start || 'Sunday';
  const workWeekEnd = s.work_week_end || 'Thursday';

  // Get today's date info
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const todayIsWorkDay = isWorkDay(today, workWeekStart, workWeekEnd);

  // Get department info
  const [deptRows] = await pool.query('SELECT * FROM departments WHERE id = ?', [deptId]);

  // Get team members
  const [team] = await pool.query(
    `SELECT e.id, e.employee_id, e.name, e.email, e.role, e.is_active, e.created_at
     FROM employees e
     WHERE e.department_id = ? AND e.id != ? AND (e.is_system IS NULL OR e.is_system = 0)
     ORDER BY e.name ASC`,
    [deptId, managerId]
  );

  // Get today's attendance for team
  const [todayAttendance] = await pool.query(
    `SELECT a.* FROM attendance_records a
     WHERE a.date = CURDATE() AND a.employee_id IN (${team.length ? team.map(() => '?').join(',') : 'NULL'})`,
    team.map((e) => e.id)
  );
  const attMap = {};
  for (const a of todayAttendance) {
    attMap[a.employee_id] = a;
  }

  // Get pending leave counts
  const [pendingLeaves] = await pool.query(
    `SELECT lr.employee_id, COUNT(*) as count
     FROM leave_requests lr
     WHERE lr.status = 'pending' AND lr.employee_id IN (${team.length ? team.map(() => '?').join(',') : 'NULL'})
     GROUP BY lr.employee_id`,
    team.map((e) => e.id)
  );
  const pendingMap = {};
  for (const p of pendingLeaves) pendingMap[p.employee_id] = p.count;

  // Get approved leaves today
  const [approvedLeaves] = await pool.query(
    `SELECT lr.employee_id, lr.type
     FROM leave_requests lr
     WHERE lr.status = 'approved' AND lr.start_date <= ? AND lr.end_date >= ? AND lr.employee_id IN (${team.length ? team.map(() => '?').join(',') : 'NULL'})`,
    [todayStr, todayStr, ...team.map((e) => e.id)]
  );
  const leaveMap = {};
  for (const l of approvedLeaves) {
    leaveMap[l.employee_id] = l.type;
  }

  // Get this period summary stats
  const [periodRows] = await pool.query(
    "SELECT `value` FROM settings WHERE `key` = 'period_start_day'"
  );
  const periodStartDay = parseInt(periodRows.length > 0 ? periodRows[0].value : 15);
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const periodStart = new Date(year, month - 2, periodStartDay + 1).toISOString().split('T')[0];
  const periodEnd = new Date(year, month - 1, periodStartDay).toISOString().split('T')[0];

  const [periodAttendance] = await pool.query(
    `SELECT a.employee_id,
            COUNT(*) as days_worked,
            SUM(CASE WHEN a.sign_out_time IS NULL THEN 1 ELSE 0 END) as missing_sign_outs,
            SUM(CASE WHEN a.type = 'office' THEN 1 ELSE 0 END) as office_days,
            SUM(CASE WHEN a.type = 'wfh' OR a.type IS NULL THEN 1 ELSE 0 END) as wfh_days
     FROM attendance_records a
     WHERE a.date >= ? AND a.date <= ? AND a.employee_id IN (${team.length ? team.map(() => '?').join(',') : 'NULL'})
     GROUP BY a.employee_id`,
    [periodStart, periodEnd, ...team.map((e) => e.id)]
  );
  const periodMap = {};
  for (const p of periodAttendance) periodMap[p.employee_id] = p;

  const teamWithStatus = team.map((e) => {
    const att = attMap[e.id];
    const pending = pendingMap[e.id] || 0;
    const onLeave = leaveMap[e.id] || null;
    const period = periodMap[e.id] || null;
    let status = 'absent';
    if (onLeave) status = 'leave';
    else if (att && att.sign_out_time) status = 'signed_out';
    else if (att) status = 'signed_in';
    else if (!todayIsWorkDay) status = 'off_day';

    return {
      ...e,
      today_status: status,
      today_type: att?.type || null,
      today_sign_in: att?.sign_in_time || null,
      today_sign_out: att?.sign_out_time || null,
      on_leave_type: onLeave,
      pending_leave_count: pending,
      period_days_worked: period?.days_worked || 0,
      period_missing_sign_outs: period?.missing_sign_outs || 0,
      period_office_days: period?.office_days || 0,
      period_wfh_days: period?.wfh_days || 0,
    };
  });

  const summary = {
    total_members: team.length,
    signed_in: teamWithStatus.filter((e) => e.today_status === 'signed_in').length,
    signed_out: teamWithStatus.filter((e) => e.today_status === 'signed_out').length,
    absent: teamWithStatus.filter((e) => e.today_status === 'absent').length,
    on_leave: teamWithStatus.filter((e) => e.today_status === 'leave').length,
    department_name: deptRows[0]?.name || '',
  };

  res.json({ team: teamWithStatus, summary });
}

module.exports = { getManagerTeamDashboard };


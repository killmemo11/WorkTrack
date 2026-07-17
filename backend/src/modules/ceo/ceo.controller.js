// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { isWorkDay, getDaysInMonth } = require('../../shared/utils/work-day.util');
const logger = require('../../shared/utils/logger');

async function getCeoDashboard(req, res) {
  try {
    const now = new Date();
    const reqYear = parseInt(req.query.year) || now.getFullYear();
    const reqMonth = parseInt(req.query.month) || (now.getMonth() + 1);

    // Determine month range
    const isCurrentMonth = reqYear === now.getFullYear() && reqMonth === (now.getMonth() + 1);
    const monthStart = new Date(reqYear, reqMonth - 1, 1);
    const monthEnd = isCurrentMonth ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : new Date(reqYear, reqMonth, 0);
    const endStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;

    // Get settings
    const [settingsRows] = await pool.query(
      "SELECT `key`, `value` FROM settings WHERE `key` IN ('work_week_start', 'work_week_end', 'period_start_day', 'period_end_day')"
    );
    const s = {};
    for (const row of settingsRows) s[row.key] = row.value;
    const workWeekStart = s.work_week_start || 'Sunday';
    const workWeekEnd = s.work_week_end || 'Thursday';

    // Get holidays in month range
    const [holidays] = await pool.query(
      'SELECT date FROM holidays WHERE date >= ? AND date <= ?',
      [monthStart, monthEnd]
    );
    const holidaySet = new Set(holidays.map((h) => new Date(h.date).toISOString().split('T')[0]));

    // Build work day list for the month range
    const workDays = [];
    const cursor = new Date(monthStart);
    while (cursor <= monthEnd) {
      const dayStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (isWorkDay(cursor, workWeekStart, workWeekEnd) && !holidaySet.has(dayStr)) {
        workDays.push(dayStr);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    const totalWorkDays = workDays.length;

    // Check if viewer is global CEO or department C-Level
    const [ceoSetting] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email'");
    const ceoEmail = ceoSetting.length > 0 ? ceoSetting[0].value.trim().toLowerCase() : '';
    const isGlobalCeo = ceoEmail.length > 0 && req.employee.email.toLowerCase() === ceoEmail;

    // Get all active employees with departments (exclude system accounts)
    const [employees] = await pool.query(
      `SELECT e.id, e.employee_id, e.name, e.email, e.role, e.department_id, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE (e.is_system IS NULL OR e.is_system = 0) AND e.is_active = 1
       ORDER BY d.name ASC, e.name ASC`
    );

    // Get departments with manager info
    const [deptRows] = await pool.query(
      `SELECT d.*,
         (SELECT e.name FROM employees e WHERE e.email = d.manager_email LIMIT 1) AS manager_name
        FROM departments d ORDER BY d.name ASC`
    );

    // Get pending leave counts per department for CEO read-only view
    const [pendingLeaves] = await pool.query(
      `SELECT e.department_id, COUNT(*) AS pending_count
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       WHERE lr.status = 'pending'
       GROUP BY e.department_id`
    );
    const pendingMap = {};
    for (const pl of pendingLeaves) {
      pendingMap[pl.department_id] = pl.pending_count;
    }
    const deptMap = {};
    for (const dept of deptRows) {
      deptMap[dept.id] = { ...dept, employees: [] };
    }

    // Today's date string
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayIsWorkDay = workDays.includes(todayStr);

    // Get all goals
    let allGoals = [];
    try {
      const [goals] = await pool.query('SELECT eg.*, e.department_id FROM employee_goals eg JOIN employees e ON eg.employee_id = e.id');
      allGoals = goals;
    } catch (err) {
      // Goals table might not exist yet
    }
    const goalsByDept = {};
    for (const g of allGoals) {
      const deptId = g.department_id || 0;
      if (!goalsByDept[deptId]) goalsByDept[deptId] = [];
      goalsByDept[deptId].push(g);
    }
    const goalsByEmp = {};
    for (const g of allGoals) {
      if (!goalsByEmp[g.employee_id]) goalsByEmp[g.employee_id] = [];
      goalsByEmp[g.employee_id].push(g);
    }

    // Get today's attendance
    const [todayAttendance] = await pool.query(
      `SELECT ar1.* FROM attendance_records ar1
       INNER JOIN (
         SELECT employee_id, MAX(id) AS max_id FROM attendance_records WHERE date = ? GROUP BY employee_id
       ) ar2 ON ar1.id = ar2.max_id`,
      [todayStr]
    );
    const todayAttMap = {};
    for (const rec of todayAttendance) {
      todayAttMap[rec.employee_id] = rec;
    }

    // Get today's approved leaves
    const [todayLeaves] = await pool.query(
      "SELECT * FROM leave_requests WHERE status = 'approved' AND start_date <= ? AND end_date >= ?",
      [todayStr, todayStr]
    );
    const todayLeaveEmpIds = new Set(todayLeaves.map((l) => l.employee_id));

    // Get month attendance records for ALL employees in one query
    const [monthAttendance] = await pool.query(
      `SELECT ar1.* FROM attendance_records ar1
       INNER JOIN (
         SELECT employee_id, date, MAX(id) AS max_id FROM attendance_records
         WHERE date >= ? AND date <= ? GROUP BY employee_id, date
       ) ar2 ON ar1.id = ar2.max_id`,
      [monthStart, monthEnd]
    );
    // Group by employee_id
    const monthAttMap = {};
    for (const rec of monthAttendance) {
      if (!monthAttMap[rec.employee_id]) monthAttMap[rec.employee_id] = [];
      monthAttMap[rec.employee_id].push(rec);
    }

    // Get month approved leaves for ALL employees
    const [monthLeaves] = await pool.query(
      "SELECT * FROM leave_requests WHERE status = 'approved' AND start_date <= ? AND end_date >= ?",
      [monthEnd, monthStart]
    );
    // Calculate leave days per employee within our range
    // Annual & Casual leave count as regular work days (Egyptian labor law)
    const isAnnualOrCasual = (type) => type === 'annual' || type === 'casual';
    const monthLeaveDaysMap = {};
    const monthAnnualCasualDaysMap = {};
    for (const leave of monthLeaves) {
      const leaveStart = new Date(leave.start_date);
      const leaveEnd = new Date(leave.end_date);
      const rangeStart = leaveStart > monthStart ? leaveStart : monthStart;
      const rangeEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd;
      const cursor2 = new Date(rangeStart);
      while (cursor2 <= rangeEnd) {
        const dayStr2 = `${cursor2.getFullYear()}-${String(cursor2.getMonth() + 1).padStart(2, '0')}-${String(cursor2.getDate()).padStart(2, '0')}`;
        if (isWorkDay(cursor2, workWeekStart, workWeekEnd) && !holidaySet.has(dayStr2)) {
          if (isAnnualOrCasual(leave.type)) {
            if (!monthAnnualCasualDaysMap[leave.employee_id]) monthAnnualCasualDaysMap[leave.employee_id] = 0;
            monthAnnualCasualDaysMap[leave.employee_id]++;
          } else {
            if (!monthLeaveDaysMap[leave.employee_id]) monthLeaveDaysMap[leave.employee_id] = 0;
            monthLeaveDaysMap[leave.employee_id]++;
          }
        }
        cursor2.setDate(cursor2.getDate() + 1);
      }
    }

    // Get all leave balances
    const [allBalances] = await pool.query('SELECT employee_id, leave_type, balance FROM leave_balances');
    const balanceMap = {};
    for (const b of allBalances) {
      if (!balanceMap[b.employee_id]) balanceMap[b.employee_id] = {};
      balanceMap[b.employee_id][b.leave_type] = parseFloat(b.balance);
    }

    // Get recruitment metrics
    let recruitmentMetrics = { total: 0, hired: 0, pending: 0 };
    try {
      const [recruitment] = await pool.query(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN stage = 'hired' THEN 1 ELSE 0 END) as hired,
           SUM(CASE WHEN stage IN ('applied', 'phone', 'first', 'second', 'third') THEN 1 ELSE 0 END) as pending
         FROM recruitment_candidates`,
        []
      );
      recruitmentMetrics = recruitment[0];
    } catch (err) {
      // Recruitment table might not exist yet
    }

    // Get headcount metrics
    let headcountMetrics = { total: 0, capacity: 0, utilization: 0 };
    try {
      const [headcount] = await pool.query(
        `SELECT 
           COUNT(*) as total,
           SUM(max_headcount) as capacity,
           SUM(CASE WHEN max_headcount > 0 THEN 1 ELSE 0 END) as departments_with_capacity
         FROM departments`,
        []
      );
      headcountMetrics = headcount[0];
      headcountMetrics.utilization = headcountMetrics.capacity > 0 ? 
        Math.round((headcountMetrics.total / headcountMetrics.capacity) * 100) : 0;
    } catch (err) {
      // Headcount metrics might not be available
    }

    // Get performance review metrics
    let performanceMetrics = { total: 0, completed: 0, pending: 0 };
    try {
      const [performance] = await pool.query(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END) as pending
         FROM performance_reviews`,
        []
      );
      performanceMetrics = performance[0];
    } catch (err) {
      // Performance reviews table might not exist yet
    }

    // If viewer is a department C-Level (not global CEO), only show their departments
    const allowedDeptIds = new Set();
    if (isGlobalCeo || req.employee.role === 'admin') {
      // Global CEO and admin see all departments
      for (const deptId of Object.keys(deptMap)) allowedDeptIds.add(parseInt(deptId));
    } else if (req.employee.role === 'ceo') {
      // Department C-Level: only show departments where c_level_email matches
      const [cleDepts] = await pool.query(
        'SELECT id FROM departments WHERE c_level_email = ?',
        [req.employee.email]
      );
      for (const d of cleDepts) allowedDeptIds.add(d.id);
    }

    // Build employee data per department
    const empTotals = { attendance: 0, work: 0, present_today: 0, on_leave_today: 0, absent_today: 0 };

    for (const emp of employees) {
      const deptId = emp.department_id || 0;
      if (!deptMap[deptId]) {
        // Employees without a department
        deptMap[deptId] = { id: deptId, name: 'Unassigned', manager_email: '', manager_name: null, employees: [] };
      }

      // Today status
      const todayRec = todayAttMap[emp.id];
      const isOnLeaveToday = todayLeaveEmpIds.has(emp.id);
      let todayStatus = null;
      if (isOnLeaveToday) {
        todayStatus = { status: 'on_leave', type: null };
      } else if (todayRec && !todayRec.sign_out_time) {
        todayStatus = { status: 'signed_in', type: todayRec.type || 'wfh' };
      } else if (todayRec && todayRec.sign_out_time) {
        todayStatus = { status: 'signed_out', type: todayRec.type || 'wfh' };
      } else if (todayIsWorkDay) {
        todayStatus = { status: 'absent', type: null };
      } else {
        todayStatus = { status: 'off', type: null };
      }

      if (todayIsWorkDay && todayStatus.status === 'signed_in') empTotals.present_today++;
      if (todayIsWorkDay && isOnLeaveToday) empTotals.on_leave_today++;
      if (todayIsWorkDay && todayStatus.status === 'absent') empTotals.absent_today++;

      // Month stats
      const attDays = monthAttMap[emp.id] || [];
      const monthOfficeDays = attDays.filter((a) => a.type === 'office' && a.sign_in_time).length;
      const monthWfhDays = attDays.filter((a) => a.type === 'wfh' && a.sign_in_time).length;
      const monthAnnualCasualDays = monthAnnualCasualDaysMap[emp.id] || 0;
      const monthAttDays = monthOfficeDays + monthWfhDays + monthAnnualCasualDays;
      const monthLeaveDays = monthLeaveDaysMap[emp.id] || 0;
      const monthAbsenceDays = Math.max(0, totalWorkDays - monthAttDays - monthLeaveDays);

      empTotals.attendance += monthAttDays;
      empTotals.work += totalWorkDays;

      const empGoals = goalsByEmp[emp.id] || [];
      const avgGoalProgress = empGoals.length > 0
        ? Math.round(empGoals.reduce((sum, g) => sum + parseFloat(g.progress_percentage), 0) / empGoals.length)
        : 0;

      const empData = {
        id: emp.id,
        employee_id: emp.employee_id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        department_id: emp.department_id,
        department_name: emp.department_name,
        today: todayStatus,
        goals: empGoals,
        avg_goal_progress: avgGoalProgress,
        month: {
          total_work_days: totalWorkDays,
          attendance_days: monthAttDays,
          office_days: monthOfficeDays,
          wfh_days: monthWfhDays,
          annual_casual_days: monthAnnualCasualDays,
          absence_days: monthAbsenceDays,
          leave_days: monthLeaveDays,
          attendance_rate: totalWorkDays > 0 ? Math.round((monthAttDays / totalWorkDays) * 100) : 0,
        },
        balances: balanceMap[emp.id] || {},
      };

      deptMap[deptId].employees.push(empData);
    }

    // Build department list with summary
    const departments = [];
    let totalEmpCount = 0;
    for (const deptId of Object.keys(deptMap).sort((a, b) => (deptMap[a].name || '').localeCompare(deptMap[b].name || ''))) {
      const dept = deptMap[deptId];
      if (dept.employees.length === 0) continue;
      if (!allowedDeptIds.has(dept.id)) continue;
      totalEmpCount += dept.employees.length;

      // Sort: C-Level first, then Manager, then rest
      dept.employees.sort((a, b) => {
        if (a.role === 'ceo' && b.role !== 'ceo') return -1;
        if (a.role !== 'ceo' && b.role === 'ceo') return 1;
        if (a.role === 'manager' && b.role !== 'manager') return -1;
        if (a.role !== 'manager' && b.role === 'manager') return 1;
        return a.name.localeCompare(b.name);
      });

      // Department today stats
      const deptTodayPresent = dept.employees.filter((e) => e.today.status === 'signed_in').length;
      const deptTodayLeave = dept.employees.filter((e) => e.today.status === 'on_leave').length;
      const deptTodayAbsent = dept.employees.filter((e) => e.today.status === 'absent').length;

      // Department month stats
      const deptMonthAtt = dept.employees.reduce((sum, e) => sum + e.month.attendance_days, 0);
      const deptMonthWork = dept.employees.reduce((sum, e) => sum + e.month.total_work_days, 0);

      // Department goals stats
      const deptGoals = goalsByDept[dept.id] || [];
      const deptAvgGoalProgress = deptGoals.length > 0
        ? Math.round(deptGoals.reduce((sum, g) => sum + parseFloat(g.progress_percentage), 0) / deptGoals.length)
        : 0;
      const deptGoalsCount = deptGoals.length;

      departments.push({
        id: dept.id,
        name: dept.name || 'Unassigned',
        employee_count: dept.employees.length,
        manager: dept.manager_name || (dept.employees.find((e) => e.role === 'manager')?.name || null),
        pending_leaves: pendingMap[dept.id] || 0,
        today: {
          present: deptTodayPresent,
          on_leave: deptTodayLeave,
          absent: deptTodayAbsent,
        },
        month: {
          total_work_days: deptMonthWork,
          attendance_days: deptMonthAtt,
          attendance_rate: deptMonthWork > 0 ? Math.round((deptMonthAtt / deptMonthWork) * 100) : 0,
        },
        employees: dept.employees,
        goals: {
          total: deptGoalsCount,
          avg_progress: deptAvgGoalProgress,
        },
      });
    }

    const totalAttendanceRate = empTotals.work > 0 ? Math.round((empTotals.attendance / empTotals.work) * 100) : 0;

    res.json({
      month: { year: reqYear, month: reqMonth, label: `${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` },
      is_current_month: isCurrentMonth,
      today: todayStr,
      summary: {
        total_employees: totalEmpCount,
        present_today: todayIsWorkDay ? empTotals.present_today : 0,
        on_leave_today: todayIsWorkDay ? empTotals.on_leave_today : 0,
        absent_today: todayIsWorkDay ? empTotals.absent_today : 0,
        attendance_rate: totalAttendanceRate,
        month_work_days: totalWorkDays,
        recruitment_metrics: {
          total_candidates: recruitmentMetrics.total || 0,
          hired: recruitmentMetrics.hired || 0,
          pending: recruitmentMetrics.pending || 0,
          hiring_rate: recruitmentMetrics.total ? Math.round((recruitmentMetrics.hired / recruitmentMetrics.total) * 100) : 0
        },
        headcount_metrics: {
          total_employees: headcountMetrics.total || 0,
          total_capacity: headcountMetrics.capacity || 0,
          utilization_rate: headcountMetrics.utilization || 0
        },
        performance_metrics: {
          total_reviews: performanceMetrics.total || 0,
          completed: performanceMetrics.completed || 0,
          pending: performanceMetrics.pending || 0,
          completion_rate: performanceMetrics.total ? Math.round((performanceMetrics.completed / performanceMetrics.total) * 100) : 0
        }
      },
      departments,
    });
  } catch (err) {
    logger.error('CEO Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load CEO dashboard' });
  }
}

module.exports = { getCeoDashboard };


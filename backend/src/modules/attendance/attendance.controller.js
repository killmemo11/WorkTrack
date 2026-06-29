// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { isWorkDay, getDaysInMonth, getTodayDateString, formatDateCairo } = require('../../shared/utils/work-day.util');
const { sendSignInEmail, sendSignOutEmail, sendSignOutRequestPendingEmail } = require('../../shared/services/email.service');
const { createNotification, notifyAllAdmins } = require('../../shared/services/notification.service');

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function signIn(req, res) {
  const employeeId = req.employee.id;
  const today = getTodayDateString();
  const type = req.body.type || 'wfh';
  const { latitude, longitude } = req.body;

  if (!['wfh', 'office'].includes(type)) {
    return res.status(400).json({ error: 'Invalid attendance type. Must be "wfh" or "office".' });
  }

  // Check service toggles
  const [svcRows] = await pool.query("SELECT `key`, `value` FROM settings WHERE `key` IN ('service_wfh', 'service_office_attendance')");
  const svc = {};
  for (const r of svcRows) svc[r.key] = r.value;
  if (type === 'wfh' && svc.service_wfh === '0') {
    return res.status(403).json({ error: 'WFH sign-in is disabled by the administrator' });
  }
  if (type === 'office' && svc.service_office_attendance === '0') {
    return res.status(403).json({ error: 'Office attendance is disabled by the administrator' });
  }

  const [empRows] = await pool.query('SELECT can_wfh FROM employees WHERE id = ?', [employeeId]);
  const canWfh = empRows[0]?.can_wfh;

  if (type === 'wfh' && !canWfh) {
    return res.status(403).json({ error: 'WFH attendance is disabled for your account. You must sign in from the office.' });
  }

  if (latitude != null && longitude != null) {
    const [settingsRows] = await pool.query(
      "SELECT `key`, `value` FROM settings WHERE `key` IN ('office_lat', 'office_lng', 'office_radius_meters')"
    );
    const officeSettings = {};
    for (const row of settingsRows) officeSettings[row.key] = row.value;

    const olat = parseFloat(officeSettings.office_lat) || 30.0444;
    const olng = parseFloat(officeSettings.office_lng) || 31.2357;
    const radius = parseFloat(officeSettings.office_radius_meters) || 200;

    const distance = getDistanceFromLatLonInMeters(latitude, longitude, olat, olng);

    if (type === 'office' && distance > radius) {
      return res.status(403).json({
        error: `You are outside the office area (${Math.round(distance)}m away, max ${radius}m). Please sign in as WFH or move to the office location.`,
        distance: Math.round(distance),
        maxRadius: radius,
      });
    }

    if (type === 'wfh' && distance <= radius) {
      return res.status(403).json({
        error: `You are within the office area (${Math.round(distance)}m). Please use Office sign-in instead.`,
        distance: Math.round(distance),
        maxRadius: radius,
      });
    }
  } else if (type === 'office') {
    return res.status(400).json({ error: 'Location is required for office sign-in' });
  }

  const [existing] = await pool.query(
    'SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?',
    [employeeId, today]
  );

  if (existing.length > 0) {
    return res.status(400).json({ error: 'Already signed in today' });
  }

  const now = new Date();
  let result;
  try {
    [result] = await pool.query(
      'INSERT INTO attendance_records (employee_id, date, type, sign_in_time) VALUES (?, ?, ?, ?)',
      [employeeId, today, type, now]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Already signed in today' });
    }
    throw err;
  }

  const record = { id: result.insertId, employee_id: employeeId, date: today, type, sign_in_time: now };

  try { await sendSignInEmail(req.employee, record); } catch (e) { console.error('Email error:', e); }
  await createNotification(employeeId, 'Sign-In Successful', `You signed in (${type === 'office' ? 'Office' : 'WFH'}) at ${new Date(now).toLocaleTimeString()}.`, 'success');

  res.status(201).json(record);
}

async function signOut(req, res) {
  const employeeId = req.employee.id;

  const today = getTodayDateString();
  const { notes } = req.body || {};

  const [records] = await pool.query(
    'SELECT * FROM attendance_records WHERE employee_id = ? AND date = ? AND sign_out_time IS NULL',
    [employeeId, today]
  );

  if (records.length === 0) {
    return res.status(400).json({ error: 'No active session found. Have you signed in today?' });
  }

  const now = new Date();
  await pool.query(
    'UPDATE attendance_records SET sign_out_time = ?, notes = CONCAT(COALESCE(notes, ""), ?) WHERE id = ?',
    [now, notes ? ` | ${notes}` : '', records[0].id]
  );

  const record = {
    ...records[0],
    date: records[0].date instanceof Date ? formatDateCairo(records[0].date) : records[0].date,
    sign_out_time: now,
    notes: records[0].notes || notes || '',
  };

  try { await sendSignOutEmail(req.employee, record); } catch (e) { console.error('Email error:', e); }
  const diffMs = new Date(now) - new Date(record.sign_in_time);
  const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(1);
  await createNotification(employeeId, 'Sign-Out Successful', `You signed out at ${new Date(now).toLocaleTimeString()}. Total: ${totalHours}h.`, 'success');

  res.json(record);
}

async function status(req, res) {
  const employeeId = req.employee.id;
  const today = getTodayDateString();

  const [records] = await pool.query(
    'SELECT * FROM attendance_records WHERE employee_id = ? AND date = ?',
    [employeeId, today]
  );

  const record = records[0] ? {
    ...records[0],
    date: records[0].date instanceof Date ? formatDateCairo(records[0].date) : records[0].date,
  } : null;

  res.json({
    signedIn: records.length > 0,
    signedOut: records.length > 0 && records[0].sign_out_time !== null,
    record,
  });
}

async function history(req, res) {
  const employeeId = req.employee.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    'SELECT * FROM attendance_records WHERE employee_id = ? ORDER BY date DESC LIMIT ? OFFSET ?',
    [employeeId, limit, offset]
  );

  const [countRows] = await pool.query(
    'SELECT COUNT(*) as total FROM attendance_records WHERE employee_id = ?',
    [employeeId]
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

async function missingSignOut(req, res) {
  const employeeId = req.employee.id;

  const [rows] = await pool.query(
    "SELECT * FROM attendance_records WHERE employee_id = ? AND sign_out_time IS NULL AND date != CURDATE() ORDER BY date DESC",
    [employeeId]
  );

  res.json(rows);
}

const { determineApprover } = require('../../shared/services/signout-request.service');

async function requestSignOut(req, res) {
  const employeeId = req.employee.id;
  const { recordId, signOutTime, notes } = req.body;

  if (!recordId || !signOutTime) {
    return res.status(400).json({ error: 'Record ID and sign out time are required' });
  }

  const [records] = await pool.query(
    'SELECT * FROM attendance_records WHERE id = ? AND employee_id = ? AND sign_out_time IS NULL',
    [recordId, employeeId]
  );

  if (records.length === 0) {
    return res.status(404).json({ error: 'Record not found or already signed out' });
  }

  const [existing] = await pool.query(
    'SELECT * FROM signout_requests WHERE attendance_record_id = ? AND status = "pending"',
    [recordId]
  );
  if (existing.length > 0) {
    return res.status(400).json({ error: 'A pending request already exists for this record' });
  }

  const signOutDate = new Date(signOutTime);
  await pool.query(
    'INSERT INTO signout_requests (employee_id, attendance_record_id, sign_out_time, notes) VALUES (?, ?, ?, ?)',
    [employeeId, recordId, signOutDate, notes || null]
  );

  const { type: approverType, approverId } = await determineApprover(employeeId);

  const record = records[0];

  await createNotification(
    employeeId,
    'Sign-Out Request Submitted',
    `Your sign-out request for ${record.date} at ${signOutDate.toLocaleTimeString()} has been submitted for ${approverType === 'admin' ? 'admin' : 'your ' + approverType + "'s"} approval.`,
    'info',
    '/missing-signout'
  );

  if (approverId) {
    try {
      const [approverRows] = await pool.query('SELECT id, name, email FROM employees WHERE id = ?', [approverId]);
      if (approverRows.length > 0) {
        const employee = req.employee;
        const requestInfo = {
          date: record.date,
          signInTime: new Date(record.sign_in_time).toLocaleTimeString(),
          signOutTime: signOutDate.toLocaleTimeString(),
          notes: notes || '',
        };
        await sendSignOutRequestPendingEmail(approverRows[0], employee, requestInfo);

        await createNotification(
          approverId,
          'Sign-Out Request Pending',
          `${employee.name} submitted a sign-out request for ${record.date}.`,
          'warning',
          '/manager/approvals'
        );
      }
    } catch (e) {
      console.error('Sign-out request notification error:', e);
    }
  } else {
    try {
      const employee = req.employee;
      await notifyAllAdmins(
        'Sign-Out Request Requires Review',
        `${employee.name} submitted a sign-out request for ${record.date}. No manager/C-Level assigned — admin review needed.`,
        'warning',
        '/admin/signout-requests'
      );
    } catch (e) {
      console.error('Admin sign-out notification error:', e);
    }
  }

  res.status(201).json({ message: 'Sign-out request submitted for approval' });
}

async function getMySignOutRequests(req, res) {
  const employeeId = req.employee.id;

  const [rows] = await pool.query(
    `SELECT sr.*, a.date, a.sign_in_time
     FROM signout_requests sr
     JOIN attendance_records a ON sr.attendance_record_id = a.id
     WHERE sr.employee_id = ?
     ORDER BY sr.created_at DESC`,
    [employeeId]
  );

  res.json(rows);
}

async function completeSignOut(req, res) {
  const employeeId = req.employee.id;
  const { recordId, signOutTime, notes } = req.body;

  if (!recordId || !signOutTime) {
    return res.status(400).json({ error: 'Record ID and sign out time are required' });
  }

  const [records] = await pool.query(
    'SELECT * FROM attendance_records WHERE id = ? AND employee_id = ? AND sign_out_time IS NULL',
    [recordId, employeeId]
  );

  if (records.length === 0) {
    return res.status(404).json({ error: 'Record not found or already signed out' });
  }

  const signOutDate = new Date(signOutTime);
  await pool.query(
    'UPDATE attendance_records SET sign_out_time = ?, sign_out_notes = ?, is_manual_sign_out = 1 WHERE id = ?',
    [signOutDate, notes || null, recordId]
  );

  const record = { ...records[0], sign_out_time: signOutDate, notes: notes || '' };

  try { await sendSignOutEmail(req.employee, record); } catch (e) { console.error('Email error:', e); }

  res.json(record);
}

async function getAttendancePeriodFromDb() {
  const [rows] = await pool.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('period_start_day', 'period_end_day')"
  );
  const s = {};
  for (const row of rows) s[row.key] = row.value;
  return {
    period_start_day: parseInt(s.period_start_day) || 15,
    period_end_day: parseInt(s.period_end_day) || 16,
  };
}

function calcPeriodDates(now, startDay, endDay) {
  let currentMonth = now.getMonth() + 1;
  let currentYear = now.getFullYear();

  // Build period end date for current month
  let periodEnd = new Date(currentYear, currentMonth - 1, endDay);
  periodEnd.setHours(23, 59, 59, 999);

  // If today is past the period end, advance to next period
  if (now > periodEnd) {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  }

  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) { prevMonth = 12; prevYear = currentYear - 1; }

  return {
    date_from: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
    date_to: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
  };
}

async function monthlySummary(req, res) {
  const employeeId = req.employee.id;
  const now = new Date();
  const period = await getAttendancePeriodFromDb();
  const pd = calcPeriodDates(now, period.period_start_day, period.period_end_day);
  const dateFrom = req.query.date_from || pd.date_from;
  const dateTo = req.query.date_to || pd.date_to;

  const [settingsRows] = await pool.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('work_week_start', 'work_week_end')"
  );
  const s = {};
  for (const row of settingsRows) s[row.key] = row.value;
  const workWeekStart = s.work_week_start || 'Sunday';
  const workWeekEnd = s.work_week_end || 'Thursday';

  const [holidays] = await pool.query(
    'SELECT date FROM holidays WHERE date >= ? AND date <= ?',
    [dateFrom, dateTo]
  );
  const holidaySet = new Set(holidays.map((h) => h.date instanceof Date ? formatDateCairo(h.date) : h.date));

  const [leaves] = await pool.query(
    `SELECT start_date, end_date FROM leave_requests
     WHERE employee_id = ? AND status = 'approved' AND start_date <= ? AND end_date >= ?`,
    [employeeId, dateTo, dateFrom]
  );
  const leaveDates = new Set();
  for (const lv of leaves) {
    const lvStart = lv.start_date instanceof Date ? formatDateCairo(lv.start_date) : lv.start_date;
    const lvEnd = lv.end_date instanceof Date ? formatDateCairo(lv.end_date) : lv.end_date;
    let ld = new Date(lvStart + 'T00:00:00');
    const endD = new Date(lvEnd + 'T00:00:00');
    while (ld <= endD) {
      const ds = formatDateCairo(ld);
      leaveDates.add(ds);
      ld.setDate(ld.getDate() + 1);
    }
  }

  const [records] = await pool.query(
    `SELECT type, date FROM attendance_records
     WHERE employee_id = ? AND date >= ? AND date <= ?
     ORDER BY date ASC`,
    [employeeId, dateFrom, dateTo]
  );

  let wfhDays = 0;
  let officeDays = 0;
  const presentDays = new Set();

  for (const r of records) {
    const dateStr = r.date instanceof Date ? formatDateCairo(r.date) : r.date;
    presentDays.add(dateStr);
    if (r.type === 'office') officeDays++;
    else wfhDays++;
  }

  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  let workDayCount = 0;
  let absenceDays = 0;
  let leaveDaysCount = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = formatDateCairo(d);
    const isOffDay = !isWorkDay(d, workWeekStart, workWeekEnd);
    const isHoliday = holidaySet.has(dateStr);
    const isPresent = presentDays.has(dateStr);
    const isLeave = leaveDates.has(dateStr);
    if (!isOffDay && !isHoliday) {
      workDayCount++;
      if (isLeave && d < now) leaveDaysCount++;
    }
    if (!isOffDay && !isHoliday && !isPresent && d < now && !isLeave) absenceDays++;
  }

  res.json({
    date_from: dateFrom,
    date_to: dateTo,
    wfh_days: wfhDays,
    office_days: officeDays,
    total_present: presentDays.size,
    absence_days: absenceDays,
    leave_days: leaveDaysCount,
    total_work_days: workDayCount,
    holidays_count: holidays.length,
  });
}

async function calendar(req, res) {
  const employeeId = req.employee.id;
  const now = new Date();
  const period = await getAttendancePeriodFromDb();
  const pd = calcPeriodDates(now, period.period_start_day, period.period_end_day);
  const dateFrom = req.query.date_from || pd.date_from;
  const dateTo = req.query.date_to || pd.date_to;

  const [settingsRows] = await pool.query(
    "SELECT `key`, `value` FROM settings WHERE `key` IN ('work_week_start', 'work_week_end')"
  );
  const s = {};
  for (const row of settingsRows) s[row.key] = row.value;
  const workWeekStart = s.work_week_start || 'Sunday';
  const workWeekEnd = s.work_week_end || 'Thursday';

  const [holidays] = await pool.query(
    'SELECT date, name FROM holidays WHERE date >= ? AND date <= ? ORDER BY date ASC',
    [dateFrom, dateTo]
  );
  const holidayMap = {};
  for (const h of holidays) {
    const dateStr = h.date instanceof Date ? formatDateCairo(h.date) : h.date;
    holidayMap[dateStr] = h.name || 'Holiday';
  }

  const [records] = await pool.query(
    `SELECT date, type, sign_in_time, sign_out_time FROM attendance_records
     WHERE employee_id = ? AND date >= ? AND date <= ?
     ORDER BY date ASC`,
    [employeeId, dateFrom, dateTo]
  );
  const recordMap = {};
  for (const r of records) {
    const dateStr = r.date instanceof Date ? formatDateCairo(r.date) : r.date;
    recordMap[dateStr] = {
      type: r.type,
      sign_in_time: r.sign_in_time,
      sign_out_time: r.sign_out_time,
    };
  }

  // Get approved leaves in range
  const [leaves] = await pool.query(
    `SELECT type, start_date, end_date FROM leave_requests
     WHERE employee_id = ? AND status = 'approved' AND start_date <= ? AND end_date >= ?`,
    [employeeId, dateTo, dateFrom]
  );
  const leaveMap = {};
  for (const lv of leaves) {
    const lvStart = lv.start_date instanceof Date ? formatDateCairo(lv.start_date) : lv.start_date;
    const lvEnd = lv.end_date instanceof Date ? formatDateCairo(lv.end_date) : lv.end_date;
    let ld = new Date(lvStart + 'T00:00:00');
    const endD = new Date(lvEnd + 'T00:00:00');
    while (ld <= endD) {
      const ds = `${ld.getFullYear()}-${String(ld.getMonth() + 1).padStart(2, '0')}-${String(ld.getDate()).padStart(2, '0')}`;
      if (!leaveMap[ds]) leaveMap[ds] = [];
      leaveMap[ds].push(lv.type);
      ld.setDate(ld.getDate() + 1);
    }
  }

  // Build month grids for all months in range
  const startParts = dateFrom.split('-').map(Number);
  const endParts = dateTo.split('-').map(Number);
  const months = [];
  let cy = startParts[0], cm = startParts[1];
  while (cy < endParts[0] || (cy === endParts[0] && cm <= endParts[1])) {
    const daysInMonth = getDaysInMonth(cy, cm);
    const monthDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${cy}-${String(cm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const date = new Date(dateStr + 'T00:00:00');
      const inPeriod = dateStr >= dateFrom && dateStr <= dateTo;
      const isOffDay = !isWorkDay(date, workWeekStart, workWeekEnd);
      const isHoliday = holidayMap[dateStr] !== undefined;
      const hasRecord = recordMap[dateStr] !== undefined;

      monthDays.push({
        date: dateStr,
        day: d,
        month: cm,
        year: cy,
        is_off_day: isOffDay,
        is_holiday: isHoliday,
        holiday_name: holidayMap[dateStr] || null,
        type: hasRecord ? recordMap[dateStr].type : null,
        signed_in: hasRecord,
        signed_out: hasRecord && recordMap[dateStr].sign_out_time !== null,
        sign_in_time: hasRecord ? recordMap[dateStr].sign_in_time : null,
        sign_out_time: hasRecord ? recordMap[dateStr].sign_out_time : null,
        is_future: date > now,
        in_period: inPeriod,
        leaves: leaveMap[dateStr] || [],
      });
    }
    months.push({ year: cy, month: cm, days: monthDays });
    cm++;
    if (cm > 12) { cm = 1; cy++; }
  }

  res.json({ date_from: dateFrom, date_to: dateTo, months, period_days: period });
}

module.exports = { signIn, signOut, status, history, missingSignOut, completeSignOut, monthlySummary, calendar, requestSignOut, getMySignOutRequests };



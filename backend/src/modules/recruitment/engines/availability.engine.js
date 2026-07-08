const pool = require('../../../shared/config/database');

async function getWeeklySlots(employeeId) {
  const [rows] = await pool.query(
    `SELECT * FROM manager_availability
     WHERE employee_id = ? AND slot_type = 'weekly' AND is_active = 1
     ORDER BY day_of_week, start_time`,
    [employeeId]
  );
  return rows;
}

async function getBlockedDates(employeeId, dateFrom, dateTo) {
  const [rows] = await pool.query(
    `SELECT id, blocked_date, reason FROM manager_availability
     WHERE employee_id = ? AND slot_type = 'blocked' AND is_active = 1
       AND blocked_date BETWEEN ? AND ?
     ORDER BY blocked_date`,
    [employeeId, dateFrom, dateTo]
  );
  return rows;
}

async function isAvailable(employeeId, date, time) {
  const dayOfWeek = new Date(date).getDay() || 7;

  const [blocked] = await pool.query(
    `SELECT id FROM manager_availability
     WHERE employee_id = ? AND slot_type = 'blocked' AND is_active = 1 AND blocked_date = ?
     LIMIT 1`,
    [employeeId, date]
  );
  if (blocked.length > 0) return false;

  const [slots] = await pool.query(
    `SELECT id FROM manager_availability
     WHERE employee_id = ? AND slot_type = 'weekly' AND is_active = 1
       AND day_of_week = ? AND start_time <= ? AND end_time >= ?
     LIMIT 1`,
    [employeeId, dayOfWeek, time, time]
  );
  return slots.length > 0;
}

async function getAvailableSlots(employeeId, dateFrom, dateTo) {
  const weeklySlots = await getWeeklySlots(employeeId);
  const blockedDates = await getBlockedDates(employeeId, dateFrom, dateTo);
  const results = [];

  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const blockedSet = new Set(blockedDates.map(b => b.blocked_date));
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    if (blockedSet.has(dateStr)) continue;

    const dayOfWeek = d.getDay() || 7;
    const daySlots = weeklySlots.filter(s => s.day_of_week === dayOfWeek);
    for (const slot of daySlots) {
      results.push({
        date: dateStr,
        day_of_week: dayOfWeek,
        start_time: slot.start_time,
        end_time: slot.end_time,
      });
    }
  }
  return results;
}

async function upsertWeeklySlot(employeeId, dayOfWeek, startTime, endTime) {
  await pool.query(
    `INSERT INTO manager_availability (employee_id, slot_type, day_of_week, start_time, end_time, is_active)
     VALUES (?, 'weekly', ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), is_active = 1`,
    [employeeId, dayOfWeek, startTime, endTime]
  );
}

async function blockDate(employeeId, blockedDate, reason) {
  await pool.query(
    `INSERT INTO manager_availability (employee_id, slot_type, blocked_date, reason, is_active)
     VALUES (?, 'blocked', ?, ?, 1)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason), is_active = 1`,
    [employeeId, blockedDate, reason || '']
  );
}

async function unblockDate(employeeId, blockedDate) {
  await pool.query(
    `UPDATE manager_availability SET is_active = 0
     WHERE employee_id = ? AND slot_type = 'blocked' AND blocked_date = ?`,
    [employeeId, blockedDate]
  );
}

async function deleteWeeklySlot(employeeId, slotId) {
  await pool.query(
    `DELETE FROM manager_availability WHERE id = ? AND employee_id = ? AND slot_type = 'weekly'`,
    [slotId, employeeId]
  );
}

module.exports = { getWeeklySlots, getBlockedDates, isAvailable, getAvailableSlots, upsertWeeklySlot, blockDate, unblockDate, deleteWeeklySlot };

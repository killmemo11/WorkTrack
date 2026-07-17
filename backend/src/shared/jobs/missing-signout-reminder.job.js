// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const cron = require('node-cron');
const pool = require('../config/database');
const { sendMissingSignOutReminderEmail } = require('../services/email.service');
const { createNotification } = require('../services/notification.service');
const { getTodayDateString } = require('../utils/work-day.util');
const logger = require('../utils/logger');

let lastScanDate = null;

async function runMissingSignOutCheck() {
  const today = getTodayDateString();
  if (lastScanDate === today) {
    logger.info('[MissingSignOut] Already ran today — skipping duplicate');
    return { skipped: true };
  }

  logger.info('[MissingSignOut] Running missing sign-out reminder check...');
  try {
    const [records] = await pool.query(
      `SELECT a.*, e.name as employee_name, e.email as employee_email, e.id as employee_id
       FROM attendance_records a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.sign_out_time IS NULL AND a.date < CURDATE()
       AND (e.is_system IS NULL OR e.is_system = 0)`
    );

    const byEmployee = {};
    for (const r of records) {
      if (!byEmployee[r.employee_id]) {
        byEmployee[r.employee_id] = {
          employee: { id: r.employee_id, name: r.employee_name, email: r.employee_email },
          records: [],
        };
      }
      byEmployee[r.employee_id].records.push(r);
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const empId of Object.keys(byEmployee)) {
      const { employee, records } = byEmployee[empId];
      const recordIds = records.map((r) => r.id);

      const [existingRequests] = await pool.query(
        'SELECT DISTINCT attendance_record_id FROM signout_requests WHERE attendance_record_id IN (?) AND status IN ("pending", "approved")',
        [recordIds]
      );
      const alreadyRequested = new Set(existingRequests.map((r) => r.attendance_record_id));
      const unsentRecords = records.filter((r) => !alreadyRequested.has(r.id));

      if (unsentRecords.length === 0) continue;

      try {
        await sendMissingSignOutReminderEmail(employee, unsentRecords);
        logger.info(`[MissingSignOut] Sent reminder email to ${employee.email} (${employee.name})`);
        emailsSent++;
      } catch (e) {
        logger.error(`[MissingSignOut] Email error for ${employee.email}:`, e.message);
        if (e.response) logger.error('[MissingSignOut] SMTP response:', e.response);
        emailsFailed++;
      }

      const fmtDate = (d) => {
        const dt = new Date(d);
        return dt.toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      };
      await createNotification(
        employee.id,
        'Missing Sign-Out',
        `You forgot to sign out on ${unsentRecords.map((r) => fmtDate(r.date)).join(', ')}. Please complete it.`,
        'warning',
        '/missing-signout'
      );
    }

    logger.info(`[MissingSignOut] Check complete: ${Object.keys(byEmployee).length} employees, ${emailsSent} emails sent, ${emailsFailed} failed`);
    lastScanDate = today;
    return { employees: Object.keys(byEmployee).length, sent: emailsSent, failed: emailsFailed };
  } catch (err) {
    logger.error('[MissingSignOut] Error in missing sign-out reminder:', err);
    throw err;
  }
}

function startMissingSignOutReminderJob() {
  cron.schedule('0 7 * * *', async () => {
    try {
      await runMissingSignOutCheck();
    } catch (err) {
      logger.error('[Cron] Error in missing sign-out reminder:', err);
    }
  });

  logger.info('[Cron] Missing sign-out reminder scheduled for 7:00 AM daily');
}

module.exports = { startMissingSignOutReminderJob, runMissingSignOutCheck };

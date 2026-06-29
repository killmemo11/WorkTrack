// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const cron = require('node-cron');
const pool = require('../config/database');
const { logActivity } = require('../services/activity.service');

function startExpiryReminderJob() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Running expiry reminder check...');
    try {
      // Contract end date within 30 days
      const [contracts] = await pool.query(
        `SELECT ep.employee_id, e.name, e.email, ep.contract_end_date
         FROM employee_profiles ep
         JOIN employees e ON ep.employee_id = e.id
         WHERE ep.contract_end_date IS NOT NULL
           AND ep.contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
           AND (e.is_system IS NULL OR e.is_system = 0)`
      );
      for (const c of contracts) {
        console.log(`[Cron] Contract ending soon: ${c.name} - ${c.contract_end_date}`);
      }

      // Probation period ends within 14 days (hire_date + 90 days)
      const [probation] = await pool.query(
        `SELECT ep.employee_id, e.name, e.email, ep.hire_date
         FROM employee_profiles ep
         JOIN employees e ON ep.employee_id = e.id
         WHERE ep.hire_date IS NOT NULL
           AND ep.contract_type = 'probation'
           AND DATE_ADD(ep.hire_date, INTERVAL 90 DAY) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
           AND (e.is_system IS NULL OR e.is_system = 0)`
      );
      for (const p of probation) {
        const endDate = new Date(p.hire_date);
        endDate.setDate(endDate.getDate() + 90);
        console.log(`[Cron] Probation ending soon: ${p.name} - ${endDate.toISOString().split('T')[0]}`);
      }

      // ID/Passport expiry within 30 days
      const [ids] = await pool.query(
        `SELECT ep.employee_id, e.name, e.email, ep.id_expiry, ep.passport_expiry
         FROM employee_profiles ep
         JOIN employees e ON ep.employee_id = e.id
         WHERE ((ep.id_expiry IS NOT NULL AND ep.id_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY))
            OR (ep.passport_expiry IS NOT NULL AND ep.passport_expiry BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)))
           AND (e.is_system IS NULL OR e.is_system = 0)`
      );
      for (const d of ids) {
        console.log(`[Cron] ID/Passport expiring soon: ${d.name}`);
      }

      console.log(`[Cron] Expiry reminder check complete (${contracts.length} contracts, ${probation.length} probations, ${ids.length} ID/passports)`);
    } catch (err) {
      console.error('[Cron] Error in expiry reminder:', err);
    }
  });

  console.log('[Cron] Expiry reminder scheduled for 8:00 AM daily');
}

module.exports = { startExpiryReminderJob };

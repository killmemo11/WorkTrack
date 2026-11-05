// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const cron = require('node-cron');
const logger = require('../utils/logger');
const { reminderSweep, generateMonthlyInvoices } = require('../services/billing.service');

function startBillingJob() {
  // Overdue reminders: at most one every 3 days per invoice (enforced in SQL).
  cron.schedule('15 7 * * *', async () => {
    try {
      const result = await reminderSweep();
      logger.info(`[Billing] Reminder sweep: ${result.sent} sent, ${result.skipped} skipped (${result.candidates} due)`);
    } catch (err) {
      logger.error('[Billing] Reminder sweep failed:', err);
    }
  });

  // Draft the new month's invoices on the 1st; sending stays manual.
  cron.schedule('45 5 1 * *', async () => {
    try {
      const result = await generateMonthlyInvoices();
      logger.info(`[Billing] Generated ${result.created} draft invoice(s) for ${result.period.start}`);
    } catch (err) {
      logger.error('[Billing] Invoice generation failed:', err);
    }
  });

  logger.info('[Cron] Billing reminders (7:15 daily) and monthly invoicing (1st, 5:45) scheduled');
}

module.exports = { startBillingJob };

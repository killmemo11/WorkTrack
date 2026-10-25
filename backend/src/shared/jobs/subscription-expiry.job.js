// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const cron = require('node-cron');
const pool = require('../config/database');
const logger = require('../utils/logger');
const { sendPlatformEmail } = require('../services/platform-email.service');
const { escapeHtml } = require('../utils/sanitize');

async function sendTrialEmail(tenant, daysLeft) {
  const ended = daysLeft === null;
  const subject = ended
    ? `Your ${tenant.name} trial has ended`
    : `Your ${tenant.name} trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  const body = ended
    ? `has ended, so the workspace has been suspended.`
    : `ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`;
  await sendPlatformEmail(
    tenant.contact_email,
    subject,
    `<p style="color:#475569;font-size:14px;">
       The free trial for <strong>${escapeHtml(tenant.name)}</strong> ${body}
     </p>
     <p style="color:#475569;font-size:14px;margin-top:16px;">
       ${ended
         ? 'Contact our team to reactivate your workspace on a paid plan.'
         : 'To keep your workspace active, contact our team to upgrade your plan before the trial expires.'}
     </p>`
  ).catch((err) => logger.error(`[Cron] Trial email failed for tenant ${tenant.id}:`, err.message));
}

async function expireTrials() {
  const [expired] = await pool.query(
    `SELECT id, name, contact_email FROM tenants
     WHERE status = 'active' AND plan = 'trial'
       AND trial_ends_at IS NOT NULL AND trial_ends_at < CURDATE()
       AND deleted_at IS NULL`
  );

  for (const tenant of expired) {
    const [result] = await pool.query(
      `UPDATE tenants SET status = 'suspended'
       WHERE id = ? AND status = 'active' AND plan = 'trial' AND trial_ends_at < CURDATE()`,
      [tenant.id]
    );
    if (result.affectedRows > 0) {
      logger.info(`[Cron] Suspended tenant ${tenant.id} (${tenant.name}): trial expired`);
      await sendTrialEmail(tenant, null);
    }
  }

  const [endingSoon] = await pool.query(
    `SELECT id, name, contact_email, DATEDIFF(trial_ends_at, CURDATE()) AS days_left
     FROM tenants
     WHERE status = 'active' AND plan = 'trial'
       AND trial_ends_at IS NOT NULL
       AND DATEDIFF(trial_ends_at, CURDATE()) = 3
       AND deleted_at IS NULL`
  );

  for (const tenant of endingSoon) {
    logger.info(`[Cron] Tenant ${tenant.id} (${tenant.name}) trial ends in ${tenant.days_left} days`);
    await sendTrialEmail(tenant, tenant.days_left);
  }

  logger.info(`[Cron] Subscription check complete (${expired.length} suspended, ${endingSoon.length} ending soon)`);
}

function startSubscriptionExpiryJob() {
  cron.schedule('30 6 * * *', async () => {
    try {
      await expireTrials();
    } catch (err) {
      logger.error('[Cron] Subscription expiry job failed:', err);
    }
  });
  logger.info('[Cron] Subscription expiry scheduled for 6:30 AM daily');
}

module.exports = { startSubscriptionExpiryJob, expireTrials };

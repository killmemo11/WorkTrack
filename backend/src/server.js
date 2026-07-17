// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');
const logger = require('./shared/utils/logger');

// Point to full ICU data so Alpine's small-icu supports Africa/Cairo
process.env.NODE_ICU_DATA = process.env.NODE_ICU_DATA || path.join(__dirname, '..', 'node_modules', 'full-icu');

// Ensure timezone is set (overrides Alpine's missing tzdata)
process.env.TZ = process.env.TZ || 'Africa/Cairo';

// Validate required env vars
const requiredEnv = ['JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    logger.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

// Production safety checks
if (process.env.NODE_ENV === 'production') {
  if (process.env.JWT_SECRET === 'super-secret-key-change-in-production-123456') {
    logger.error('FATAL: JWT_SECRET is the weak default. Change it immediately.');
    process.exit(1);
  }
  const prodRequired = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  for (const key of prodRequired) {
    if (!process.env[key]) {
      logger.error(`FATAL: Missing required production environment variable: ${key}`);
      process.exit(1);
    }
  }
}

const app = require('./app');
const pool = require('./shared/config/database');

const PORT = process.env.PORT || 5000;

const { seed } = require('./seed');

async function waitForDB(retries = 15, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      logger.info('Connected to MySQL');
      return;
    } catch (err) {
      logger.info(`Waiting for MySQL (${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('MySQL connection failed after retries');
}

const { startMissingSignOutReminderJob, runMissingSignOutCheck } = require('./shared/jobs/missing-signout-reminder.job');
const { startExpiryReminderJob } = require('./shared/jobs/expiry-reminder.job');

async function start() {
  try {
    await waitForDB();
    await seed();
    runMissingSignOutCheck().catch(() => {});
    startMissingSignOutReminderJob();
    startExpiryReminderJob();
    app.listen(PORT, () => logger.info(`Backend running on port ${PORT}`));
  } catch (err) {
    logger.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
}

start();

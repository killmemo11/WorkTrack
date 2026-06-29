// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');

// Point to full ICU data so Alpine's small-icu supports Africa/Cairo
process.env.NODE_ICU_DATA = process.env.NODE_ICU_DATA || path.join(__dirname, '..', 'node_modules', 'full-icu');

// Ensure timezone is set (overrides Alpine's missing tzdata)
process.env.TZ = process.env.TZ || 'Africa/Cairo';

// Validate required env vars
const requiredEnv = ['JWT_SECRET'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = require('./app');
const pool = require('./shared/config/database');

const PORT = process.env.PORT || 5000;

const seed = require('./seed');

async function waitForDB(retries = 15, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      conn.release();
      console.log('Connected to MySQL');
      return;
    } catch (err) {
      console.log(`Waiting for MySQL (${i + 1}/${retries})...`);
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
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to connect to database:', err.message);
    process.exit(1);
  }
}

start();

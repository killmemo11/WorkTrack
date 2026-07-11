// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// DATABASE RESET SCRIPT — DESTRUCTIVE!
// Drops ALL tables and re-seeds from scratch.
// Usage: node src/reset-db.js

const pool = require('./shared/config/database');
const { seed } = require('./seed');

async function resetDatabase() {
  console.log('⚠️  DATABASE RESET — ALL DATA WILL BE LOST!');
  console.log('connecting to database...');

  // Get all tables
  const [tables] = await pool.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [process.env.DB_NAME]
  );

  if (tables.length === 0) {
    console.log('No tables found. Running fresh seed...');
    await seed();
    return;
  }

  console.log(`Found ${tables.length} tables. Dropping all...`);

  // Disable foreign key checks temporarily
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');

  // Drop all tables
  for (const row of tables) {
    const tableName = row.TABLE_NAME;
    try {
      await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`  Dropped: ${tableName}`);
    } catch (err) {
      console.error(`  Failed to drop ${tableName}:`, err.message);
    }
  }

  // Re-enable foreign key checks
  await pool.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('\nAll tables dropped. Running seed...\n');
  await seed();

  console.log('\n✅ Database reset complete!');
}

if (require.main === module) {
  resetDatabase()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Reset failed:', err);
      process.exit(1);
    });
}

module.exports = { resetDatabase };

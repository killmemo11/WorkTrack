// Run migration 019
require('dotenv').config({ path: require('path').join(__dirname, 'backend/.env') });
const pool = require('./backend/src/shared/config/database');
const fs = require('fs');
const sql = fs.readFileSync('backend/migrations/019_email_verification.sql', 'utf8');

// Split by semicolons and run each statement
const statements = sql.split(';').filter(s => s.trim());

async function run() {
  for (const stmt of statements) {
    if (stmt.trim()) {
      await pool.query(stmt);
      console.log('OK:', stmt.trim().slice(0, 60) + '...');
    }
  }
  console.log('Migration complete');
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });

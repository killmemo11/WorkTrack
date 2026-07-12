// Run migration 019
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'worktrack';
process.env.DB_PASSWORD = 'YourStrongPassword@2026';
process.env.DB_NAME = 'work_track_db';
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

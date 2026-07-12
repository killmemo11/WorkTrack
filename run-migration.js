// Run migration 019
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'worktrack';
process.env.DB_PASSWORD = 'YourStrongPassword@2026';
process.env.DB_NAME = 'work_track_db';
const pool = require('./backend/src/shared/config/database');

const stmts = [
  `CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose ENUM('tenant_signup','other') NOT NULL DEFAULT 'tenant_signup',
    expires_at DATETIME NOT NULL,
    attempts INT DEFAULT 0,
    verified TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ev_email_purpose (email, purpose),
    INDEX idx_ev_expires (expires_at)
  )`,
  `CREATE TABLE IF NOT EXISTS tenant_signups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NULL,
    industry VARCHAR(100) NULL,
    website VARCHAR(255) NULL,
    contact_person_name VARCHAR(255) NULL,
    contact_person_title VARCHAR(100) NULL,
    employee_count INT DEFAULT 10,
    message TEXT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ts_email (contact_email),
    INDEX idx_ts_created (created_at)
  )`,
];

async function run() {
  for (const stmt of stmts) {
    await pool.query(stmt);
    console.log('OK:', stmt.trim().slice(0, 80) + '...');
  }

  // Now try adding columns to tenant_requests (ignore if already exist)
  const alterCols = [
    "ALTER TABLE tenant_requests ADD COLUMN IF NOT EXISTS industry VARCHAR(100) NULL AFTER contact_phone",
    "ALTER TABLE tenant_requests ADD COLUMN IF NOT EXISTS website VARCHAR(255) NULL AFTER industry",
    "ALTER TABLE tenant_requests ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255) NULL AFTER website",
    "ALTER TABLE tenant_requests ADD COLUMN IF NOT EXISTS contact_person_title VARCHAR(100) NULL AFTER contact_person_name",
  ];
  for (const sql of alterCols) {
    try { await pool.query(sql); console.log('OK:', sql.slice(0, 80)); }
    catch (e) { console.log('SKIP:', e.message.slice(0, 80)); }
  }
  console.log('Migration complete');
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });

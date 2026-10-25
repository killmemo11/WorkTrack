#!/usr/bin/env node
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Tracked, ordered schema migrations.
//
//   node scripts/migrate.js                     apply every pending migration
//   node scripts/migrate.js --status            show applied/pending migrations
//   node scripts/migrate.js --dry-run           list what would run
//   node scripts/migrate.js --baseline-through=024
//                                               record 001..024 as applied
//                                               without executing them (one-time
//                                               bootstrap for an existing DB)
//
// An advisory lock keeps two deploys from migrating at the same time. Applied
// files are checksummed so an edited migration fails loudly instead of drifting.

require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env') });

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');
const TRACKING_TABLE = 'schema_migrations';
const LOCK_TIMEOUT_SECONDS = 60;
const MIGRATION_FILE = /^(\d{3})_.+\.sql$/;

// A baseline may only skip migrations whose schema changes are present. These
// markers cover the risky tail (012, 018, 021-024); if the live schema does not
// match, the operator must apply the missing files instead of baselining.
const BASELINE_MARKERS = [
  ['table', 'employees'],
  ['table', 'tenants'],
  ['table', 'refresh_tokens'],
  ['column', 'employees', 'tenant_id'],
  ['column', 'tasks', 'tenant_id'],
  ['column', 'activity_log', 'old_value'],
  ['column', 'tenants', 'deleted_at'],
  ['column', 'employees', 'failed_attempts'],
  ['column', 'pending_registrations', 'attempts'],
];

function parseArgs(argv) {
  const options = { status: false, dryRun: false, baselineThrough: null, help: false };
  for (const arg of argv) {
    if (arg === '--status') options.status = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('--baseline-through=')) {
      const value = Number.parseInt(arg.split('=')[1], 10);
      if (!Number.isInteger(value) || value < 0 || value > 999) {
        throw new Error('--baseline-through expects a number between 0 and 999, e.g. --baseline-through=024');
      }
      options.baselineThrough = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/migrate.js [options]

Options:
  --status                    List applied and pending migrations, then exit
  --dry-run                   Show pending migrations without applying them
  --baseline-through=NNN      Record migrations up to NNN as already applied
                              (only valid while the tracking table is empty)
  -h, --help                  Show this help

Environment: DB_HOST, DB_PORT, DB_SOCKET, DB_USER, DB_PASSWORD, DB_NAME
`);
}

function connectionOptions() {
  if (!process.env.DB_USER || !process.env.DB_NAME || (!process.env.DB_HOST && !process.env.DB_SOCKET)) {
    throw new Error('DB_USER, DB_NAME and DB_HOST (or DB_SOCKET) must be set');
  }
  const common = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    multipleStatements: true,
    charset: 'utf8mb4',
    connectTimeout: 15000,
  };
  return process.env.DB_SOCKET
    ? { ...common, socketPath: process.env.DB_SOCKET }
    : { ...common, host: process.env.DB_HOST, port: Number.parseInt(process.env.DB_PORT, 10) || 3306 };
}

function readMigrations() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((name) => MIGRATION_FILE.test(name))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8').replace(/^\uFEFF/, '');
      return {
        name,
        prefix: Number.parseInt(name.slice(0, 3), 10),
        checksum: crypto.createHash('sha256').update(sql).digest('hex'),
        sql,
      };
    });
}

async function schemaObjectExists(conn, kind, table, column) {
  if (kind === 'table') {
    const [[row]] = await conn.query(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [table]
    );
    return row.n > 0;
  }
  const [[row]] = await conn.query(
    'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, column]
  );
  return row.n > 0;
}

async function verifyBaselineMarkers(conn) {
  const missing = [];
  for (const marker of BASELINE_MARKERS) {
    const [kind, table, column] = marker;
    if (!(await schemaObjectExists(conn, kind, table, column))) {
      missing.push(kind === 'table' ? `table ${table}` : `column ${table}.${column}`);
    }
  }
  return missing;
}

async function ensureTrackingTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS ${TRACKING_TABLE} (
      filename VARCHAR(191) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function loadApplied(conn) {
  const [rows] = await conn.query(`SELECT filename, checksum, applied_at FROM ${TRACKING_TABLE} ORDER BY filename`);
  return rows;
}

function verifyChecksums(migrations, applied) {
  const byName = new Map(migrations.map((m) => [m.name, m]));
  const problems = [];
  for (const row of applied) {
    const file = byName.get(row.filename);
    if (!file) problems.push(`${row.filename} is recorded as applied but missing from migrations/`);
    else if (file.checksum !== row.checksum) problems.push(`${row.filename} was modified after it was applied`);
  }
  return problems;
}

async function baseline(conn, migrations, through, applied) {
  if (applied.length > 0) {
    console.log(`Tracking table already has ${applied.length} entries; ignoring --baseline-through=${through}.`);
    return;
  }
  const missing = await verifyBaselineMarkers(conn);
  if (missing.length > 0) {
    throw new Error(
      `Refusing to baseline: the database is missing ${missing.join(', ')}. ` +
      'Apply the missing migrations instead of marking them as applied.'
    );
  }
  const files = migrations.filter((m) => m.prefix <= through);
  if (files.length === 0) throw new Error(`No migration files found up to ${through}`);
  for (const file of files) {
    await conn.query(`INSERT INTO ${TRACKING_TABLE} (filename, checksum) VALUES (?, ?)`, [file.name, file.checksum]);
  }
  console.log(`Baselined ${files.length} migration(s) through ${String(through).padStart(3, '0')} without executing them.`);
}

function formatStatus(migrations, applied) {
  const appliedNames = new Set(applied.map((r) => r.filename));
  const lines = ['Migration status:', ''];
  for (const file of migrations) {
    const row = applied.find((r) => r.filename === file.name);
    lines.push(`  ${row ? 'applied' : 'pending'}  ${file.name}${row ? `  (${new Date(row.applied_at).toISOString()})` : ''}`);
  }
  lines.push('', `${appliedNames.size} applied, ${migrations.length - appliedNames.size} pending`);
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return printHelp();

  const migrations = readMigrations();
  const conn = await mysql.createConnection(connectionOptions());
  let lockAcquired = false;
  try {
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, ?) AS ok', [`${process.env.DB_NAME}.worktrack_migrations`, LOCK_TIMEOUT_SECONDS]);
    if (lock.ok !== 1) throw new Error('Could not acquire the migration lock; another migration may be running');
    lockAcquired = true;

    await ensureTrackingTable(conn);
    let applied = await loadApplied(conn);

    if (applied.length === 0 && options.baselineThrough === null) {
      const hasExistingSchema = await schemaObjectExists(conn, 'table', 'employees');
      if (hasExistingSchema) {
        const message =
          'The database has an existing schema but no migration history. ' +
          'Run once with --baseline-through=NNN (for example 024) to record already-applied migrations.';
        if (options.status) console.warn(`Warning: ${message}`);
        else throw new Error(message);
      }
    }

    const problems = verifyChecksums(migrations, applied);
    if (problems.length > 0) {
      throw new Error(`Migration integrity check failed:\n  - ${problems.join('\n  - ')}`);
    }

    if (options.baselineThrough !== null) {
      await baseline(conn, migrations, options.baselineThrough, applied);
      applied = await loadApplied(conn);
    }

    if (options.status) {
      console.log(formatStatus(migrations, applied));
      return;
    }

    const appliedNames = new Set(applied.map((r) => r.filename));
    const pending = migrations.filter((m) => !appliedNames.has(m.name));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    if (options.dryRun) {
      console.log(`Would apply ${pending.length} migration(s):`);
      for (const file of pending) console.log(`  ${file.name}`);
      return;
    }

    for (const file of pending) {
      process.stdout.write(`Applying ${file.name} ... `);
      try {
        await conn.query(file.sql);
        await conn.query(`INSERT INTO ${TRACKING_TABLE} (filename, checksum) VALUES (?, ?)`, [file.name, file.checksum]);
        console.log('done');
      } catch (err) {
        console.log('FAILED');
        throw new Error(`${file.name} failed: ${err.code || ''} ${err.message}`.trim());
      }
    }
    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    if (lockAcquired) {
      await conn.query('SELECT RELEASE_LOCK(?)', [`${process.env.DB_NAME}.worktrack_migrations`]).catch(() => {});
    }
    await conn.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(`Migration failed: ${err.message}`);
  process.exitCode = 1;
});

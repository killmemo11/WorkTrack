#!/usr/bin/env node
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Static guard for tenant scoping. It scans backend source for SQL that touches
// tenant-scoped tables without referencing tenant_id in the same statement.
//
// Existing debt is captured in ci-tenant-scope-baseline.json so the gate is
// green today and fails only on NEW unscoped queries:
//
//   node scripts/ci-tenant-scope.js                  # check (CI)
//   node scripts/ci-tenant-scope.js --update-baseline
//
// Platform and session modules are intentionally cross-tenant and excluded.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');
const BASELINE_FILE = path.join(__dirname, 'ci-tenant-scope-baseline.json');

const EXCLUDED_PREFIXES = [
  'modules/platform/',
  'modules/session/',
  'shared/config/',
];
const EXCLUDED_FILES = ['seed.js'];

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

function collectTenantTables() {
  const tables = new Set();
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'));

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    for (const match of sql.matchAll(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]*?)\n\)/gi)) {
      if (/\btenant_id\b/i.test(match[2])) tables.add(match[1].toLowerCase());
    }

    for (const match of sql.matchAll(/ALTER TABLE\s+`?(\w+)`?[^;]{0,250}?\btenant_id\b/gi)) {
      tables.add(match[1].toLowerCase());
    }
  }

  return tables;
}

function extractStrings(source) {
  const found = [];
  const patterns = [
    /`((?:\\[\s\S]|[^`\\])*)`/g,
    /'((?:\\[\s\S]|[^'\\])*)'/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) {
      found.push({ text: match[1], index: match.index });
    }
  }
  return found;
}

function looksLikeSql(text) {
  return /\b(?:SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/i.test(text);
}

function referencedTables(text) {
  const tables = new Set();
  for (const match of text.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+`?([a-zA-Z0-9_]+)`?/gi)) {
    tables.add(match[1].toLowerCase());
  }
  return tables;
}

function lineOf(source, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (source.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function fingerprint(relativePath, sql) {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 16);
  return `${relativePath}::${hash}`;
}

function scan() {
  const tenantTables = collectTenantTables();
  const violations = new Map();

  for (const file of walk(SRC_DIR)) {
    const relativePath = path.relative(ROOT, file).split(path.sep).join('/');
    if (EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(`src/${prefix}`))) continue;
    if (EXCLUDED_FILES.includes(path.basename(file))) continue;

    const source = fs.readFileSync(file, 'utf8');
    for (const { text, index } of extractStrings(source)) {
      if (!looksLikeSql(text)) continue;
      if (/\btenant_id\b/i.test(text)) continue;
      // Interpolated SQL is checked by the runtime isolation tests instead: the
      // static scanner cannot prove whether ${where} carries the tenant filter.
      if (text.includes('${')) continue;

      const unscoped = [...referencedTables(text)].filter((table) => tenantTables.has(table));
      if (unscoped.length === 0) continue;

      const key = fingerprint(relativePath, text);
      if (!violations.has(key)) {
        violations.set(key, {
          file: relativePath,
          line: lineOf(source, index),
          tables: unscoped.sort(),
          sql: text.replace(/\s+/g, ' ').trim().slice(0, 180),
        });
      }
    }
  }

  return { tenantTables, violations };
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return new Set();
  const parsed = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  return new Set(parsed.violations || []);
}

function writeBaseline(keys) {
  const payload = {
    generated_at: new Date().toISOString(),
    note: 'Existing unscoped queries accepted at migration 032. Remove entries as they are fixed.',
    violations: [...keys].sort(),
  };
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(payload, null, 2)}\n`);
}

function main() {
  const { tenantTables, violations } = scan();
  const keys = new Set(violations.keys());

  if (process.argv.includes('--update-baseline')) {
    writeBaseline(keys);
    console.log(`Baseline updated: ${keys.size} accepted unscoped queries.`);
    return;
  }

  const baseline = loadBaseline();
  const added = [...keys].filter((key) => !baseline.has(key));
  const fixed = [...baseline].filter((key) => !keys.has(key));

  console.log(`Tenant-scoped tables: ${tenantTables.size}`);
  console.log(`Unscoped queries found: ${keys.size}`);
  console.log(`Accepted in baseline: ${baseline.size}`);

  if (fixed.length > 0) {
    console.log(`\nFixed since baseline (run --update-baseline to shrink it): ${fixed.length}`);
  }

  if (added.length === 0) {
    console.log('\nNo new unscoped tenant queries.');
    return;
  }

  console.error(`\nNew unscoped tenant queries: ${added.length}\n`);
  for (const key of added) {
    const violation = violations.get(key);
    console.error(`- ${violation.file}:${violation.line} [${violation.tables.join(', ')}]`);
    console.error(`    ${violation.sql}`);
  }
  process.exit(1);
}

main();

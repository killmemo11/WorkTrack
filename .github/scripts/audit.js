#!/usr/bin/env node
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Dependency audit gate.
//
//   node .github/scripts/audit.js backend
//   node .github/scripts/audit.js frontend
//
// Fails when npm reports a moderate-or-higher advisory that is not explicitly
// accepted in .github/audit-allowlist.json. Accepted advisories must be
// re-reviewed periodically (ALLOWLIST_MAX_AGE_DAYS); an expiry fails CI so a
// temporary exception cannot become permanent silently.

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ALLOWLIST_MAX_AGE_DAYS = 180;
const BLOCKING_SEVERITIES = new Set(['moderate', 'high', 'critical']);
const ROOT = path.resolve(__dirname, '../..');
const ALLOWLIST_PATH = path.join(ROOT, '.github/audit-allowlist.json');

const scope = process.argv[2];
if (!scope) {
  console.error('Usage: node .github/scripts/audit.js <backend|frontend>');
  process.exit(2);
}

const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
const accepted = allowlist[scope] || {};

function runAudit() {
  try {
    return execSync('npm audit --json', {
      cwd: path.join(ROOT, scope),
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (err) {
    if (typeof err.stdout === 'string' && err.stdout.trim().startsWith('{')) return err.stdout;
    throw err;
  }
}

function advisoryId(advisory) {
  const fromUrl = advisory.url && advisory.url.split('/').filter(Boolean).pop();
  return fromUrl || `npm:${advisory.source}`;
}

function isExpired(entry) {
  const reviewed = Date.parse(entry.reviewed);
  if (Number.isNaN(reviewed)) return true;
  return Date.now() - reviewed > ALLOWLIST_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

const report = JSON.parse(runAudit());
const failures = [];
const notes = [];

const seenPackages = new Set();
for (const [name, vuln] of Object.entries(report.vulnerabilities || {})) {
  const advisories = (vuln.via || []).filter((entry) => typeof entry === 'object');
  if (advisories.length === 0) continue;
  seenPackages.add(name);

  const entry = accepted[name];
  if (entry && isExpired(entry)) {
    failures.push(`${name}: allowlist entry expired (reviewed ${entry.reviewed}); re-review the risk`);
  }

  for (const advisory of advisories) {
    const id = advisoryId(advisory);
    const acceptedIds = entry ? entry.advisories || [] : [];
    if (acceptedIds.includes(id)) {
      notes.push(`accepted ${name} ${vuln.severity}: ${advisory.title} (${id})`);
    } else if (BLOCKING_SEVERITIES.has(vuln.severity)) {
      failures.push(`${name} ${vuln.severity}: ${advisory.title} (${id})${entry ? ' — not in allowlist' : ''}`);
    } else {
      notes.push(`ignored low ${name}: ${advisory.title} (${id})`);
    }
  }
}

for (const [name, entry] of Object.entries(accepted)) {
  if (!seenPackages.has(name)) {
    console.log(`Note: allowlist entry for ${name} is stale (no current advisory).`);
  }
}

for (const note of notes) console.log(`  ${note}`);

const counts = report.metadata && report.metadata.vulnerabilities;
if (counts) {
  console.log(`npm reports ${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low.`);
}

if (failures.length > 0) {
  console.error('\nUnaccepted dependency advisories:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(`\nFix the dependency, or add a reviewed entry to ${path.relative(ROOT, ALLOWLIST_PATH)}.`);
  process.exit(1);
}

console.log('Dependency audit gate passed.');

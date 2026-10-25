#!/usr/bin/env node
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Dependency-free load smoke test. It measures request latency and error
// rate against a running WorkTrack instance; it is not a substitute for a
// full load-testing tool, but it gives a repeatable local baseline.
//
// Usage:
//   BASE_URL=http://127.0.0.1:5000 DURATION=10 CONCURRENCY=20 node scripts/load-test.js
//   LOAD_TEST_USERNAME=qa LOAD_TEST_PASSWORD=... node scripts/load-test.js
//
// Environment:
//   BASE_URL            target origin (default http://127.0.0.1:5000)
//   DURATION            measured seconds (default 10)
//   CONCURRENCY         parallel workers (default 20)
//   WARMUP              warm-up seconds, excluded from results (default 2)
//   PATHS               comma-separated API paths; defaults depend on auth mode
//   LOAD_TEST_USERNAME optional login username for authenticated mode
//   LOAD_TEST_EMAIL    alias for LOAD_TEST_USERNAME (kept for convenience)
//   LOAD_TEST_PASSWORD  optional login password
//   MAX_ERROR_RATE      fail threshold, 0..1 (default 0.01)

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
const DURATION = Math.max(1, parseInt(process.env.DURATION, 10) || 10);
const CONCURRENCY = Math.max(1, parseInt(process.env.CONCURRENCY, 10) || 20);
const WARMUP = Math.max(0, parseInt(process.env.WARMUP, 10) || 2);
const MAX_ERROR_RATE = Math.min(1, Math.max(0, parseFloat(process.env.MAX_ERROR_RATE ?? '0.01')));
const USERNAME = process.env.LOAD_TEST_USERNAME || process.env.LOAD_TEST_EMAIL;
const PASSWORD = process.env.LOAD_TEST_PASSWORD;
const AUTH_MODE = Boolean(USERNAME && PASSWORD);
const PATHS = (process.env.PATHS || (AUTH_MODE
  ? '/api/auth/me,/api/auth/notifications/unread-count,/api/personnel/dashboard'
  : '/api/health,/api/settings/public'))
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

function cookieHeaderFromResponse(res) {
  const cookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie') || ''];
  return cookies
    .filter(Boolean)
    .map((cookie) => cookie.split(';')[0])
    .join('; ');
}

async function login() {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const cookie = cookieHeaderFromResponse(res);
  if (!cookie) throw new Error('Login succeeded but no session cookie was returned');
  return cookie;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function runWorkers(deadline, cookie, batch) {
  const results = {
    requests: 0,
    ok: 0,
    errors: 0,
    statuses: {},
    latencies: [],
    errorSamples: [],
  };

  async function worker() {
    let pathIndex = 0;
    while (Date.now() < deadline) {
      const path = PATHS[pathIndex++ % PATHS.length];
      const started = performance.now();
      try {
        const res = await fetch(`${BASE_URL}${path}`, {
          headers: cookie ? { Cookie: cookie } : undefined,
        });
        await res.arrayBuffer();
        const elapsed = performance.now() - started;

        results.requests += 1;
        results.statuses[res.status] = (results.statuses[res.status] || 0) + 1;
        if (res.status >= 400) {
          results.errors += 1;
          if (results.errorSamples.length < 5) results.errorSamples.push(`${res.status} ${path}`);
        } else {
          results.ok += 1;
          if (batch === 'measured') results.latencies.push(elapsed);
        }
      } catch (err) {
        results.requests += 1;
        results.errors += 1;
        if (results.errorSamples.length < 5) results.errorSamples.push(`${path}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return results;
}

async function main() {
  console.log(`Target: ${BASE_URL}`);
  console.log(`Mode: ${AUTH_MODE ? 'authenticated' : 'public'} | paths: ${PATHS.join(', ')}`);
  console.log(`Concurrency: ${CONCURRENCY} | duration: ${DURATION}s | warm-up: ${WARMUP}s`);

  const cookie = AUTH_MODE ? await login() : null;

  if (WARMUP > 0) {
    await runWorkers(Date.now() + WARMUP * 1000, cookie, 'warmup');
    console.log(`Warm-up complete (${WARMUP}s)`);
  }

  const started = Date.now();
  const results = await runWorkers(started + DURATION * 1000, cookie, 'measured');
  const elapsedSeconds = (Date.now() - started) / 1000;

  results.latencies.sort((a, b) => a - b);
  const errorRate = results.requests === 0 ? 1 : results.errors / results.requests;
  const summary = {
    target: BASE_URL,
    mode: AUTH_MODE ? 'authenticated' : 'public',
    paths: PATHS,
    concurrency: CONCURRENCY,
    elapsed_seconds: Number(elapsedSeconds.toFixed(2)),
    requests: results.requests,
    requests_per_second: Number((results.requests / elapsedSeconds).toFixed(1)),
    ok: results.ok,
    errors: results.errors,
    error_rate: Number((errorRate * 100).toFixed(2)),
    statuses: results.statuses,
    latency_ms: {
      p50: Number(percentile(results.latencies, 50).toFixed(1)),
      p95: Number(percentile(results.latencies, 95).toFixed(1)),
      p99: Number(percentile(results.latencies, 99).toFixed(1)),
      max: Number((results.latencies[results.latencies.length - 1] || 0).toFixed(1)),
    },
    error_samples: results.errorSamples,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (errorRate > MAX_ERROR_RATE) {
    console.error(`FAIL: error rate ${(errorRate * 100).toFixed(2)}% exceeds ${(MAX_ERROR_RATE * 100).toFixed(2)}%`);
    if (results.statuses[429]) {
      console.error('Hint: 429 responses are rate limits. Raise API_RATE_LIMIT_MAX for a local test run, or lower CONCURRENCY.');
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../config/database');
const logger = require('../utils/logger');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

async function getTenantFeatures(tenantId) {
  if (!tenantId) return {};

  const cached = cache.get(tenantId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.values;
  }

  const [rows] = await pool.query(
    `SELECT f.flag_key, f.default_enabled, tf.enabled AS override_enabled
     FROM feature_flags f
     LEFT JOIN tenant_feature_flags tf
       ON tf.flag_key = f.flag_key AND tf.tenant_id = ?`,
    [tenantId]
  );

  const values = {};
  for (const row of rows) {
    values[row.flag_key] = row.override_enabled === null || row.override_enabled === undefined
      ? row.default_enabled === 1
      : row.override_enabled === 1;
  }

  cache.set(tenantId, { values, loadedAt: Date.now() });
  return values;
}

async function isFeatureEnabled(tenantId, flagKey, fallback = false) {
  try {
    const features = await getTenantFeatures(tenantId);
    if (!(flagKey in features)) return fallback;
    return features[flagKey] === true;
  } catch (err) {
    logger.error(`Feature flag check failed (${flagKey}):`, err.message);
    return fallback;
  }
}

function clearFeatureCache(tenantId) {
  if (tenantId === undefined || tenantId === null) {
    cache.clear();
    return;
  }
  cache.delete(tenantId);
}

module.exports = { getTenantFeatures, isFeatureEnabled, clearFeatureCache };

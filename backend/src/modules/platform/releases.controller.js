// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { clearFeatureCache } = require('../../shared/services/feature-flags.service');

const CHANNELS = ['stable', 'beta', 'canary'];
const FLAG_KEY_PATTERN = /^[a-z0-9][a-z0-9_.-]{2,119}$/;

async function listFlags(req, res) {
  const [flags] = await pool.query(
    `SELECT f.id, f.flag_key, f.label, f.description, f.module, f.default_enabled,
            (SELECT COUNT(*) FROM tenant_feature_flags tf WHERE tf.flag_key = f.flag_key) AS override_count,
            (SELECT COUNT(*) FROM tenant_feature_flags tf WHERE tf.flag_key = f.flag_key AND tf.enabled = 1) AS enabled_count
     FROM feature_flags f
     ORDER BY f.module, f.flag_key`
  );

  const [channels] = await pool.query(
    `SELECT release_channel, COUNT(*) AS tenants
     FROM tenants WHERE deleted_at IS NULL GROUP BY release_channel`
  );

  const channelCounts = Object.fromEntries(CHANNELS.map((c) => [c, 0]));
  for (const row of channels) channelCounts[row.release_channel] = row.tenants;

  res.json({ flags, channels: channelCounts });
}

async function createFlag(req, res) {
  const { flag_key, label, description, module, default_enabled } = req.body || {};
  if (!flag_key || !FLAG_KEY_PATTERN.test(flag_key)) {
    return res.status(400).json({ error: 'flag_key must be 3-120 lowercase letters, digits, dots, dashes or underscores' });
  }
  if (!label || typeof label !== 'string' || label.trim().length === 0) {
    return res.status(400).json({ error: 'label is required' });
  }

  const [existing] = await pool.query('SELECT id FROM feature_flags WHERE flag_key = ?', [flag_key]);
  if (existing.length > 0) return res.status(409).json({ error: 'A flag with this key already exists' });

  const [result] = await pool.query(
    'INSERT INTO feature_flags (flag_key, label, description, module, default_enabled) VALUES (?, ?, ?, ?, ?)',
    [flag_key.trim(), label.trim(), description || null, module || 'general', default_enabled ? 1 : 0]
  );

  await logActivity(null, req.platformAdmin.id, 'feature_flag_created', `Created feature flag: ${flag_key}`);
  clearFeatureCache();

  res.status(201).json({ id: result.insertId, flag_key, label: label.trim(), module: module || 'general', default_enabled: !!default_enabled });
}

async function updateFlag(req, res) {
  const { key } = req.params;
  const { label, description, module, default_enabled } = req.body || {};

  const [rows] = await pool.query('SELECT * FROM feature_flags WHERE flag_key = ?', [key]);
  if (rows.length === 0) return res.status(404).json({ error: 'Flag not found' });

  const next = {
    label: label !== undefined ? label : rows[0].label,
    description: description !== undefined ? description : rows[0].description,
    module: module !== undefined ? module : rows[0].module,
    default_enabled: default_enabled !== undefined ? (default_enabled ? 1 : 0) : rows[0].default_enabled,
  };

  await pool.query(
    'UPDATE feature_flags SET label = ?, description = ?, module = ?, default_enabled = ? WHERE flag_key = ?',
    [next.label, next.description, next.module, next.default_enabled, key]
  );

  await logActivity(
    null,
    req.platformAdmin.id,
    'feature_flag_updated',
    `Updated feature flag ${key} (default ${next.default_enabled ? 'on' : 'off'})`
  );
  clearFeatureCache();

  res.json({ flag_key: key, ...next });
}

async function getTenantRelease(req, res) {
  const { id } = req.params;

  const [tenants] = await pool.query(
    'SELECT id, name, slug, release_channel FROM tenants WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (tenants.length === 0) return res.status(404).json({ error: 'Tenant not found' });

  const [flags] = await pool.query(
    `SELECT f.flag_key, f.label, f.module, f.default_enabled,
            tf.enabled AS override_enabled
     FROM feature_flags f
     LEFT JOIN tenant_feature_flags tf ON tf.flag_key = f.flag_key AND tf.tenant_id = ?
     ORDER BY f.module, f.flag_key`,
    [id]
  );

  res.json({
    tenant: tenants[0],
    channel: tenants[0].release_channel,
    flags: flags.map((flag) => ({
      key: flag.flag_key,
      label: flag.label,
      module: flag.module,
      default_enabled: flag.default_enabled === 1,
      override: flag.override_enabled === null || flag.override_enabled === undefined
        ? null
        : flag.override_enabled === 1,
      enabled: flag.override_enabled === null || flag.override_enabled === undefined
        ? flag.default_enabled === 1
        : flag.override_enabled === 1,
    })),
  });
}

async function updateTenantRelease(req, res) {
  const { id } = req.params;
  const { release_channel, flags } = req.body || {};

  if (release_channel !== undefined && !CHANNELS.includes(release_channel)) {
    return res.status(400).json({ error: `release_channel must be one of: ${CHANNELS.join(', ')}` });
  }
  if (flags !== undefined && (typeof flags !== 'object' || flags === null || Array.isArray(flags))) {
    return res.status(400).json({ error: 'flags must be an object of flag_key -> true/false/null' });
  }

  const [tenants] = await pool.query(
    'SELECT id, name, release_channel FROM tenants WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (tenants.length === 0) return res.status(404).json({ error: 'Tenant not found' });

  const entries = Object.entries(flags || {});
  let knownKeys = new Set();
  if (entries.length > 0) {
    const [known] = await pool.query('SELECT flag_key FROM feature_flags WHERE flag_key IN (?)', [entries.map(([key]) => key)]);
    knownKeys = new Set(known.map((row) => row.flag_key));
    const unknown = entries.map(([key]) => key).filter((key) => !knownKeys.has(key));
    if (unknown.length > 0) return res.status(400).json({ error: `Unknown flags: ${unknown.join(', ')}` });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (release_channel !== undefined) {
      await conn.query('UPDATE tenants SET release_channel = ? WHERE id = ?', [release_channel, id]);
    }

    for (const [key, value] of entries) {
      if (value === null) {
        await conn.query('DELETE FROM tenant_feature_flags WHERE tenant_id = ? AND flag_key = ?', [id, key]);
      } else {
        await conn.query(
          `INSERT INTO tenant_feature_flags (tenant_id, flag_key, enabled, updated_by)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), updated_by = VALUES(updated_by)`,
          [id, key, value ? 1 : 0, req.platformAdmin.id]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  clearFeatureCache(id);

  await logActivity(
    null,
    req.platformAdmin.id,
    'tenant_release_updated',
    `Tenant ${id} release: channel ${tenants[0].release_channel} -> ${release_channel ?? tenants[0].release_channel}` +
      (entries.length ? `, ${entries.length} flag override(s)` : ''),
    { tenant_id: Number(id) }
  );

  req.params.id = id;
  return getTenantRelease(req, res);
}

module.exports = { listFlags, createFlag, updateFlag, getTenantRelease, updateTenantRelease, CHANNELS };

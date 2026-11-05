// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { encrypt, decrypt } = require('../../shared/utils/encryption');
const { logActivity } = require('../../shared/services/activity.service');
const { getPlatformAccess } = require('../../shared/middleware/platform-permission.middleware');

async function canManagePrices(req) {
  const access = await getPlatformAccess(req.platformAdmin.id);
  return access.roles.has('owner') || access.permissions.has('platform.plans.manage_price');
}

// ============================================================
// PUBLIC: Get active plans (for landing page / tenant signup)
// ============================================================

async function getPublicPlans(req, res) {
  const [rows] = await pool.query(
    'SELECT id, name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, features FROM subscription_plans WHERE is_active = 1 AND is_public = 1 ORDER BY sort_order ASC'
  );
  res.json(rows);
}

async function getPublicSettings(req, res) {
  const [rows] = await pool.query('SELECT `key`, `value` FROM platform_settings');
  const PUBLIC_KEYS = new Set([
    'company_name', 'company_email', 'contact_email', 'contact_phone',
    'default_currency', 'default_trial_days',
    'platform_logo', 'platform_primary_color',
  ]);
  const settings = {};
  for (const row of rows) {
    if (row.key.startsWith('landing_') || PUBLIC_KEYS.has(row.key)) {
      settings[row.key] = row.value;
    }
  }
  res.json(settings);
}

// ============================================================
// ADMIN: Manage subscription plans (Super Admin)
// ============================================================

async function listPlans(req, res) {
  const [rows] = await pool.query(
    'SELECT * FROM subscription_plans ORDER BY sort_order ASC'
  );
  res.json(rows);
}

async function getPlan(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
  res.json(rows[0]);
}

async function createPlan(req, res) {
  const { name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, is_active, is_public, sort_order, features, price_note } = req.body;
  
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const [existing] = await pool.query('SELECT id FROM subscription_plans WHERE slug = ?', [slug]);
  if (existing.length > 0) {
    return res.status(400).json({ error: 'A plan with this slug already exists' });
  }

  const conn = await pool.getConnection();
  let planId;
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, is_active, is_public, sort_order, features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, description || null, price_monthly || 0, price_yearly || 0, currency || 'USD', max_employees || 50, trial_days || 14, is_active !== false ? 1 : 0, is_public !== false ? 1 : 0, sort_order || 0, features ? JSON.stringify(features) : null]
    );
    planId = result.insertId;

    await conn.query(
      `INSERT INTO plan_price_versions (plan_id, version, price_monthly, price_yearly, currency, note, created_by)
       VALUES (?, 1, ?, ?, ?, ?, ?)`,
      [planId, price_monthly || 0, price_yearly || 0, currency || 'USD', price_note || 'Initial price', req.platformAdmin.id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logActivity(null, req.platformAdmin.id, 'plan_created', `Created subscription plan: ${name}`);
  const [created] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [planId]);
  res.status(201).json(created[0]);
}

async function updatePlan(req, res) {
  const { id } = req.params;
  const [existing] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Plan not found' });

  const { name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, is_active, is_public, sort_order, features, price_note } = req.body;
  
  if (slug && slug !== existing[0].slug) {
    const [dup] = await pool.query('SELECT id FROM subscription_plans WHERE slug = ? AND id != ?', [slug, id]);
    if (dup.length > 0) return res.status(400).json({ error: 'Slug already in use' });
  }

  const current = existing[0];
  const priceFieldsChanged =
    (price_monthly !== undefined && Number(price_monthly) !== Number(current.price_monthly)) ||
    (price_yearly !== undefined && Number(price_yearly) !== Number(current.price_yearly)) ||
    (currency !== undefined && currency !== current.currency);

  if (priceFieldsChanged && !(await canManagePrices(req))) {
    return res.status(403).json({ error: 'Platform permission required: platform.plans.manage_price' });
  }

  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (slug !== undefined) { updates.push('slug = ?'); values.push(slug); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (price_monthly !== undefined) { updates.push('price_monthly = ?'); values.push(price_monthly); }
  if (price_yearly !== undefined) { updates.push('price_yearly = ?'); values.push(price_yearly); }
  if (currency !== undefined) { updates.push('currency = ?'); values.push(currency); }
  if (max_employees !== undefined) { updates.push('max_employees = ?'); values.push(max_employees); }
  if (trial_days !== undefined) { updates.push('trial_days = ?'); values.push(trial_days); }
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
  if (is_public !== undefined) { updates.push('is_public = ?'); values.push(is_public ? 1 : 0); }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); values.push(sort_order); }
  if (features !== undefined) { updates.push('features = ?'); values.push(JSON.stringify(features)); }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const conn = await pool.getConnection();
  let nextVersion = null;
  try {
    await conn.beginTransaction();

    values.push(id);
    await conn.query(`UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`, values);

    if (priceFieldsChanged) {
      const [[versionRow]] = await conn.query(
        'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM plan_price_versions WHERE plan_id = ?',
        [id]
      );
      nextVersion = versionRow.next_version;
      await conn.query(
        `INSERT INTO plan_price_versions (plan_id, version, price_monthly, price_yearly, currency, note, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          nextVersion,
          price_monthly !== undefined ? price_monthly : current.price_monthly,
          price_yearly !== undefined ? price_yearly : current.price_yearly,
          currency !== undefined ? currency : current.currency,
          price_note || null,
          req.platformAdmin.id,
        ]
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logActivity(
    null,
    req.platformAdmin.id,
    'plan_updated',
    `Updated subscription plan: ${name || current.name}${nextVersion ? ` (price version ${nextVersion})` : ''}`
  );
  const [updated] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
  res.json({ ...updated[0], price_version: nextVersion });
}

async function listPlanPriceVersions(req, res) {
  const { id } = req.params;
  const [plans] = await pool.query('SELECT id FROM subscription_plans WHERE id = ?', [id]);
  if (plans.length === 0) return res.status(404).json({ error: 'Plan not found' });

  const [rows] = await pool.query(
    `SELECT v.*, au.username AS created_by_username,
       (SELECT COUNT(*) FROM tenants t WHERE t.plan_price_version_id = v.id AND t.deleted_at IS NULL) AS tenant_count
     FROM plan_price_versions v
     LEFT JOIN admin_users au ON au.id = v.created_by
     WHERE v.plan_id = ?
     ORDER BY v.version DESC`,
    [id]
  );
  res.json(rows);
}

async function deletePlan(req, res) {
  const { id } = req.params;
  const [existing] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Plan not found' });

  // Check if any tenant is using this plan
  const [tenants] = await pool.query('SELECT COUNT(*) as cnt FROM tenants WHERE plan = ?', [existing[0].slug]);
  if (tenants[0].cnt > 0) {
    return res.status(400).json({ error: `Cannot delete: ${tenants[0].cnt} tenant(s) are using this plan` });
  }

  await pool.query('DELETE FROM subscription_plans WHERE id = ?', [id]);
  await logActivity(null, req.platformAdmin.id, 'plan_deleted', `Deleted subscription plan: ${existing[0].name}`);
  res.json({ message: 'Plan deleted' });
}

// ============================================================
// ADMIN: Manage platform settings (Super Admin)
// ============================================================

async function listPlatformSettings(req, res) {
  const [rows] = await pool.query('SELECT * FROM platform_settings ORDER BY id ASC');
  res.json(rows);
}

async function updatePlatformSettings(req, res) {
  const { settings } = req.body;
  if (!settings || !Array.isArray(settings)) {
    return res.status(400).json({ error: 'Settings array is required' });
  }

  for (let { key, value } of settings) {
    if (key === 'smtp_pass' && value && !value.includes(':')) {
      value = encrypt(value);
    }
    await pool.query(
      'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, value, value]
    );
  }

  const { clearPlatformSmtpCache } = require('../../shared/services/platform-email.service');
  clearPlatformSmtpCache();

  await logActivity(null, req.platformAdmin.id, 'platform_settings_updated', `Updated ${settings.length} platform setting(s)`);
  res.json({ message: 'Settings updated' });
}

async function testPlatformSmtp(req, res) {
  const { sendPlatformEmail, loadPlatformSmtpSettings } = require('../../shared/services/platform-email.service');
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const settings = await loadPlatformSmtpSettings();
  const companyName = settings.company_name || 'WorkTrack';
  const result = await sendPlatformEmail(email, `${companyName} SMTP Test`, `<p>This is a test email from your <strong>${companyName}</strong> platform. If you received this, your SMTP configuration is working correctly.</p>`);
  if (result.success) {
    res.json({ message: 'Test email sent successfully' });
  } else {
    res.status(500).json({ error: result.error || result.reason || 'Failed to send test email' });
  }
}

module.exports = {
  getPublicPlans,
  getPublicSettings,
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  listPlanPriceVersions,
  deletePlan,
  listPlatformSettings,
  updatePlatformSettings,
  testPlatformSmtp,
};

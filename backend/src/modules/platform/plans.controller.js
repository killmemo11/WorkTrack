// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { encrypt, decrypt } = require('../../shared/utils/encryption');
const { logActivity } = require('../../shared/services/activity.service');

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
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
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
  const { name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, is_active, is_public, sort_order, features } = req.body;
  
  if (!name || !slug) {
    return res.status(400).json({ error: 'Name and slug are required' });
  }

  const [existing] = await pool.query('SELECT id FROM subscription_plans WHERE slug = ?', [slug]);
  if (existing.length > 0) {
    return res.status(400).json({ error: 'A plan with this slug already exists' });
  }

  const [result] = await pool.query(
    `INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, is_active, is_public, sort_order, features)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, slug, description || null, price_monthly || 0, price_yearly || 0, currency || 'USD', max_employees || 50, trial_days || 14, is_active !== false ? 1 : 0, is_public !== false ? 1 : 0, sort_order || 0, features ? JSON.stringify(features) : null]
  );

  await logActivity(null, req.platformAdmin.id, 'plan_created', `Created subscription plan: ${name}`);
  const [created] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [result.insertId]);
  res.status(201).json(created[0]);
}

async function updatePlan(req, res) {
  const { id } = req.params;
  const [existing] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Plan not found' });

  const { name, slug, description, price_monthly, price_yearly, currency, max_employees, trial_days, is_active, is_public, sort_order, features } = req.body;
  
  if (slug && slug !== existing[0].slug) {
    const [dup] = await pool.query('SELECT id FROM subscription_plans WHERE slug = ? AND id != ?', [slug, id]);
    if (dup.length > 0) return res.status(400).json({ error: 'Slug already in use' });
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

  values.push(id);
  await pool.query(`UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`, values);

  await logActivity(null, req.platformAdmin.id, 'plan_updated', `Updated subscription plan: ${name || existing[0].name}`);
  const [updated] = await pool.query('SELECT * FROM subscription_plans WHERE id = ?', [id]);
  res.json(updated[0]);
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

  await logActivity(null, req.platformAdmin.id, 'platform_settings_updated', `Updated ${settings.length} platform setting(s)`);
  res.json({ message: 'Settings updated' });
}

async function testPlatformSmtp(req, res) {
  const { sendPlatformEmail } = require('../../shared/services/platform-email.service');
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const result = await sendPlatformEmail(email, 'WorkTrack SMTP Test', '<p>This is a test email from your WorkTrack platform. If you received this, your SMTP configuration is working correctly.</p>');
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
  deletePlan,
  listPlatformSettings,
  updatePlatformSettings,
  testPlatformSmtp,
};

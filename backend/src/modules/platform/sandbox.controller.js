// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { revokeAllTenantTokens } = require('../../shared/services/token.service');

const RESET_TABLES = ['attendance_records', 'leave_requests', 'notifications', 'admin_notifications', 'activity_log'];

function sandboxSlug() {
  return `sandbox-${crypto.randomBytes(4).toString('hex')}`;
}

async function listSandboxes(req, res) {
  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.slug, t.status, t.created_at, t.contact_email,
            t.sandbox_of_tenant_id, source.name AS source_name,
            (SELECT COUNT(*) FROM employees e WHERE e.tenant_id = t.id) AS employee_count
     FROM tenants t
     LEFT JOIN tenants source ON source.id = t.sandbox_of_tenant_id
     WHERE t.is_sandbox = 1 AND t.deleted_at IS NULL
     ORDER BY t.id DESC`
  );
  res.json(rows);
}

async function createSandbox(req, res) {
  const { name, from_tenant_id, admin_username, admin_email } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
    return res.status(400).json({ error: 'A valid admin_email is required' });
  }

  let source = null;
  if (from_tenant_id) {
    const [sources] = await pool.query(
      'SELECT id, name FROM tenants WHERE id = ? AND deleted_at IS NULL AND is_sandbox = 0',
      [from_tenant_id]
    );
    if (sources.length === 0) return res.status(400).json({ error: 'Source tenant not found' });
    source = sources[0];
  }

  const username = (admin_username || 'sandbox_admin').trim().toLowerCase();
  const [taken] = await pool.query('SELECT id FROM admin_users WHERE username = ?', [username]);
  const finalUsername = taken.length > 0 ? `${username}_${crypto.randomBytes(2).toString('hex')}` : username;
  const initialPassword = crypto.randomBytes(12).toString('base64url');

  const conn = await pool.getConnection();
  let tenantId;
  try {
    await conn.beginTransaction();

    const [tenantResult] = await conn.query(
      `INSERT INTO tenants
         (name, slug, contact_email, status, plan, max_employees, is_sandbox, sandbox_of_tenant_id, release_channel)
       VALUES (?, ?, ?, 'active', 'trial', 9999, 1, ?, 'canary')`,
      [name.trim(), sandboxSlug(), admin_email.trim().toLowerCase(), source ? source.id : null]
    );
    tenantId = tenantResult.insertId;

    const hash = await bcrypt.hash(initialPassword, 13);
    const [adminResult] = await conn.query(
      `INSERT INTO admin_users (username, email, password_hash, is_active, tenant_id, is_platform_admin, must_change_password)
       VALUES (?, ?, ?, 1, ?, 0, 0)`,
      [finalUsername, admin_email.trim().toLowerCase(), hash, tenantId]
    );

    if (source) {
      await conn.query(
        `INSERT INTO service_toggles (service_key, service_name, description, icon, is_enabled, is_visible, sort_order, tenant_id)
         SELECT service_key, service_name, description, icon, is_enabled, is_visible, sort_order, ?
         FROM service_toggles WHERE tenant_id = ?`,
        [tenantId, source.id]
      );

      await conn.query(
        `INSERT INTO tenant_policies
           (tenant_id, policy_type, title, content, version, is_published, requires_ack, effective_at, published_at, created_by)
         SELECT ?, policy_type, title, content, 1, is_published, requires_ack, effective_at, published_at, ?
         FROM tenant_policies WHERE tenant_id = ? AND is_published = 1`,
        [tenantId, adminResult.insertId, source.id]
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
    'sandbox_created',
    `Created sandbox tenant ${tenantId} (${name.trim()})${source ? ` from tenant ${source.id}` : ''}`,
    { tenant_id: tenantId }
  );

  res.status(201).json({
    id: tenantId,
    name: name.trim(),
    admin: { username: finalUsername, email: admin_email.trim().toLowerCase() },
    initial_password: initialPassword,
    source_tenant_id: source ? source.id : null,
  });
}

async function resetSandbox(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    'SELECT id, name FROM tenants WHERE id = ? AND is_sandbox = 1 AND deleted_at IS NULL',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Sandbox not found' });

  let deleted = 0;
  for (const table of RESET_TABLES) {
    const [result] = await pool.query(`DELETE FROM ${table} WHERE tenant_id = ?`, [id]);
    deleted += result.affectedRows || 0;
  }

  await logActivity(
    null,
    req.platformAdmin.id,
    'sandbox_reset',
    `Reset sandbox tenant ${id} (${rows[0].name}): ${deleted} row(s) cleared`,
    { tenant_id: Number(id) }
  );

  res.json({ message: 'Sandbox reset', deleted_rows: deleted });
}

async function deleteSandbox(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    'SELECT id, name FROM tenants WHERE id = ? AND is_sandbox = 1 AND deleted_at IS NULL',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Sandbox not found' });

  await pool.query("UPDATE tenants SET deleted_at = NOW(), status = 'cancelled' WHERE id = ?", [id]);
  await revokeAllTenantTokens(Number(id));

  await logActivity(
    null,
    req.platformAdmin.id,
    'sandbox_deleted',
    `Deleted sandbox tenant ${id} (${rows[0].name})`
  );

  res.json({ message: 'Sandbox deleted' });
}

module.exports = { listSandboxes, createSandbox, resetSandbox, deleteSandbox };

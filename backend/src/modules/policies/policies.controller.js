// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { createPolicyBody, updatePolicyBody, publishPolicyBody } = require('../../shared/validations/schemas');

const POLICY_TYPES = ['leave', 'penalties', 'privacy', 'other'];
const PUBLISHED_VISIBLE_SQL = '(p.effective_at IS NULL OR p.effective_at <= NOW())';

function actorColumns(req) {
  if (req.employee) return { employeeId: req.employee.id, adminId: null };
  const isAdminUser = req.admin?.type === 'admin';
  return {
    employeeId: isAdminUser ? null : (req.admin?.id || null),
    adminId: isAdminUser ? req.admin.id : null,
  };
}

// ============================================================
// Tenant admin console
// ============================================================

async function listPolicies(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*,
            (SELECT COUNT(*) FROM policy_acknowledgements pa WHERE pa.policy_id = p.id) AS acknowledgement_count,
            (SELECT COUNT(*) FROM employees e WHERE e.tenant_id = p.tenant_id AND e.is_active = 1) AS active_employee_count
     FROM tenant_policies p
     WHERE p.tenant_id = ?
     ORDER BY FIELD(p.policy_type, 'leave', 'penalties', 'privacy', 'other'), p.version DESC`,
    [req.tenantId]
  );
  res.json({ policies: rows });
}

async function createPolicy(req, res) {
  const { value, error } = createPolicyBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const [existing] = await pool.query(
    'SELECT id, version FROM tenant_policies WHERE tenant_id = ? AND policy_type = ? ORDER BY version DESC LIMIT 1',
    [req.tenantId, value.policy_type]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: 'A policy of this type already exists. Edit the draft or create a new version.' });
  }

  const { employeeId, adminId } = actorColumns(req);
  const [result] = await pool.query(
    `INSERT INTO tenant_policies
       (tenant_id, policy_type, title, content, version, is_published, requires_ack, created_by, updated_by)
     VALUES (?, ?, ?, ?, 1, 0, ?, ?, ?)`,
    [req.tenantId, value.policy_type, value.title, value.content, value.requires_ack ? 1 : 0, adminId, adminId]
  );

  await logActivity(employeeId, adminId, 'policy_created', `Created policy draft: ${value.title} (${value.policy_type})`, { tenant_id: req.tenantId });
  const [rows] = await pool.query('SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?', [result.insertId, req.tenantId]);
  res.status(201).json({ policy: rows[0] });
}

async function updatePolicy(req, res) {
  const { value, error } = updatePolicyBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const [rows] = await pool.query(
    'SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.tenantId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
  if (rows[0].is_published === 1) {
    return res.status(409).json({ error: 'Published versions are immutable. Create a new version to make changes.' });
  }

  const { employeeId, adminId } = actorColumns(req);
  const fields = [];
  const params = [];
  if (value.title !== undefined) { fields.push('title = ?'); params.push(value.title); }
  if (value.content !== undefined) { fields.push('content = ?'); params.push(value.content); }
  if (value.requires_ack !== undefined) { fields.push('requires_ack = ?'); params.push(value.requires_ack ? 1 : 0); }
  fields.push('updated_by = ?'); params.push(adminId);

  await pool.query(
    `UPDATE tenant_policies SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
    [...params, req.params.id, req.tenantId]
  );

  await logActivity(employeeId, adminId, 'policy_updated', `Updated policy draft: ${value.title || rows[0].title}`, { tenant_id: req.tenantId });
  const [updated] = await pool.query('SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
  res.json({ policy: updated[0] });
}

async function publishPolicy(req, res) {
  const { value, error } = publishPolicyBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const [rows] = await pool.query(
    'SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.tenantId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
  if (rows[0].is_published === 1) return res.status(409).json({ error: 'Policy is already published' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE tenant_policies SET is_published = 0, published_at = NULL WHERE tenant_id = ? AND policy_type = ? AND is_published = 1',
      [req.tenantId, rows[0].policy_type]
    );
    await conn.query(
      'UPDATE tenant_policies SET is_published = 1, published_at = NOW(), effective_at = ? WHERE id = ? AND tenant_id = ?',
      [value.effective_at || new Date(), req.params.id, req.tenantId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const { employeeId, adminId } = actorColumns(req);
  await logActivity(
    employeeId, adminId, 'policy_published',
    `Published policy v${rows[0].version}: ${rows[0].title} (${rows[0].policy_type})`,
    { tenant_id: req.tenantId, old_value: { is_published: false }, new_value: { is_published: true } }
  );

  const [published] = await pool.query('SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
  res.json({ policy: published[0] });
}

async function createNewVersion(req, res) {
  const [rows] = await pool.query(
    'SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.tenantId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
  const source = rows[0];

  const [[draft]] = await pool.query(
    'SELECT id FROM tenant_policies WHERE tenant_id = ? AND policy_type = ? AND is_published = 0 LIMIT 1',
    [req.tenantId, source.policy_type]
  );
  if (draft) {
    return res.status(409).json({ error: 'A draft already exists for this policy type. Edit or publish it first.' });
  }

  const [[latest]] = await pool.query(
    'SELECT MAX(version) AS max_version FROM tenant_policies WHERE tenant_id = ? AND policy_type = ?',
    [req.tenantId, source.policy_type]
  );
  const nextVersion = (latest.max_version || source.version) + 1;
  const { employeeId, adminId } = actorColumns(req);

  const [result] = await pool.query(
    `INSERT INTO tenant_policies
       (tenant_id, policy_type, title, content, version, is_published, requires_ack, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [req.tenantId, source.policy_type, source.title, source.content, nextVersion, source.requires_ack, adminId, adminId]
  );

  await logActivity(employeeId, adminId, 'policy_version_created', `Created draft v${nextVersion} of ${source.title}`, { tenant_id: req.tenantId });
  const [created] = await pool.query('SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?', [result.insertId, req.tenantId]);
  res.status(201).json({ policy: created[0] });
}

async function deletePolicy(req, res) {
  const [rows] = await pool.query(
    'SELECT * FROM tenant_policies WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.tenantId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
  if (rows[0].is_published === 1) {
    return res.status(409).json({ error: 'Published policies cannot be deleted. Publish a newer version instead.' });
  }

  await pool.query('DELETE FROM tenant_policies WHERE id = ? AND tenant_id = ?', [req.params.id, req.tenantId]);
  const { employeeId, adminId } = actorColumns(req);
  await logActivity(employeeId, adminId, 'policy_deleted', `Deleted policy draft: ${rows[0].title} v${rows[0].version}`, { tenant_id: req.tenantId });
  res.json({ id: Number(req.params.id) });
}

async function listPolicyAcknowledgements(req, res) {
  const [policy] = await pool.query(
    'SELECT id, title, version, is_published FROM tenant_policies WHERE id = ? AND tenant_id = ?',
    [req.params.id, req.tenantId]
  );
  if (policy.length === 0) return res.status(404).json({ error: 'Policy not found' });

  const [rows] = await pool.query(
    `SELECT e.id AS employee_id, e.name, e.email,
            pa.accepted_at, pa.ip_address
     FROM employees e
     LEFT JOIN policy_acknowledgements pa
       ON pa.employee_id = e.id AND pa.policy_id = ? AND pa.tenant_id = ?
     WHERE e.tenant_id = ? AND e.is_active = 1
     ORDER BY (pa.accepted_at IS NULL) DESC, e.name ASC`,
    [req.params.id, req.tenantId, req.tenantId]
  );
  res.json({ policy: policy[0], employees: rows });
}

// ============================================================
// Employee self-service
// ============================================================

async function listMyPolicies(req, res) {
  const [rows] = await pool.query(
    `SELECT p.id, p.policy_type, p.title, p.content, p.version, p.requires_ack,
            p.published_at, p.effective_at, pa.accepted_at
     FROM tenant_policies p
     LEFT JOIN policy_acknowledgements pa
       ON pa.policy_id = p.id AND pa.employee_id = ? AND pa.tenant_id = p.tenant_id
     WHERE p.tenant_id = ? AND p.is_published = 1 AND ${PUBLISHED_VISIBLE_SQL}
     ORDER BY FIELD(p.policy_type, 'leave', 'penalties', 'privacy', 'other')`,
    [req.employee.id, req.tenantId]
  );
  res.json({ policies: rows });
}

async function acknowledgePolicy(req, res) {
  const [rows] = await pool.query(
    `SELECT id, title, version, requires_ack
     FROM tenant_policies p
     WHERE p.id = ? AND p.tenant_id = ? AND p.is_published = 1 AND ${PUBLISHED_VISIBLE_SQL}`,
    [req.params.id, req.tenantId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Policy not found' });
  const policy = rows[0];
  if (policy.requires_ack !== 1) {
    return res.status(400).json({ error: 'This policy does not require acknowledgement' });
  }

  await pool.query(
    `INSERT IGNORE INTO policy_acknowledgements
       (tenant_id, policy_id, policy_version, employee_id, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.tenantId,
      policy.id,
      policy.version,
      req.employee.id,
      (req.ip || '').slice(0, 45) || null,
      (req.get('user-agent') || '').slice(0, 255) || null,
    ]
  );

  await logActivity(req.employee.id, null, 'policy_acknowledged', `Acknowledged policy v${policy.version}: ${policy.title}`, { tenant_id: req.tenantId });

  const [[ack]] = await pool.query(
    'SELECT accepted_at FROM policy_acknowledgements WHERE policy_id = ? AND employee_id = ? AND tenant_id = ?',
    [policy.id, req.employee.id, req.tenantId]
  );
  res.json({ policy_id: policy.id, acknowledged: true, accepted_at: ack.accepted_at });
}

module.exports = {
  POLICY_TYPES,
  listPolicies,
  createPolicy,
  updatePolicy,
  publishPolicy,
  createNewVersion,
  deletePolicy,
  listPolicyAcknowledgements,
  listMyPolicies,
  acknowledgePolicy,
};

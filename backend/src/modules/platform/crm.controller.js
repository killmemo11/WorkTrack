// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const {
  createCrmContactBody,
  updateCrmContactBody,
  crmActivityBody,
} = require('../../shared/validations/schemas');

const STAGES = ['lead', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const CLOSED_STAGES = ['won', 'lost'];

function contactSelect() {
  return `SELECT c.*, au.username AS owner_username,
      t.name AS tenant_name, t.status AS tenant_status,
      tr.status AS request_status,
      (SELECT COUNT(*) FROM platform_crm_activities a WHERE a.contact_id = c.id) AS activity_count
    FROM platform_crm_contacts c
    LEFT JOIN admin_users au ON au.id = c.owner_admin_id
    LEFT JOIN tenants t ON t.id = c.tenant_id
    LEFT JOIN tenant_requests tr ON tr.id = c.tenant_request_id`;
}

async function recordActivity(conn, contactId, adminId, { type = 'note', subject = null, body = null } = {}) {
  await conn.query(
    `INSERT INTO platform_crm_activities (contact_id, type, subject, body, admin_id)
     VALUES (?, ?, ?, ?, ?)`,
    [contactId, type, subject, body, adminId]
  );
}

// ============================================================
// MARKETING OVERVIEW
// ============================================================

async function getOverview(req, res) {
  const [stageRows] = await pool.query(
    'SELECT stage, COUNT(*) AS count FROM platform_crm_contacts GROUP BY stage'
  );
  const pipeline = Object.fromEntries(STAGES.map((stage) => [stage, 0]));
  let totalContacts = 0;
  for (const row of stageRows) {
    pipeline[row.stage] = Number(row.count);
    totalContacts += Number(row.count);
  }

  const [followUps] = await pool.query(
    `SELECT
       COUNT(CASE WHEN next_follow_up_at <= NOW() THEN 1 END) AS overdue,
       COUNT(CASE WHEN next_follow_up_at > NOW() AND next_follow_up_at <= DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 END) AS next_7_days
     FROM platform_crm_contacts
     WHERE stage NOT IN ('won', 'lost') AND next_follow_up_at IS NOT NULL`
  );

  const [requestStats] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
       COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved,
       COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected,
       COUNT(CASE WHEN status = 'pending' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) AS pending_last_30_days
     FROM tenant_requests`
  );

  const [tenantStats] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(CASE WHEN status = 'active' THEN 1 END) AS active,
       COUNT(CASE WHEN status = 'suspended' THEN 1 END) AS suspended,
       COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
     FROM tenants WHERE deleted_at IS NULL`
  );

  const [paymentStats] = await pool.query(
    `SELECT
       COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
       COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_amount,
       COUNT(CASE WHEN status = 'verified' AND verified_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) AS verified_last_30_days
     FROM payment_history`
  );

  const [revenueByCurrency] = await pool.query(
    `SELECT currency, COALESCE(SUM(amount), 0) AS total
     FROM payment_history
     WHERE status = 'verified' AND verified_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY currency
     ORDER BY total DESC`
  );

  const [recentContacts] = await pool.query(
    `${contactSelect()}
     ORDER BY c.created_at DESC
     LIMIT 8`
  );

  const [recentActivities] = await pool.query(
    `SELECT a.id, a.contact_id, a.type, a.subject, a.occurred_at, c.company_name
     FROM platform_crm_activities a
     JOIN platform_crm_contacts c ON c.id = a.contact_id
     ORDER BY a.occurred_at DESC, a.id DESC
     LIMIT 10`
  );

  const [upcomingFollowUps] = await pool.query(
    `${contactSelect()}
     WHERE c.stage NOT IN ('won', 'lost') AND c.next_follow_up_at IS NOT NULL
     ORDER BY c.next_follow_up_at ASC
     LIMIT 8`
  );

  res.json({
    pipeline: { total: totalContacts, ...pipeline },
    follow_ups: {
      overdue: Number(followUps[0]?.overdue || 0),
      next_7_days: Number(followUps[0]?.next_7_days || 0),
    },
    requests: requestStats[0],
    tenants: tenantStats[0],
    payments: paymentStats[0],
    revenue_30_days: revenueByCurrency,
    recent_contacts: recentContacts,
    upcoming_follow_ups: upcomingFollowUps,
    recent_activities: recentActivities,
  });
}

// ============================================================
// CONTACTS
// ============================================================

async function listContacts(req, res) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const offset = (page - 1) * limit;
  const { stage, owner_admin_id, follow_up, q } = req.query;

  const where = [];
  const params = [];

  if (stage && STAGES.includes(stage)) {
    where.push('c.stage = ?');
    params.push(stage);
  }
  if (owner_admin_id) {
    where.push('c.owner_admin_id = ?');
    params.push(owner_admin_id);
  }
  if (follow_up === 'due') {
    where.push('c.next_follow_up_at IS NOT NULL AND c.next_follow_up_at <= NOW()');
  } else if (follow_up === 'week') {
    where.push('c.next_follow_up_at IS NOT NULL AND c.next_follow_up_at <= DATE_ADD(NOW(), INTERVAL 7 DAY)');
  }
  if (q && q.trim()) {
    const like = `%${q.trim()}%`;
    where.push('(c.company_name LIKE ? OR c.contact_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)');
    params.push(like, like, like, like);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `${contactSelect()}
     ${whereClause}
     ORDER BY (c.stage IN ('won', 'lost')) ASC,
       (c.next_follow_up_at IS NULL) ASC,
       c.next_follow_up_at ASC,
       c.updated_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM platform_crm_contacts c ${whereClause}`,
    params
  );

  res.json({
    contacts: rows,
    total: countRows[0].total,
    page,
    totalPages: Math.ceil(countRows[0].total / limit) || 1,
  });
}

async function getContact(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(`${contactSelect()} WHERE c.id = ?`, [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Contact not found' });

  const [activities] = await pool.query(
    `SELECT a.*, au.username AS admin_username
     FROM platform_crm_activities a
     LEFT JOIN admin_users au ON au.id = a.admin_id
     WHERE a.contact_id = ?
     ORDER BY a.occurred_at DESC, a.id DESC
     LIMIT 100`,
    [id]
  );

  res.json({ ...rows[0], activities });
}

async function createContact(req, res) {
  const { error, value } = createCrmContactBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const email = value.email.trim().toLowerCase();
  const [duplicate] = await pool.query(
    'SELECT id FROM platform_crm_contacts WHERE email = ?',
    [email]
  );
  if (duplicate.length > 0) {
    return res.status(409).json({ error: 'A contact with this email already exists', contact_id: duplicate[0].id });
  }

  const conn = await pool.getConnection();
  let contactId;
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO platform_crm_contacts
       (company_name, contact_name, job_title, email, phone, website, industry, employee_count,
        plan_interest, stage, source, owner_admin_id, next_follow_up_at, notes, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        value.company_name,
        value.contact_name || null,
        value.job_title || null,
        email,
        value.phone || null,
        value.website || null,
        value.industry || null,
        value.employee_count || null,
        value.plan_interest || null,
        value.stage || 'lead',
        value.source || 'manual',
        value.owner_admin_id || req.platformAdmin.id,
        value.next_follow_up_at || null,
        value.notes || null,
        req.platformAdmin.id,
        req.platformAdmin.id,
      ]
    );
    contactId = result.insertId;

    await recordActivity(conn, contactId, req.platformAdmin.id, {
      type: 'note',
      subject: 'Contact created',
      body: value.notes || null,
    });

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logActivity(null, req.platformAdmin.id, 'crm_contact_created', `Created CRM contact: ${value.company_name} (${email})`);
  const [created] = await pool.query(`${contactSelect()} WHERE c.id = ?`, [contactId]);
  res.status(201).json(created[0]);
}

async function updateContact(req, res) {
  const { id } = req.params;
  const { error, value } = updateCrmContactBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const [existing] = await pool.query('SELECT * FROM platform_crm_contacts WHERE id = ?', [id]);
  if (existing.length === 0) return res.status(404).json({ error: 'Contact not found' });
  const current = existing[0];

  const updates = [];
  const params = [];
  const setField = (column, next) => {
    updates.push(`${column} = ?`);
    params.push(next);
  };

  if (value.company_name !== undefined) setField('company_name', value.company_name);
  if (value.contact_name !== undefined) setField('contact_name', value.contact_name || null);
  if (value.job_title !== undefined) setField('job_title', value.job_title || null);
  if (value.email !== undefined) {
    const email = value.email.trim().toLowerCase();
    if (email !== current.email) {
      const [duplicate] = await pool.query(
        'SELECT id FROM platform_crm_contacts WHERE email = ? AND id != ?',
        [email, id]
      );
      if (duplicate.length > 0) {
        return res.status(409).json({ error: 'A contact with this email already exists' });
      }
    }
    setField('email', email);
  }
  if (value.phone !== undefined) setField('phone', value.phone || null);
  if (value.website !== undefined) setField('website', value.website || null);
  if (value.industry !== undefined) setField('industry', value.industry || null);
  if (value.employee_count !== undefined) setField('employee_count', value.employee_count || null);
  if (value.plan_interest !== undefined) setField('plan_interest', value.plan_interest || null);
  if (value.stage !== undefined) setField('stage', value.stage);
  if (value.source !== undefined) setField('source', value.source || null);
  if (value.owner_admin_id !== undefined) setField('owner_admin_id', value.owner_admin_id || null);
  if (value.next_follow_up_at !== undefined) setField('next_follow_up_at', value.next_follow_up_at || null);
  if (value.notes !== undefined) setField('notes', value.notes || null);

  // Closing a deal no longer needs a follow-up; reopen keeps whatever is set.
  if (value.stage !== undefined && CLOSED_STAGES.includes(value.stage)) {
    setField('next_follow_up_at', null);
  }

  setField('updated_by', req.platformAdmin.id);
  params.push(id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE platform_crm_contacts SET ${updates.join(', ')} WHERE id = ?`, params);

    if (value.stage !== undefined && value.stage !== current.stage) {
      await recordActivity(conn, id, req.platformAdmin.id, {
        type: 'stage_change',
        subject: `Stage: ${current.stage} -> ${value.stage}`,
        body: value.notes !== undefined ? value.notes : null,
      });
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
    'crm_contact_updated',
    `Updated CRM contact ${id} (${current.company_name})${value.stage ? `: ${current.stage} -> ${value.stage}` : ''}`
  );

  const [updated] = await pool.query(`${contactSelect()} WHERE c.id = ?`, [id]);
  res.json(updated[0]);
}

async function addActivity(req, res) {
  const { id } = req.params;
  const { error, value } = crmActivityBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const [contacts] = await pool.query('SELECT id, company_name FROM platform_crm_contacts WHERE id = ?', [id]);
  if (contacts.length === 0) return res.status(404).json({ error: 'Contact not found' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO platform_crm_activities (contact_id, type, subject, body, occurred_at, admin_id)
       VALUES (?, ?, ?, ?, COALESCE(?, NOW()), ?)`,
      [
        id,
        value.type || 'note',
        value.subject || null,
        value.body || null,
        value.occurred_at || null,
        req.platformAdmin.id,
      ]
    );

    if (value.next_follow_up_at !== undefined) {
      await conn.query(
        'UPDATE platform_crm_contacts SET next_follow_up_at = ?, updated_by = ? WHERE id = ?',
        [value.next_follow_up_at || null, req.platformAdmin.id, id]
      );
    }

    await conn.commit();

    const [created] = await pool.query(
      `SELECT a.*, au.username AS admin_username
       FROM platform_crm_activities a
       LEFT JOIN admin_users au ON au.id = a.admin_id
       WHERE a.id = ?`,
      [result.insertId]
    );
    res.status(201).json(created[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deleteContact(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    'SELECT id, company_name, tenant_id, tenant_request_id FROM platform_crm_contacts WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Contact not found' });

  const contact = rows[0];
  if (contact.tenant_id || contact.tenant_request_id) {
    return res.status(400).json({
      error: 'This contact is linked to a tenant or signup request. Mark it lost instead of deleting it.',
    });
  }

  await pool.query('DELETE FROM platform_crm_contacts WHERE id = ?', [id]);
  await logActivity(null, req.platformAdmin.id, 'crm_contact_deleted', `Deleted CRM contact: ${contact.company_name}`);

  res.json({ message: 'Contact deleted' });
}

module.exports = {
  getOverview,
  listContacts,
  getContact,
  createContact,
  updateContact,
  addActivity,
  deleteContact,
};

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { publishEvent } = require('./engines/workflow.engine');

function actorId(req) {
  return req.admin?.id || req.hr?.id || null;
}

async function templateInTenant(templateId, tenantId) {
  const [rows] = await pool.query(
    'SELECT id FROM workflow_templates WHERE id = ? AND tenant_id = ?',
    [templateId, tenantId]
  );
  return rows.length > 0;
}

async function employeeInTenant(employeeId, tenantId) {
  const [rows] = await pool.query(
    'SELECT id FROM employees WHERE id = ? AND tenant_id = ?',
    [employeeId, tenantId]
  );
  return rows.length > 0;
}

// ── Workflow Templates ─────────────────────────────────────────
async function listTemplates(req, res) {
  const [rows] = await pool.query(
    `SELECT wt.*,
            (SELECT COUNT(*) FROM workflow_stages WHERE template_id = wt.id) AS stages_count,
            (SELECT COUNT(*) FROM workflow_rules WHERE workflow_template_id = wt.id) AS rules_count
     FROM workflow_templates wt WHERE wt.tenant_id = ? ORDER BY wt.name`,
    [req.tenantId]
  );
  res.json(rows);
}

async function getTemplate(req, res) {
  const { id } = req.params;
  const [[template]] = await pool.query(
    'SELECT * FROM workflow_templates WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const [stages] = await pool.query(
    'SELECT * FROM workflow_stages WHERE template_id = ? AND tenant_id = ? ORDER BY stage_order',
    [id, req.tenantId]
  );
  const [rules] = await pool.query(
    'SELECT * FROM workflow_rules WHERE workflow_template_id = ? AND tenant_id = ? ORDER BY priority',
    [id, req.tenantId]
  );
  res.json({ ...template, stages, rules });
}

async function createTemplate(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const [result] = await pool.query(
    'INSERT INTO workflow_templates (tenant_id, name, description) VALUES (?, ?, ?)',
    [req.tenantId, name, description || '']
  );
  const [[template]] = await pool.query(
    'SELECT * FROM workflow_templates WHERE id = ? AND tenant_id = ?',
    [result.insertId, req.tenantId]
  );
  logActivity(null, actorId(req), 'workflow_template_created', `Created workflow: ${name}`);
  res.status(201).json(template);
}

async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, description, is_active } = req.body;
  const fields = []; const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(id, req.tenantId);
  await pool.query(
    `UPDATE workflow_templates SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?`,
    params
  );
  const [[template]] = await pool.query(
    'SELECT * FROM workflow_templates WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (!template) return res.status(404).json({ error: 'Template not found' });
  logActivity(null, actorId(req), 'workflow_template_updated', `Updated workflow #${id}`);
  res.json(template);
}

async function deleteTemplate(req, res) {
  const { id } = req.params;
  const [result] = await pool.query(
    'DELETE FROM workflow_templates WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Template not found' });
  logActivity(null, actorId(req), 'workflow_template_deleted', `Deleted workflow #${id}`);
  res.json({ deleted: parseInt(id) });
}

// ── Workflow Stages ────────────────────────────────────────────
async function listStages(req, res) {
  const { template_id } = req.query;
  let sql = 'SELECT ws.*, mt.name AS message_template_name FROM workflow_stages ws LEFT JOIN message_templates mt ON mt.id = ws.message_template_id AND mt.tenant_id = ws.tenant_id WHERE ws.tenant_id = ?';
  const params = [req.tenantId];
  if (template_id) { sql += ' AND ws.template_id = ?'; params.push(template_id); }
  sql += ' ORDER BY ws.template_id, ws.stage_order';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}

async function createStage(req, res) {
  const { template_id, stage_order, stage_key, display_name, stage_type, responsible_role,
    requires_confirmation, requires_attendance, requires_evaluation, is_optional, allow_skip, auto_advance,
    form_config, sla_duration, sla_reminder_after, sla_escalation_after, sla_max_delay, message_template_id } = req.body;
  if (!template_id || !stage_key || !display_name) {
    return res.status(400).json({ error: 'template_id, stage_key, and display_name are required' });
  }
  if (!await templateInTenant(template_id, req.tenantId)) {
    return res.status(404).json({ error: 'Template not found' });
  }
  if (message_template_id) {
    const [mt] = await pool.query(
      'SELECT id FROM message_templates WHERE id = ? AND tenant_id = ?',
      [message_template_id, req.tenantId]
    );
    if (mt.length === 0) return res.status(404).json({ error: 'Message template not found' });
  }
  const [result] = await pool.query(
    `INSERT INTO workflow_stages (tenant_id, template_id, stage_order, stage_key, display_name, stage_type, responsible_role,
     requires_confirmation, requires_attendance, requires_evaluation, is_optional, allow_skip, auto_advance,
     form_config, sla_duration, sla_reminder_after, sla_escalation_after, sla_max_delay, message_template_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId, template_id, stage_order || 0, stage_key, display_name, stage_type || 'interview', responsible_role || null,
     requires_confirmation !== undefined ? (requires_confirmation ? 1 : 0) : 1,
     requires_attendance !== undefined ? (requires_attendance ? 1 : 0) : 1,
     requires_evaluation !== undefined ? (requires_evaluation ? 1 : 0) : 1,
     is_optional ? 1 : 0, allow_skip ? 1 : 0, auto_advance ? 1 : 0,
     form_config ? JSON.stringify(form_config) : null,
     sla_duration || null, sla_reminder_after || null, sla_escalation_after || null, sla_max_delay || null,
     message_template_id || null]
  );
  const [[stage]] = await pool.query(
    'SELECT * FROM workflow_stages WHERE id = ? AND tenant_id = ?',
    [result.insertId, req.tenantId]
  );
  res.status(201).json(stage);
}

async function updateStage(req, res) {
  const { id } = req.params;
  const allowed = ['stage_order','stage_key','display_name','stage_type','responsible_role',
    'requires_confirmation','requires_attendance','requires_evaluation','is_optional','allow_skip','auto_advance',
    'form_config','sla_duration','sla_reminder_after','sla_escalation_after','sla_max_delay','message_template_id'];
  const updates = []; const params = [];
  for (const col of allowed) {
    if (req.body[col] !== undefined) {
      updates.push(`${col} = ?`);
      params.push(col === 'form_config' ? JSON.stringify(req.body[col]) : req.body[col]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  if (req.body.message_template_id) {
    const [mt] = await pool.query(
      'SELECT id FROM message_templates WHERE id = ? AND tenant_id = ?',
      [req.body.message_template_id, req.tenantId]
    );
    if (mt.length === 0) return res.status(404).json({ error: 'Message template not found' });
  }
  params.push(id, req.tenantId);
  await pool.query(
    `UPDATE workflow_stages SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
    params
  );
  const [[stage]] = await pool.query(
    'SELECT * FROM workflow_stages WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (!stage) return res.status(404).json({ error: 'Stage not found' });
  res.json(stage);
}

async function deleteStage(req, res) {
  const { id } = req.params;
  const [result] = await pool.query(
    'DELETE FROM workflow_stages WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Stage not found' });
  res.json({ deleted: parseInt(id) });
}

// ── Workflow Rules ─────────────────────────────────────────────
async function listRules(req, res) {
  const { workflow_template_id } = req.query;
  let sql = 'SELECT * FROM workflow_rules WHERE tenant_id = ?';
  const params = [req.tenantId];
  if (workflow_template_id) { sql += ' AND workflow_template_id = ?'; params.push(workflow_template_id); }
  sql += ' ORDER BY workflow_template_id, priority';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}

async function createRule(req, res) {
  const { workflow_template_id, rule_name, trigger_event, condition_field, condition_operator, condition_value, action_type, action_params, priority } = req.body;
  if (!workflow_template_id || !rule_name || !trigger_event || !action_type) {
    return res.status(400).json({ error: 'workflow_template_id, rule_name, trigger_event, and action_type are required' });
  }
  if (!await templateInTenant(workflow_template_id, req.tenantId)) {
    return res.status(404).json({ error: 'Template not found' });
  }
  const [result] = await pool.query(
    `INSERT INTO workflow_rules (tenant_id, workflow_template_id, rule_name, trigger_event, condition_field, condition_operator, condition_value, action_type, action_params, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.tenantId, workflow_template_id, rule_name, trigger_event, condition_field || 'always', condition_operator || '==', condition_value || '', action_type, JSON.stringify(action_params || {}), priority || 0]
  );
  const [[rule]] = await pool.query(
    'SELECT * FROM workflow_rules WHERE id = ? AND tenant_id = ?',
    [result.insertId, req.tenantId]
  );
  res.status(201).json(rule);
}

async function updateRule(req, res) {
  const { id } = req.params;
  const allowed = ['rule_name','trigger_event','condition_field','condition_operator','condition_value','action_type','action_params','priority','is_active'];
  const updates = []; const params = [];
  for (const col of allowed) {
    if (req.body[col] !== undefined) {
      updates.push(`${col} = ?`);
      params.push(col === 'action_params' ? JSON.stringify(req.body[col]) : req.body[col]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(id, req.tenantId);
  await pool.query(
    `UPDATE workflow_rules SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
    params
  );
  const [[rule]] = await pool.query(
    'SELECT * FROM workflow_rules WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
}

async function deleteRule(req, res) {
  const { id } = req.params;
  const [result] = await pool.query(
    'DELETE FROM workflow_rules WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (result.affectedRows === 0) return res.status(404).json({ error: 'Rule not found' });
  res.json({ deleted: parseInt(id) });
}

// ── Workflow Events (read-only) ───────────────────────────────
async function listEvents(req, res) {
  const { candidate_id, event_type, page = 1, per_page = 50 } = req.query;
  const offset = (page - 1) * per_page;
  // workflow_events has no tenant_id — scope through the owning candidate.
  let where = ['we.candidate_id IN (SELECT id FROM recruitment_candidates WHERE tenant_id = ?)'];
  const params = [req.tenantId];
  if (candidate_id) { where.push('we.candidate_id = ?'); params.push(candidate_id); }
  if (event_type) { where.push('we.event_type = ?'); params.push(event_type); }
  const whereClause = 'WHERE ' + where.join(' AND ');
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM workflow_events we ${whereClause}`, params
  );
  const [rows] = await pool.query(
    `SELECT we.*, c.name AS candidate_name
     FROM workflow_events we
     LEFT JOIN recruitment_candidates c ON c.id = we.candidate_id AND c.tenant_id = ?
     ${whereClause}
     ORDER BY we.created_at DESC LIMIT ? OFFSET ?`,
    [req.tenantId, ...params, parseInt(per_page), offset]
  );
  res.json({ data: rows, pagination: { page: parseInt(page), per_page: parseInt(per_page), total } });
}

// ── Manager Availability ──────────────────────────────────────
async function getAvailability(req, res) {
  const { employee_id } = req.params;
  const { date_from, date_to } = req.query;
  if (!await employeeInTenant(employee_id, req.tenantId)) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  const { getWeeklySlots, getBlockedDates, getAvailableSlots } = require('./engines/availability.engine');
  if (date_from && date_to) {
    const slots = await getAvailableSlots(employee_id, date_from, date_to);
    return res.json({ slots });
  }
  const weekly = await getWeeklySlots(employee_id);
  const blocked = await getBlockedDates(employee_id, date_from || '2000-01-01', date_to || '2099-12-31');
  res.json({ weekly_slots: weekly, blocked_dates: blocked });
}

async function upsertWeeklySlot(req, res) {
  const { employee_id } = req.params;
  const { day_of_week, start_time, end_time } = req.body;
  if (day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ error: 'day_of_week, start_time, and end_time are required' });
  }
  if (!await employeeInTenant(employee_id, req.tenantId)) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  const { upsertWeeklySlot } = require('./engines/availability.engine');
  await upsertWeeklySlot(employee_id, day_of_week, start_time, end_time);
  res.json({ message: 'Weekly slot saved' });
}

async function deleteWeeklySlot(req, res) {
  const { employee_id, slot_id } = req.params;
  if (!await employeeInTenant(employee_id, req.tenantId)) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  const { deleteWeeklySlot } = require('./engines/availability.engine');
  await deleteWeeklySlot(employee_id, slot_id);
  res.json({ message: 'Weekly slot deleted' });
}

async function blockDate(req, res) {
  const { employee_id } = req.params;
  const { blocked_date, reason } = req.body;
  if (!blocked_date) return res.status(400).json({ error: 'blocked_date is required' });
  if (!await employeeInTenant(employee_id, req.tenantId)) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  const { blockDate } = require('./engines/availability.engine');
  await blockDate(employee_id, blocked_date, reason);
  res.json({ message: 'Date blocked' });
}

async function unblockDate(req, res) {
  const { employee_id } = req.params;
  const { blocked_date } = req.body;
  if (!blocked_date) return res.status(400).json({ error: 'blocked_date is required' });
  if (!await employeeInTenant(employee_id, req.tenantId)) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  const { unblockDate } = require('./engines/availability.engine');
  await unblockDate(employee_id, blocked_date);
  res.json({ message: 'Date unblocked' });
}

module.exports = {
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  listStages, createStage, updateStage, deleteStage,
  listRules, createRule, updateRule, deleteRule,
  listEvents,
  getAvailability, upsertWeeklySlot, deleteWeeklySlot, blockDate, unblockDate,
};

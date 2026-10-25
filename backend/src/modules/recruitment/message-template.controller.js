const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { createTemplateBody, updateTemplateBody } = require('../../shared/validations/schemas');

async function listTemplates(req, res) {
  const { channel } = req.query;
  let sql = 'SELECT * FROM message_templates WHERE tenant_id = ?';
  const params = [req.tenantId];
  if (channel) { sql += ' AND channel = ?'; params.push(channel); }
  sql += ' ORDER BY name';
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}

async function getTemplate(req, res) {
  const { id } = req.params;
  const [[template]] = await pool.query(
    'SELECT * FROM message_templates WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}

async function createTemplate(req, res) {
  const { error } = createTemplateBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { template_key, name, channel, subject, body_template, placeholders } = req.body;
  if (!template_key || !name || !body_template) {
    return res.status(400).json({ error: 'template_key, name, and body_template are required' });
  }
  const [existing] = await pool.query(
    'SELECT id FROM message_templates WHERE template_key = ? AND tenant_id = ?',
    [template_key, req.tenantId]
  );
  if (existing.length > 0) {
    return res.status(409).json({ error: `Template key '${template_key}' already exists` });
  }
  let result;
  try {
    [result] = await pool.query(
      'INSERT INTO message_templates (tenant_id, template_key, name, channel, subject, body_template, placeholders) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.tenantId, template_key, name, channel || 'email', subject || null, body_template, placeholders ? JSON.stringify(placeholders) : null]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: `Template key '${template_key}' already exists` });
    }
    throw err;
  }
  const [[template]] = await pool.query(
    'SELECT * FROM message_templates WHERE id = ? AND tenant_id = ?',
    [result.insertId, req.tenantId]
  );
  logActivity(null, req.admin?.id || req.hr?.id || null, 'message_template_created', `Created template: ${name}`);
  res.status(201).json(template);
}

async function updateTemplate(req, res) {
  const { error } = updateTemplateBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { id } = req.params;
  const allowed = ['template_key', 'name', 'channel', 'subject', 'body_template', 'placeholders', 'is_system'];
  const updates = []; const params = [];
  for (const col of allowed) {
    if (req.body[col] !== undefined) {
      updates.push(`${col} = ?`);
      params.push(col === 'placeholders' ? JSON.stringify(req.body[col]) : req.body[col]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(id, req.tenantId);
  await pool.query(
    `UPDATE message_templates SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
    params
  );
  const [[template]] = await pool.query(
    'SELECT * FROM message_templates WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (!template) return res.status(404).json({ error: 'Template not found' });
  logActivity(null, req.admin?.id || req.hr?.id || null, 'message_template_updated', `Updated template #${id}`);
  res.json(template);
}

async function deleteTemplate(req, res) {
  const { id } = req.params;
  const [[template]] = await pool.query(
    'SELECT * FROM message_templates WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (template.is_system) return res.status(403).json({ error: 'System templates cannot be deleted' });
  await pool.query(
    'DELETE FROM message_templates WHERE id = ? AND tenant_id = ?',
    [id, req.tenantId]
  );
  logActivity(null, req.admin?.id || req.hr?.id || null, 'message_template_deleted', `Deleted template #${id}`);
  res.json({ deleted: parseInt(id) });
}

async function renderPreview(req, res) {
  const { id } = req.params;
  const { context } = req.body;
  const { render } = require('./engines/template.engine');
  try {
    const [[template]] = await pool.query(
      'SELECT template_key, channel FROM message_templates WHERE id = ? AND tenant_id = ?',
      [id, req.tenantId]
    );
    if (!template) return res.status(404).json({ error: 'Template not found' });
    const result = await render(template.template_key, context || {}, template.channel);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Failed to render template preview' });
  }
}

module.exports = { listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, renderPreview };

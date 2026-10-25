const pool = require('../../../shared/config/database');
const { escapeHtml } = require('../../../shared/utils/sanitize');
const { getTenantId } = require('../../../shared/utils/tenant-context');

async function render(templateKey, context, channel) {
  const tenantId = getTenantId() || 1;
  let [templates] = await pool.query(
    channel
      ? 'SELECT * FROM message_templates WHERE template_key = ? AND channel = ? AND tenant_id = ? LIMIT 1'
      : 'SELECT * FROM message_templates WHERE template_key = ? AND tenant_id = ? LIMIT 1',
    channel ? [templateKey, channel, tenantId] : [templateKey, tenantId]
  );
  // Fall back to platform-provided system templates when a workspace has no override.
  if (templates.length === 0 && tenantId !== 1) {
    [templates] = await pool.query(
      channel
        ? 'SELECT * FROM message_templates WHERE template_key = ? AND channel = ? AND tenant_id = 1 AND is_system = 1 LIMIT 1'
        : 'SELECT * FROM message_templates WHERE template_key = ? AND tenant_id = 1 AND is_system = 1 LIMIT 1',
      channel ? [templateKey, channel] : [templateKey]
    );
  }
  if (templates.length === 0) {
    throw new Error(`Template '${templateKey}' not found${channel ? ` for channel '${channel}'` : ''}`);
  }
  const tpl = templates[0];
  let body = tpl.body_template;
  if (tpl.subject) {
    let subject = tpl.subject;
    for (const [key, val] of Object.entries(context || {})) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const safeVal = escapeHtml(String(val ?? ''));
      body = body.replace(placeholder, safeVal);
      subject = subject.replace(placeholder, safeVal);
    }
    return { subject, html: body };
  }
  for (const [key, val] of Object.entries(context || {})) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    body = body.replace(placeholder, escapeHtml(String(val ?? '')));
  }
  return { html: body };
}

async function renderEmail(templateKey, context) {
  const result = await render(templateKey, context, 'email');
  const { mailLayout } = require('../../../shared/services/email.service');
  return { subject: result.subject, html: mailLayout(result.html) };
}

module.exports = { render, renderEmail };

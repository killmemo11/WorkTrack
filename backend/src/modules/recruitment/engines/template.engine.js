const pool = require('../../../shared/config/database');

async function render(templateKey, context, channel) {
  const [templates] = await pool.query(
    channel
      ? 'SELECT * FROM message_templates WHERE template_key = ? AND channel = ? LIMIT 1'
      : 'SELECT * FROM message_templates WHERE template_key = ? LIMIT 1',
    channel ? [templateKey, channel] : [templateKey]
  );
  if (templates.length === 0) {
    throw new Error(`Template '${templateKey}' not found${channel ? ` for channel '${channel}'` : ''}`);
  }
  const tpl = templates[0];
  let body = tpl.body_template;
  if (tpl.subject) {
    let subject = tpl.subject;
    for (const [key, val] of Object.entries(context || {})) {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      body = body.replace(placeholder, String(val ?? ''));
      subject = subject.replace(placeholder, String(val ?? ''));
    }
    return { subject, html: body };
  }
  for (const [key, val] of Object.entries(context || {})) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    body = body.replace(placeholder, String(val ?? ''));
  }
  return { html: body };
}

async function renderEmail(templateKey, context) {
  const result = await render(templateKey, context, 'email');
  const { mailLayout } = require('../../../shared/services/email.service');
  return { subject: result.subject, html: mailLayout(result.html) };
}

module.exports = { render, renderEmail };

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const pool = require('../../shared/config/database');
const { requirePermission } = require('../../shared/middleware/rbac.middleware');

// Get IT settings (SMTP, GPS, Branding, Meetings)
router.get('/settings', requirePermission('it.view_settings'), async (req, res) => {
  const tenantId = req.tenantId || 1;
  const keys = [
    'smtp_host','smtp_port','smtp_user','smtp_from',
    'office_lat','office_lng','office_radius_meters',
    'logo_data',
    'meeting_google_service_email','meeting_google_private_key',
    'meeting_teams_tenant_id','meeting_teams_client_id','meeting_teams_client_secret',
  ];
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${placeholders}) AND tenant_id = ?`,
    [...keys, tenantId]
  );
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  delete settings.smtp_pass;
  res.json(settings);
});

// Update IT settings
router.put('/settings', requirePermission('it.manage_smtp'), async (req, res) => {
  const tenantId = req.tenantId || 1;
  const allowed = [
    'smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from',
    'office_lat','office_lng','office_radius_meters',
    'logo_data',
    'meeting_google_service_email','meeting_google_private_key',
    'meeting_teams_tenant_id','meeting_teams_client_id','meeting_teams_client_secret',
  ];
  const updates = req.body;
  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key));

  if (entries.length > 0) {
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO settings (\`key\`, \`value\`, tenant_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
        [key, String(value), tenantId]
      );
    }
  }

  const { logActivity } = require('../../shared/services/activity.service');
  const changedKeys = Object.keys(updates).filter(k => allowed.includes(k));
  const adminId = req.admin?.id || null;
  await logActivity(null, adminId, 'it_settings_updated', `IT settings updated: ${changedKeys.join(', ')}`, null, tenantId);

  res.json({ message: 'Settings updated', updated: changedKeys });
});

// Test SMTP
router.post('/test-email', requirePermission('it.manage_smtp'), async (req, res) => {
  const nodemailer = require('nodemailer');
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Recipient email required' });

  const tenantId = req.tenantId || 1;
  const [rows] = await pool.query(
    `SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from') AND tenant_id = ?`,
    [tenantId]
  );
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;

  if (!settings.smtp_host) return res.status(400).json({ error: 'SMTP not configured' });

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port) || 587,
    secure: parseInt(settings.smtp_port) === 465,
    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
  });

  try {
    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user,
      to,
      subject: 'WorkTrack — SMTP Test',
      html: `<div style="font-family:Arial;padding:20px;"><h2 style="color:#22c55e">Test Email</h2><p>Your SMTP settings are working correctly.</p></div>`,
    });
    res.json({ message: `Test email sent to ${to}` });
  } catch (err) {
    res.status(400).json({ error: 'Failed to send. Check SMTP settings.' });
  }
});

// Test meeting integration
router.post('/test-meeting', requirePermission('it.manage_meetings'), async (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider required' });
  try {
    const { testGoogleConnection, testTeamsConnection } = require('../../shared/services/meeting.service');
    let link;
    if (provider === 'google') link = await testGoogleConnection();
    else if (provider === 'teams') link = await testTeamsConnection();
    else return res.status(400).json({ error: 'Invalid provider' });
    res.json({ message: `${provider} connection successful`, link });
  } catch (err) {
    res.status(400).json({ error: 'Connection failed' });
  }
});

module.exports = router;
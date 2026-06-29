// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');

async function getSettings(req, res) {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
}

async function updateSettings(req, res) {
  try {
    const allowed = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'office_lat', 'office_lng', 'office_radius_meters', 'work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'logo_data', 'service_wfh', 'service_office_attendance', 'service_leaves', 'service_recruitment', 'service_people', 'service_manager', 'allowed_email_domain', 'ceo_email', 'meeting_google_service_email', 'meeting_google_private_key', 'meeting_teams_tenant_id', 'meeting_teams_client_id', 'meeting_teams_client_secret'];
    const updates = req.body;
    const entries = Object.entries(updates).filter(([key]) => allowed.includes(key));
    if (entries.length > 0) {
      const values = entries.map(() => '(?, ?)').join(',');
      const flatParams = entries.flatMap(([k, v]) => [k, String(v)]);
      await pool.query(
        `INSERT INTO settings (\`key\`, \`value\`) VALUES ${values} ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
        flatParams
      );
    }

    // Sync CEO role after updating ceo_email
    if (updates.ceo_email !== undefined) {
      const newCeoEmail = (updates.ceo_email || '').trim().toLowerCase();

      const [oldRows] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email'");
      const oldCeoEmail = oldRows.length > 0 ? oldRows[0].value.trim().toLowerCase() : '';

      if (newCeoEmail) {
        await pool.query(
          "UPDATE employees SET role = 'ceo', department_id = NULL WHERE email = ? AND role != 'admin'",
          [newCeoEmail]
        );
      }

      if (oldCeoEmail && oldCeoEmail !== newCeoEmail) {
        const [cleDepts] = await pool.query('SELECT id FROM departments WHERE c_level_email = ?', [oldCeoEmail]);
        const [mgrDepts] = await pool.query('SELECT id FROM departments WHERE manager_email = ?', [oldCeoEmail]);
        if (cleDepts.length === 0 && mgrDepts.length === 0) {
          await pool.query(
            "UPDATE employees SET role = 'employee' WHERE email = ? AND role = 'ceo'",
            [oldCeoEmail]
          );
        } else if (mgrDepts.length > 0) {
          await pool.query(
            "UPDATE employees SET role = 'manager' WHERE email = ? AND role = 'ceo'",
            [oldCeoEmail]
          );
        }
      }
    }

    const changedKeys = Object.keys(updates).filter(k => allowed.includes(k));
    const adminId = req.admin?.id || req.hr?.id || null;
    await logActivity(null, adminId, 'settings_updated', `Updated settings: ${changedKeys.join(', ')}`);

    const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    delete settings.smtp_pass;
    res.json(settings);
  } catch (err) {
    console.error('updateSettings error:', err);
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
}

async function testEmail(req, res) {
  const nodemailer = require('nodemailer');
  const { to } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Recipient email is required' });
  }

  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;

  if (!settings.smtp_host) {
    return res.status(400).json({ error: 'SMTP not configured' });
  }

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port) || 587,
    secure: parseInt(settings.smtp_port) === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  });

  try {
    await transporter.sendMail({
      from: settings.smtp_from || settings.smtp_user,
      to,
      subject: 'WorkTrack - Test Email',
      html: `
        <div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #22c55e;">Test Email</h2>
          <p>Your SMTP settings are working correctly.</p>
           <p style="color: #666;">This is a test email from the WorkTrack system.</p>
        </div>
      `,
    });
    const adminId = req.admin?.id || req.hr?.id || null;
    await logActivity(null, adminId, 'test_email_sent', `Test email sent to ${to}`);
    res.json({ message: `Test email sent to ${to}` });
  } catch (err) {
    console.error('SMTP test error:', err);
    res.status(400).json({ error: 'Failed to send test email. Check SMTP settings and try again.' });
  }
}

async function getPublicSettings(req, res) {
  const keys = ['logo_data', 'work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'service_wfh', 'service_office_attendance', 'service_leaves', 'service_recruitment', 'service_people', 'service_manager', 'allowed_email_domain'];
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${placeholders})`, keys);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
}

async function testMeeting(req, res) {
  const { provider } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider is required' });
  try {
    const { testGoogleConnection, testTeamsConnection } = require('../../shared/services/meeting.service');
    let link;
    if (provider === 'google') link = await testGoogleConnection();
    else if (provider === 'teams') link = await testTeamsConnection();
    else return res.status(400).json({ error: 'Invalid provider' });
    res.json({ message: `${provider} connection successful`, link });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Connection failed' });
  }
}

module.exports = { getSettings, updateSettings, testEmail, getPublicSettings, testMeeting };

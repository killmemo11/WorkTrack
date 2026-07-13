// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const nodemailer = require('nodemailer');
const pool = require('../config/database');
const { decrypt } = require('../utils/encryption');

let platformTransporter = null;
let cachedConfigHash = '';
let cachedSettings = null;
let settingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 60 * 1000;

async function loadPlatformSmtpSettings() {
  const now = Date.now();
  if (cachedSettings && now - settingsCacheTime < SETTINGS_CACHE_TTL) {
    return cachedSettings;
  }
  try {
    const [rows] = await pool.query(
      "SELECT `key`, `value` FROM platform_settings WHERE `key` IN ('smtp_host','smtp_port','smtp_user','smtp_pass','smtp_from','company_name')"
    );
    const map = {};
    rows.forEach(r => { map[r.key] = r.value; });
    cachedSettings = map;
    settingsCacheTime = now;
    return map;
  } catch {
    return {};
  }
}

async function getPlatformTransporter() {
  const dbSettings = await loadPlatformSmtpSettings();

  const config = {
    host: dbSettings.smtp_host || process.env.PLATFORM_SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(dbSettings.smtp_port || process.env.PLATFORM_SMTP_PORT) || 587,
    secure: parseInt(dbSettings.smtp_port || process.env.PLATFORM_SMTP_PORT) === 465,
    auth: {
      user: dbSettings.smtp_user || process.env.PLATFORM_SMTP_USER,
      pass: dbSettings.smtp_pass ? decrypt(dbSettings.smtp_pass) : process.env.PLATFORM_SMTP_PASS,
    },
  };

  const fromEmail = dbSettings.smtp_from || process.env.PLATFORM_SMTP_FROM || '';
  const companyName = dbSettings.company_name || 'WorkTrack';
  const fromAddress = fromEmail || config.auth.user;
  const fromField = fromAddress ? `${companyName} <${fromAddress}>` : `${companyName} Platform`;

  const hash = JSON.stringify(config);
  if (platformTransporter && cachedConfigHash === hash) {
    return { transporter: platformTransporter, from: fromField };
  }

  if (!config.auth.user || !config.auth.pass) {
    console.warn('⚠️ Platform SMTP not configured - platform emails will not be sent');
    return null;
  }

  platformTransporter = nodemailer.createTransport(config);
  cachedConfigHash = hash;

  try {
    await platformTransporter.verify();
    console.log('✅ Platform SMTP connection verified');
  } catch (err) {
    console.error('❌ Platform SMTP verification failed:', err.message);
    platformTransporter = null;
    return null;
  }

  return { transporter: platformTransporter, from: fromField };
}

function platformMailLayout(contentHtml, title = 'WorkTrack Platform') {
  const year = new Date().getFullYear();
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <div style="display: inline-flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 8px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #22c55e;">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <span style="color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">{{companyName}}</span>
        </div>
        <p style="color: #94a3b8; margin: 12px 0 0; font-size: 14px;">Platform Administration</p>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 32px 24px; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 22px; font-weight: 600;">${title}</h2>
        <div style="color: #475569; line-height: 1.7; font-size: 15px;">
          ${contentHtml}
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          &copy; ${year} {{companyName}} — HR Management Platform<br />
          This is an automated message from the {{companyName}} platform administration system.
        </p>
      </div>
    </div>
  `;
}

async function sendPlatformEmail(to, subject, htmlContent) {
  const result = await getPlatformTransporter();
  if (!result) {
    console.warn(`⚠️ Platform email not sent to ${to} (SMTP not configured): ${subject}`);
    return { success: false, reason: 'SMTP not configured' };
  }

  const { transporter, from: fromAddress } = result;
  const dbSettings = await loadPlatformSmtpSettings();
  const companyName = dbSettings.company_name || 'WorkTrack';

  try {
    const html = platformMailLayout(htmlContent, subject).replace(/\{\{companyName\}\}/g, companyName);
    const info = await transporter.sendMail({
      from: fromAddress || `${companyName} Platform`,
      to,
      subject,
      html,
    });
    console.log(`✅ Platform email sent to ${to}: ${subject} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send platform email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

// Magic link for tenant admin first login
async function sendTenantAdminMagicLink(email, username, tenantName, magicLink) {
  const html = `
    <p>Welcome to <strong>${tenantName}</strong> on WorkTrack!</p>
    <p>Your admin account <strong>${username}</strong> has been created. Click the button below to set your password and access your dashboard:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(34,197,94,0.4);">
        Set Password & Enter Dashboard
      </a>
    </div>
    <p style="color: #64748b; font-size: 14px;">This link expires in <strong>24 hours</strong> and can only be used once.</p>
    <p style="color: #64748b; font-size: 14px;">If you didn't request this, please contact WorkTrack support.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="color: #94a3af; font-size: 12px;">Link: ${magicLink}</p>
  `;

  return sendPlatformEmail(email, `Welcome to ${tenantName} — Set Your Password`, html);
}

// Tenant request notification to platform admin
async function sendTenantRequestNotification(adminEmail, request) {
  const html = `
    <p>A new tenant signup request has been received:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 500;">Company:</td><td style="padding: 8px 0; color: #1e293b;"><strong>${request.company_name}</strong></td></tr>
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 500;">Contact Email:</td><td style="padding: 8px 0; color: #1e293b;">${request.contact_email}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 500;">Phone:</td><td style="padding: 8px 0; color: #1e293b;">${request.contact_phone || '—'}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 500;">Employees:</td><td style="padding: 8px 0; color: #1e293b;">${request.employee_count}</td></tr>
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 500;">Message:</td><td style="padding: 8px 0; color: #1e293b;">${request.message || '—'}</td></tr>
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.FRONTEND_URL || 'https://worktrack.ddns.net'}/platform/tenants" style="display: inline-block; background: #1e293b; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Review in Platform Admin
      </a>
    </div>
  `;

  return sendPlatformEmail(adminEmail, `New Tenant Request: ${request.company_name}`, html);
}

// Tenant request approved notification
async function sendTenantApprovedEmail(email, tenantName, adminUsername, loginUrl) {
  const html = `
    <p>Great news! Your tenant request for <strong>${tenantName}</strong> has been <span style="color: #22c55e; font-weight: 600;">approved</span>.</p>
    <p>An admin account has been created for you:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px 0; color: #64748b; font-weight: 500;">Username:</td><td style="padding: 8px 0; color: #1e293b;"><strong>${adminUsername}</strong></td></tr>
    </table>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Set Password & Login
      </a>
    </div>
    <p style="color: #64748b; font-size: 14px;">This link expires in 24 hours.</p>
  `;

  return sendPlatformEmail(email, `Your WorkTrack Tenant "${tenantName}" is Ready!`, html);
}

// Tenant request rejected notification
async function sendTenantRejectedEmail(email, tenantName, reason) {
  const html = `
    <p>Thank you for your interest in WorkTrack.</p>
    <p>After review, we're unable to approve your tenant request for <strong>${tenantName}</strong> at this time.</p>
    ${reason ? `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #dc2626; margin: 0;"><strong>Reason:</strong> ${reason}</p>
      </div>
    ` : ''}
    <p>If you have questions, please reply to this email or contact our support team.</p>
  `;

  return sendPlatformEmail(email, `Update on Your WorkTrack Request: ${tenantName}`, html);
}

// Platform admin alert (system issues, etc.)
async function sendPlatformAlert(subject, message) {
  const adminEmail = process.env.PLATFORM_ADMIN_ALERT_EMAIL || process.env.PLATFORM_SMTP_USER;
  if (!adminEmail) return { success: false, reason: 'No alert email configured' };

  const html = `
    <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <p style="color: #92400e; margin: 0;"><strong>⚠️ Platform Alert</strong></p>
    </div>
    <p>${message}</p>
    <p style="color: #64748b; font-size: 14px;">Time: ${new Date().toISOString()}</p>
  `;

  return sendPlatformEmail(adminEmail, `[WorkTrack Platform] ${subject}`, html);
}

module.exports = {
  loadPlatformSmtpSettings,
  getPlatformTransporter,
  sendPlatformEmail,
  sendTenantAdminMagicLink,
  sendTenantRequestNotification,
  sendTenantApprovedEmail,
  sendTenantRejectedEmail,
  sendPlatformAlert,
  platformMailLayout,
};
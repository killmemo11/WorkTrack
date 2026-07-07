// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const nodemailer = require('nodemailer');
const pool = require('../config/database');

let transporterCache = null;
let cachedSettingsHash = '';

async function getTransporter() {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;

  if (!settings.smtp_host) return null;

  const hash = JSON.stringify({ host: settings.smtp_host, port: settings.smtp_port, user: settings.smtp_user, pass: settings.smtp_pass });
  if (transporterCache && cachedSettingsHash === hash) return transporterCache;

  transporterCache = nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port) || 587,
    secure: parseInt(settings.smtp_port) === 465,
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  });
  cachedSettingsHash = hash;
  return transporterCache;
}

async function getFromAddress() {
  const [rows] = await pool.query("SELECT `key`, `value` FROM settings WHERE `key` IN ('smtp_from', 'smtp_user')");
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings.smtp_from || settings.smtp_user || 'WorkTrack <noreply@wfh.local>';
}

function mailLayout(contentHtml) {
  const year = new Date().getFullYear();
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 16px 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <span style="color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">WorkTrack</span>
      </div>
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 10px 10px;">
        ${contentHtml}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 0.75rem; text-align: center; margin: 0;">
          &copy; ${year} WorkTrack &mdash; HR Management Platform
        </p>
      </div>
    </div>
  `;
}

async function sendSignInEmail(employee, record) {
  const transporter = await getTransporter();
  if (!transporter) return;

  const from = await getFromAddress();
  const hours = new Date(record.sign_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  await transporter.sendMail({
    from,
    to: employee.email,
    subject: `WorkTrack Sign-In: ${employee.name}`,
    html: mailLayout(`
      <div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #22c55e;">Sign-In Confirmed</h2>
        <p><strong>${employee.name}</strong></p>
        <p>You have signed in for ${record.type === 'office' ? 'office' : 'work from home'} today.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #666;">Date</td><td style="padding: 8px;"><strong>${record.date}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Sign-In Time</td><td style="padding: 8px;"><strong>${hours}</strong></td></tr>
        </table>
      </div>
    `),
  });
}

async function sendSignOutEmail(employee, record) {
  const transporter = await getTransporter();
  if (!transporter) return;

  const from = await getFromAddress();
  const signIn = new Date(record.sign_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const signOut = new Date(record.sign_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const diffMs = new Date(record.sign_out_time) - new Date(record.sign_in_time);
  const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(1);

  await transporter.sendMail({
    from,
    to: employee.email,
    subject: `WorkTrack Sign-Out: ${employee.name} (${totalHours}h)`,
    html: mailLayout(`
      <div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #ef4444;">Sign-Out Confirmed</h2>
        <p><strong>${employee.name}</strong></p>
        <p>Your ${record.type === 'office' ? 'office' : 'work from home'} session has ended.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px; color: #666;">Date</td><td style="padding: 8px;"><strong>${record.date}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Sign-In</td><td style="padding: 8px;"><strong>${signIn}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Sign-Out</td><td style="padding: 8px;"><strong>${signOut}</strong></td></tr>
          <tr><td style="padding: 8px; color: #666;">Total Hours</td><td style="padding: 8px;"><strong>${totalHours}h</strong></td></tr>
        </table>
        ${record.notes ? `<p style="color: #666; margin-top: 12px;">Notes: ${record.notes}</p>` : ''}
      </div>
    `),
  });
}

async function sendVerificationEmail(employee, code) {
  const transporter = await getTransporter();
  if (!transporter) return;

  const from = await getFromAddress();

  await transporter.sendMail({
    from,
    to: employee.email,
    subject: `Verify your WorkTrack account`,
    html: mailLayout(`
      <div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #4f46e5;">Email Verification</h2>
        <p>Welcome <strong>${employee.name}</strong>,</p>
        <p>Use the code below to verify your email address:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; background: #f0f0ff; padding: 12px 24px; border-radius: 8px;">${code}</span>
        </div>
        <p style="color: #666;">This code expires in 10 minutes.</p>
      </div>
    `),
  });
}

async function sendPasswordResetEmail(employee, code) {
  const transporter = await getTransporter();
  if (!transporter) return;

  const from = await getFromAddress();

  await transporter.sendMail({
    from,
    to: employee.email,
    subject: 'Reset your WorkTrack password',
    html: mailLayout(`
      <div style="font-family: Arial; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #f59e0b;">Password Reset</h2>
        <p>Hello <strong>${employee.name}</strong>,</p>
        <p>Use the code below to reset your password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #f59e0b; background: #fffbeb; padding: 12px 24px; border-radius: 8px;">${code}</span>
        </div>
        <p style="color: #666;">This code expires in 10 minutes.</p>
        <p style="color: #666;">If you did not request this, please ignore this email.</p>
      </div>
    `),
  });
}

async function sendLeaveConfirmationEmail(employee, leave) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  await transporter.sendMail({
    from, to: employee.email,
    subject: `WorkTrack - Leave Submitted (${leave.type})`,
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#4f46e5;">Leave Request Submitted</h2>
        <p>Hi <strong>${employee.name}</strong>,</p>
        <p>Your leave request has been submitted successfully and is pending approval.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#666;">Type</td><td style="padding:6px;"><strong>${leave.type}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">From</td><td style="padding:6px;"><strong>${leave.start_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">To</td><td style="padding:6px;"><strong>${leave.end_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Days</td><td style="padding:6px;"><strong>${leave.days_count}</strong></td></tr>
        </table>
        <p style="color:#666;font-size:0.85rem;">You will be notified once a decision is made.</p>
      </div>`),
  });
}

async function sendManagerLeaveNotificationEmail(manager, employee, leave) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  await transporter.sendMail({
    from, to: manager.email,
    subject: `WorkTrack - Leave Request: ${employee.name} (${leave.type})`,
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#f59e0b;">Leave Request Requires Your Approval</h2>
        <p><strong>${employee.name}</strong> has submitted a ${leave.type} leave request.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#666;">Employee</td><td style="padding:6px;"><strong>${employee.name}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Type</td><td style="padding:6px;"><strong>${leave.type}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">From</td><td style="padding:6px;"><strong>${leave.start_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">To</td><td style="padding:6px;"><strong>${leave.end_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Days</td><td style="padding:6px;"><strong>${leave.days_count}</strong></td></tr>
          ${leave.reason ? `<tr><td style="padding:6px;color:#666;">Reason</td><td style="padding:6px;"><strong>${leave.reason}</strong></td></tr>` : ''}
        </table>
        <p style="margin-top:16px;">
          <a href="${frontendUrl}/manager/approvals" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
            View & Approve
          </a>
        </p>
        <p style="color:#666;font-size:0.85rem;">Log in to review and make a decision.</p>
      </div>`),
  });
}

async function sendLeaveApprovedEmail(employee, leave) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  await transporter.sendMail({
    from, to: employee.email,
    subject: `WorkTrack - Leave Approved (${leave.type})`,
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#22c55e;">Leave Approved</h2>
        <p>Hi <strong>${employee.name}</strong>,</p>
        <p>Your ${leave.type} leave has been approved.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#666;">From</td><td style="padding:6px;"><strong>${leave.start_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">To</td><td style="padding:6px;"><strong>${leave.end_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Days</td><td style="padding:6px;"><strong>${leave.days_count}</strong></td></tr>
        </table>
        <p style="color:#666;font-size:0.85rem;">Enjoy your time off!</p>
      </div>`),
  });
}

async function sendLeaveRejectedEmail(employee, leave, reason) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  await transporter.sendMail({
    from, to: employee.email,
    subject: `WorkTrack - Leave Rejected (${leave.type})`,
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#ef4444;">Leave Request Rejected</h2>
        <p>Hi <strong>${employee.name}</strong>,</p>
        <p>Your ${leave.type} leave request has been rejected.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#666;">From</td><td style="padding:6px;"><strong>${leave.start_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">To</td><td style="padding:6px;"><strong>${leave.end_date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Days</td><td style="padding:6px;"><strong>${leave.days_count}</strong></td></tr>
        </table>
        ${reason ? `<p style="color:#666;font-size:0.85rem;">Reason: ${reason}</p>` : ''}
        <p style="color:#666;font-size:0.85rem;">Please contact your manager or HR if you have questions.</p>
      </div>`),
  });
}

async function sendMissingSignOutReminderEmail(employee, records) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn(`[Email] SMTP not configured — cannot send missing sign-out reminder to ${employee.email}`);
    return;
  }
  const from = await getFromAddress();
  const fmtDate = (d) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };
  const dateStr = records.map((r) => fmtDate(r.date)).join(', ');
  await transporter.sendMail({
    from, to: employee.email,
    subject: 'WorkTrack - Missing Sign-Out Detected',
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#f59e0b;">Missing Sign-Out Detected</h2>
        <p>Hi <strong>${employee.name}</strong>,</p>
        <p>You forgot to sign out on the following day(s): <strong>${dateStr}</strong>.</p>
        <p>Please visit the <strong>Missing Sign Out</strong> page to complete your records.</p>
        <p style="margin-top:16px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/missing-signout" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
            Complete Sign Out
          </a>
        </p>
        <p style="color:#666;font-size:0.85rem;">If you already submitted a request, please wait for approval.</p>
      </div>`),
  });
}

async function sendSignOutRequestPendingEmail(approver, employee, request) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  await transporter.sendMail({
    from, to: approver.email,
    subject: `WorkTrack - Sign-Out Request: ${employee.name}`,
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#f59e0b;">Manual Sign-Out Request Requires Approval</h2>
        <p><strong>${employee.name}</strong> has submitted a manual sign-out request.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px;color:#666;">Employee</td><td style="padding:6px;"><strong>${employee.name}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Date</td><td style="padding:6px;"><strong>${request.date}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Sign In</td><td style="padding:6px;"><strong>${request.signInTime}</strong></td></tr>
          <tr><td style="padding:6px;color:#666;">Requested Sign Out</td><td style="padding:6px;"><strong>${request.signOutTime}</strong></td></tr>
          ${request.notes ? `<tr><td style="padding:6px;color:#666;">Notes</td><td style="padding:6px;"><strong>${request.notes}</strong></td></tr>` : ''}
        </table>
        <p style="margin-top:16px;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/manager/approvals" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
            Review Request
          </a>
        </p>
      </div>`),
  });
}

async function sendSignOutRequestApprovedEmail(employee, request) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  await transporter.sendMail({
    from, to: employee.email,
    subject: 'WorkTrack - Sign-Out Request Approved',
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#22c55e;">Sign-Out Request Approved</h2>
        <p>Hi <strong>${employee.name}</strong>,</p>
        <p>Your manual sign-out request for <strong>${request.date}</strong> at <strong>${request.signOutTime}</strong> has been approved.</p>
        <p style="color:#666;font-size:0.85rem;">Your attendance record has been updated.</p>
      </div>`),
  });
}

async function sendSignOutRequestRejectedEmail(employee, request, reason) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  await transporter.sendMail({
    from, to: employee.email,
    subject: 'WorkTrack - Sign-Out Request Rejected',
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#ef4444;">Sign-Out Request Rejected</h2>
        <p>Hi <strong>${employee.name}</strong>,</p>
        <p>Your manual sign-out request for <strong>${request.date}</strong> has been rejected.</p>
        ${reason ? `<p style="color:#666;">Reason: ${reason}</p>` : ''}
        <p style="color:#666;font-size:0.85rem;">Please contact your manager or HR if you have questions.</p>
      </div>`),
  });
}

async function sendResignationNotification(approverEmail, employee, request) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  await transporter.sendMail({
    from, to: approverEmail,
    subject: `WorkTrack - Resignation Request from ${employee.name}`,
    html: mailLayout(`
      <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#f59e0b;">Resignation Request</h2>
        <p><strong>${employee.name}</strong> (${employee.email}) has submitted a resignation request.</p>
        <p><strong>Resignation Date:</strong> ${request.resignation_date}</p>
        ${request.reason ? `<p><strong>Reason:</strong> ${request.reason}</p>` : ''}
        <p style="color:#666;font-size:0.85rem;">Please review and respond in the system.</p>
      </div>`),
  });
}

async function sendEmail(to, subject, html, attachments) {
  const transporter = await getTransporter();
  if (!transporter) return;
  const from = await getFromAddress();
  const mail = { from, to, subject, html };
  if (attachments) mail.attachments = attachments;
  await transporter.sendMail(mail);
}

async function sendInterviewInvitation(candidateEmail, candidateName, interview) {
  const ical = require('ical-generator').default;
  const cal = ical({ name: 'Interview Invitation' });
  cal.createEvent({
    start: new Date(interview.interview_date),
    end: new Date(new Date(interview.interview_date).getTime() + (interview.duration || 60) * 60000),
    summary: `Interview — ${interview.job_title || 'Job Interview'}`,
    description: interview.notes || '',
    location: interview.type === 'offline' && interview.location_name
      ? `${interview.location_name}, ${interview.location_address || ''}`
      : interview.meeting_link || '',
    organizer: { name: 'WorkTrack HR' },
  });
  const icsContent = cal.toString();

  let detailsHtml = '';
  if (interview.type === 'online' && interview.meeting_link) {
    detailsHtml += `<p><strong>Meeting Link:</strong> <a href="${interview.meeting_link}" style="color:#4f46e5;">${interview.meeting_link}</a></p>`;
  }
  if (interview.type === 'offline') {
    if (interview.location_name) detailsHtml += `<p><strong>Location:</strong> ${interview.location_name}</p>`;
    if (interview.location_address) detailsHtml += `<p><strong>Address:</strong> ${interview.location_address}</p>`;
    if (interview.dress_code) detailsHtml += `<p><strong>Dress Code:</strong> ${interview.dress_code}</p>`;
    if (interview.what_to_bring) detailsHtml += `<p><strong>Please bring:</strong> ${interview.what_to_bring}</p>`;
    if (interview.map_link) detailsHtml += `<p><a href="${interview.map_link}" style="color:#4f46e5;">📍 View on Google Maps</a></p>`;
  }
  if (interview.interviewer) detailsHtml += `<p><strong>Interviewer:</strong> ${interview.interviewer}</p>`;
  if (interview.notes) detailsHtml += `<p><strong>Notes:</strong> ${interview.notes}</p>`;

  await sendEmail(candidateEmail, `Interview Invitation — ${interview.job_title || 'Job Interview'}`, mailLayout(`
    <div style="font-family:Arial;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px;">
      <h2 style="color:#1e293b;margin-bottom:8px;">Interview Invitation</h2>
      <p>Dear <strong>${candidateName}</strong>,</p>
      <p>You have been invited for an interview.</p>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;">
        <p><strong>Date:</strong> ${new Date(interview.interview_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p><strong>Time:</strong> ${new Date(interview.interview_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${interview.duration || 60} min)</p>
        <p><strong>Type:</strong> ${interview.type === 'online' ? 'Online' : 'In Person'}</p>
        ${detailsHtml}
      </div>
      <p style="color:#6b7280;font-size:0.9rem;">Please confirm your attendance through the candidate portal.</p>
      <p style="margin-top:20px;text-align:center;">
        <a href="${process.env.PORTAL_URL || 'https://worktrack.ddns.net/careers/interviews'}" style="display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Go to Portal</a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
      <p style="color:#9ca3af;font-size:0.8rem;">An invitation has been attached to your calendar. WorkTrack</p>
    </div>
  `), [{ filename: 'interview.ics', content: icsContent, contentType: 'text/calendar' }]);
}

module.exports = { mailLayout, sendSignInEmail, sendSignOutEmail, sendVerificationEmail, sendPasswordResetEmail, sendLeaveConfirmationEmail, sendManagerLeaveNotificationEmail, sendLeaveApprovedEmail, sendLeaveRejectedEmail, sendMissingSignOutReminderEmail, sendSignOutRequestPendingEmail, sendSignOutRequestApprovedEmail, sendSignOutRequestRejectedEmail, sendResignationNotification, sendEmail, sendInterviewInvitation };

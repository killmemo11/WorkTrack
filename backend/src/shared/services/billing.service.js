// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const crypto = require('crypto');
const pool = require('../config/database');
const logger = require('../utils/logger');
const { escapeHtml } = require('../utils/sanitize');
const { sendPlatformEmail } = require('./platform-email.service');
const { isFeatureEnabled } = require('./feature-flags.service');

const REMINDER_INTERVAL_DAYS = 3;
const CYCLES = ['monthly', 'yearly'];

class BillingError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function invoiceNumber() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `WT-${ym}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function toDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function periodBounds(cycle, periodStart) {
  const start = periodStart ? new Date(periodStart) : new Date();
  if (Number.isNaN(start.getTime())) throw new BillingError(400, 'Invalid period_start');
  const first = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const end = cycle === 'yearly'
    ? new Date(Date.UTC(first.getUTCFullYear() + 1, first.getUTCMonth(), 0))
    : new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return { start: toDateOnly(first), end: toDateOnly(end) };
}

async function loadTenantBilling(tenantId) {
  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.contact_email, t.plan, t.status, t.is_sandbox, t.plan_price_version_id,
            v.price_monthly, v.price_yearly, v.currency
     FROM tenants t
     LEFT JOIN plan_price_versions v ON v.id = t.plan_price_version_id
     WHERE t.id = ? AND t.deleted_at IS NULL`,
    [tenantId]
  );
  return rows[0] || null;
}

function resolveAmount(tenant, cycle) {
  if (!tenant.plan_price_version_id) {
    throw new BillingError(400, 'Tenant has no pinned price version; set a subscription first');
  }
  const amount = cycle === 'yearly' ? tenant.price_yearly : tenant.price_monthly;
  return { amount: Number(amount || 0), currency: tenant.currency || 'USD' };
}

async function createInvoice({ tenantId, cycle = 'monthly', periodStart, dueDate, notes, adminId, recordPayment = false }) {
  if (!CYCLES.includes(cycle)) throw new BillingError(400, `cycle must be one of: ${CYCLES.join(', ')}`);

  const tenant = await loadTenantBilling(tenantId);
  if (!tenant) throw new BillingError(404, 'Tenant not found');
  if (tenant.is_sandbox) throw new BillingError(400, 'Sandbox tenants are never billed');

  const { amount, currency } = resolveAmount(tenant, cycle);
  const period = periodBounds(cycle, periodStart);
  const due = toDateOnly(dueDate) || period.end;

  const [result] = await pool.query(
    `INSERT INTO tenant_invoices
       (tenant_id, invoice_number, period_start, period_end, amount, currency, status, due_date, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    [tenant.id, invoiceNumber(), period.start, period.end, amount, currency, due, notes || null, adminId || null]
  );

  await pool.query(
    "INSERT INTO tenant_invoice_events (invoice_id, type, notes, admin_id) VALUES (?, 'created', ?, ?)",
    [result.insertId, `Invoice for ${period.start} to ${period.end}`, adminId || null]
  );

  if (recordPayment) {
    await pool.query(
      "UPDATE tenant_invoices SET status = 'paid', paid_at = NOW(), payment_method = 'manual', reference = ? WHERE id = ?",
      [notes || 'Recorded manually', result.insertId]
    );
  }

  const [rows] = await pool.query('SELECT * FROM tenant_invoices WHERE id = ?', [result.insertId]);
  return { ...rows[0], tenant: { id: tenant.id, name: tenant.name, contact_email: tenant.contact_email } };
}

async function logInvoiceEvent(invoiceId, type, notes, adminId) {
  await pool.query(
    'INSERT INTO tenant_invoice_events (invoice_id, type, notes, admin_id) VALUES (?, ?, ?, ?)',
    [invoiceId, type, notes || null, adminId || null]
  );
}

function invoiceEmailHtml(invoice, tenant, kind) {
  const intro = kind === 'reminder'
    ? `<p>This is a reminder that invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> is due.</p>`
    : `<p>Please find your invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> below.</p>`;
  return `
    ${intro}
    <table style="width:100%;border-collapse:collapse;margin-top:12px;">
      <tr><td style="padding:6px 0;color:#64748b;">Workspace</td><td style="text-align:right;">${escapeHtml(tenant.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Period</td><td style="text-align:right;">${invoice.period_start} → ${invoice.period_end}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;">Due date</td><td style="text-align:right;">${invoice.due_date}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b;font-weight:700;">Amount</td><td style="text-align:right;font-weight:700;">${invoice.amount} ${escapeHtml(invoice.currency)}</td></tr>
    </table>
    <p style="color:#64748b;font-size:13px;margin-top:16px;">Bank transfer is the current payment method. Reply to this email with your transfer reference.</p>`;
}

async function sendInvoiceEmail(invoice, tenant, kind, adminId) {
  if (!tenant.contact_email) return { sent: false, reason: 'missing_contact_email' };
  await sendPlatformEmail(
    tenant.contact_email,
    kind === 'reminder'
      ? `Payment reminder: invoice ${invoice.invoice_number} (${invoice.amount} ${invoice.currency})`
      : `Invoice ${invoice.invoice_number} for ${tenant.name}`,
    invoiceEmailHtml(invoice, tenant, kind)
  );
  if (kind === 'reminder') {
    await pool.query(
      'UPDATE tenant_invoices SET last_reminder_at = NOW(), reminder_count = reminder_count + 1 WHERE id = ?',
      [invoice.id]
    );
    await logInvoiceEvent(invoice.id, 'reminder', 'Reminder emailed to the tenant owner', adminId);
  } else {
    await logInvoiceEvent(invoice.id, 'sent', 'Invoice emailed to the tenant owner', adminId);
  }
  return { sent: true };
}

async function sendInvoice(invoiceId, adminId) {
  const [rows] = await pool.query(
    `SELECT i.*, t.name AS tenant_name, t.contact_email, t.is_sandbox
     FROM tenant_invoices i JOIN tenants t ON t.id = i.tenant_id
     WHERE i.id = ?`,
    [invoiceId]
  );
  if (rows.length === 0) throw new BillingError(404, 'Invoice not found');
  const invoice = rows[0];
  if (invoice.status === 'paid' || invoice.status === 'void') {
    throw new BillingError(409, `Invoice is already ${invoice.status}`);
  }

  const tenant = { name: invoice.tenant_name, contact_email: invoice.contact_email };
  const delivery = invoice.is_sandbox ? { sent: false, reason: 'sandbox' } : await sendInvoiceEmail(invoice, tenant, 'invoice', adminId);

  await pool.query(
    "UPDATE tenant_invoices SET status = 'sent', sent_at = COALESCE(sent_at, NOW()) WHERE id = ?",
    [invoiceId]
  );
  return delivery;
}

async function sendReminder(invoiceId, adminId, { force = false } = {}) {
  const [rows] = await pool.query(
    `SELECT i.*, t.name AS tenant_name, t.contact_email, t.is_sandbox
     FROM tenant_invoices i JOIN tenants t ON t.id = i.tenant_id
     WHERE i.id = ?`,
    [invoiceId]
  );
  if (rows.length === 0) throw new BillingError(404, 'Invoice not found');
  const invoice = rows[0];
  if (!['sent', 'draft'].includes(invoice.status)) {
    throw new BillingError(409, `Cannot remind for a ${invoice.status} invoice`);
  }
  if (invoice.is_sandbox) return { sent: false, reason: 'sandbox' };
  if (!force && !(await isFeatureEnabled(invoice.tenant_id, 'billing.reminders', true))) {
    return { sent: false, reason: 'feature_disabled' };
  }

  const tenant = { name: invoice.tenant_name, contact_email: invoice.contact_email };
  return sendInvoiceEmail(invoice, tenant, 'reminder', adminId);
}

async function markPaid(invoiceId, { paymentMethod, reference, notes, adminId }) {
  const [rows] = await pool.query('SELECT * FROM tenant_invoices WHERE id = ?', [invoiceId]);
  if (rows.length === 0) throw new BillingError(404, 'Invoice not found');
  if (rows[0].status === 'void') throw new BillingError(409, 'A void invoice cannot be paid');

  await pool.query(
    `UPDATE tenant_invoices
     SET status = 'paid', paid_at = NOW(), payment_method = ?, reference = ?
     WHERE id = ?`,
    [paymentMethod || 'bank_transfer', reference || null, invoiceId]
  );
  await logInvoiceEvent(invoiceId, 'paid', notes || reference || 'Payment recorded', adminId);
  const [updated] = await pool.query('SELECT * FROM tenant_invoices WHERE id = ?', [invoiceId]);
  return updated[0];
}

async function voidInvoice(invoiceId, adminId, notes) {
  const [rows] = await pool.query('SELECT * FROM tenant_invoices WHERE id = ?', [invoiceId]);
  if (rows.length === 0) throw new BillingError(404, 'Invoice not found');
  if (rows[0].status === 'paid') throw new BillingError(409, 'A paid invoice cannot be voided');

  await pool.query("UPDATE tenant_invoices SET status = 'void' WHERE id = ?", [invoiceId]);
  await logInvoiceEvent(invoiceId, 'void', notes || 'Invoice voided', adminId);
  return { id: Number(invoiceId), status: 'void' };
}

async function reminderSweep() {
  const [due] = await pool.query(
    `SELECT i.id
     FROM tenant_invoices i
     JOIN tenants t ON t.id = i.tenant_id
     WHERE i.status = 'sent' AND i.due_date <= CURDATE()
       AND t.is_sandbox = 0 AND t.deleted_at IS NULL
       AND t.contact_email IS NOT NULL
       AND (i.last_reminder_at IS NULL OR i.last_reminder_at < DATE_SUB(NOW(), INTERVAL ? DAY))`,
    [REMINDER_INTERVAL_DAYS]
  );

  let sent = 0;
  let skipped = 0;
  for (const row of due) {
    try {
      const result = await sendReminder(row.id, null);
      if (result.sent) sent += 1; else skipped += 1;
    } catch (err) {
      skipped += 1;
      logger.error(`[Billing] Reminder failed for invoice ${row.id}:`, err.message);
    }
  }
  return { candidates: due.length, sent, skipped };
}

async function generateMonthlyInvoices() {
  const [tenants] = await pool.query(
    `SELECT t.id
     FROM tenants t
     JOIN plan_price_versions v ON v.id = t.plan_price_version_id
     WHERE t.status = 'active' AND t.plan <> 'trial' AND t.is_sandbox = 0 AND t.deleted_at IS NULL`
  );

  const period = periodBounds('monthly');
  let created = 0;
  for (const tenant of tenants) {
    const [existing] = await pool.query(
      'SELECT id FROM tenant_invoices WHERE tenant_id = ? AND period_start = ?',
      [tenant.id, period.start]
    );
    if (existing.length > 0) continue;
    try {
      await createInvoice({ tenantId: tenant.id, cycle: 'monthly', periodStart: period.start });
      created += 1;
    } catch (err) {
      logger.error(`[Billing] Invoice generation failed for tenant ${tenant.id}:`, err.message);
    }
  }
  return { period, created };
}

module.exports = {
  BillingError,
  CYCLES,
  createInvoice,
  sendInvoice,
  sendReminder,
  markPaid,
  voidInvoice,
  reminderSweep,
  generateMonthlyInvoices,
  periodBounds,
  resolveAmount,
};

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const billing = require('../../shared/services/billing.service');

function fail(res, err) {
  const status = err.statusCode || 500;
  return res.status(status).json({ error: status === 500 ? 'Billing operation failed' : err.message });
}

async function listInvoices(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
  const offset = (page - 1) * limit;

  const where = ['t.deleted_at IS NULL', 't.is_sandbox = 0'];
  const params = [];
  if (req.query.status && ['draft', 'sent', 'paid', 'void'].includes(req.query.status)) {
    where.push('i.status = ?');
    params.push(req.query.status);
  }
  if (req.query.tenant_id) {
    where.push('i.tenant_id = ?');
    params.push(req.query.tenant_id);
  }
  if (req.query.q) {
    where.push('(i.invoice_number LIKE ? OR t.name LIKE ?)');
    params.push(`%${req.query.q}%`, `%${req.query.q}%`);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(
    `SELECT i.*, t.name AS tenant_name, t.slug AS tenant_slug,
            CASE WHEN i.status = 'sent' AND i.due_date < CURDATE() THEN 1 ELSE 0 END AS is_overdue
     FROM tenant_invoices i
     JOIN tenants t ON t.id = i.tenant_id
     ${whereSql}
     ORDER BY i.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[count]] = await pool.query(
    `SELECT COUNT(*) AS total FROM tenant_invoices i JOIN tenants t ON t.id = i.tenant_id ${whereSql}`,
    params
  );

  res.json({ invoices: rows, total: count.total, page, totalPages: Math.max(1, Math.ceil(count.total / limit)) });
}

async function getInvoice(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT i.*, t.name AS tenant_name, t.slug AS tenant_slug, t.contact_email
     FROM tenant_invoices i JOIN tenants t ON t.id = i.tenant_id
     WHERE i.id = ? AND t.is_sandbox = 0`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
  const [events] = await pool.query(
    'SELECT * FROM tenant_invoice_events WHERE invoice_id = ? ORDER BY id DESC',
    [id]
  );
  res.json({ ...rows[0], events });
}

async function createInvoice(req, res) {
  const { tenant_id, cycle, period_start, due_date, notes, record_payment } = req.body || {};
  if (!tenant_id) return res.status(400).json({ error: 'tenant_id is required' });

  try {
    const invoice = await billing.createInvoice({
      tenantId: tenant_id,
      cycle: cycle || 'monthly',
      periodStart: period_start,
      dueDate: due_date,
      notes,
      adminId: req.platformAdmin.id,
      recordPayment: !!record_payment,
    });
    await logActivity(
      null,
      req.platformAdmin.id,
      'invoice_created',
      `Created invoice ${invoice.invoice_number} for tenant ${tenant_id} (${invoice.amount} ${invoice.currency})`,
      { tenant_id: Number(tenant_id) }
    );
    res.status(201).json(invoice);
  } catch (err) {
    return fail(res, err);
  }
}

async function sendInvoice(req, res) {
  try {
    const delivery = await billing.sendInvoice(req.params.id, req.platformAdmin.id);
    res.json({ message: 'Invoice marked as sent', delivery });
  } catch (err) {
    return fail(res, err);
  }
}

async function remindInvoice(req, res) {
  try {
    const delivery = await billing.sendReminder(req.params.id, req.platformAdmin.id, { force: !!req.body?.force });
    res.json({ message: delivery.sent ? 'Reminder sent' : 'Reminder skipped', delivery });
  } catch (err) {
    return fail(res, err);
  }
}

async function markInvoicePaid(req, res) {
  try {
    const invoice = await billing.markPaid(req.params.id, {
      paymentMethod: req.body?.payment_method,
      reference: req.body?.reference,
      notes: req.body?.notes,
      adminId: req.platformAdmin.id,
    });
    await logActivity(
      null,
      req.platformAdmin.id,
      'invoice_paid',
      `Invoice ${invoice.invoice_number} marked paid (${invoice.amount} ${invoice.currency})`,
      { tenant_id: invoice.tenant_id }
    );
    res.json(invoice);
  } catch (err) {
    return fail(res, err);
  }
}

async function voidInvoice(req, res) {
  try {
    const result = await billing.voidInvoice(req.params.id, req.platformAdmin.id, req.body?.notes);
    res.json(result);
  } catch (err) {
    return fail(res, err);
  }
}

async function getBillingSummary(req, res) {
  const [[totals]] = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN i.status = 'sent' THEN i.amount ELSE 0 END), 0) AS outstanding,
       SUM(CASE WHEN i.status = 'sent' THEN 1 ELSE 0 END) AS open_invoices,
       SUM(CASE WHEN i.status = 'sent' AND i.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_invoices,
       COALESCE(SUM(CASE WHEN i.status = 'sent' AND i.due_date < CURDATE() THEN i.amount ELSE 0 END), 0) AS overdue_amount,
       COALESCE(SUM(CASE WHEN i.status = 'paid' AND i.paid_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN i.amount ELSE 0 END), 0) AS paid_30_days
     FROM tenant_invoices i
     JOIN tenants t ON t.id = i.tenant_id
     WHERE t.deleted_at IS NULL AND t.is_sandbox = 0`
  );

  const [byCurrency] = await pool.query(
    `SELECT i.currency, COALESCE(SUM(i.amount), 0) AS amount, COUNT(*) AS invoices
     FROM tenant_invoices i JOIN tenants t ON t.id = i.tenant_id
     WHERE i.status = 'sent' AND t.deleted_at IS NULL AND t.is_sandbox = 0
     GROUP BY i.currency`
  );

  const [gateway] = await pool.query(
    "SELECT default_enabled FROM feature_flags WHERE flag_key = 'billing.online_gateway'"
  );

  res.json({
    ...totals,
    by_currency: byCurrency,
    online_gateway: gateway[0] ? gateway[0].default_enabled === 1 : false,
  });
}

module.exports = {
  listInvoices,
  getInvoice,
  createInvoice,
  sendInvoice,
  remindInvoice,
  markInvoicePaid,
  voidInvoice,
  getBillingSummary,
};

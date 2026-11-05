// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useEffect, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import platformApi from '../../../shared/api/platformApi';
import { usePlatformAuth } from '../../../shared/context/PlatformAuthContext';
import { formatDate as formatDateCairo } from '../../../shared/utils/date';

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'info' },
  paid: { label: 'Paid', color: 'success' },
  void: { label: 'Void', color: 'error' },
};

export default function PlatformBilling() {
  const { platformAdmin } = usePlatformAuth();
  const roles = platformAdmin?.roles || [];
  const permissions = platformAdmin?.permissions || [];
  const canManage = roles.includes('owner') || permissions.includes('platform.billing.manage');

  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ tenant_id: '', cycle: 'monthly', period_start: '', due_date: '', notes: '' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, invoicesRes] = await Promise.all([
        platformApi.get('/billing/summary'),
        platformApi.get('/billing/invoices', { params: { limit: 50, status: statusFilter || undefined } }),
      ]);
      setSummary(summaryRes.data);
      setInvoices(invoicesRes.data.invoices || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    platformApi.get('/tenants', { params: { limit: 100 } })
      .then((res) => setTenants((res.data.tenants || []).filter((tenant) => !tenant.is_sandbox)))
      .catch(() => {});
  }, [statusFilter]);

  const createInvoice = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await platformApi.post('/billing/invoices', {
        tenant_id: Number(form.tenant_id),
        cycle: form.cycle,
        period_start: form.period_start || undefined,
        due_date: form.due_date || undefined,
        notes: form.notes || undefined,
      });
      setForm({ tenant_id: '', cycle: 'monthly', period_start: '', due_date: '', notes: '' });
      setMessage('Draft invoice created.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create invoice');
    } finally {
      setBusy(false);
    }
  };

  const act = async (invoice, action) => {
    setError('');
    setMessage('');
    try {
      if (action === 'send') await platformApi.post(`/billing/invoices/${invoice.id}/send`);
      if (action === 'remind') {
        const res = await platformApi.post(`/billing/invoices/${invoice.id}/remind`);
        setMessage(res.data.delivery?.sent ? 'Reminder sent.' : `Reminder skipped (${res.data.delivery?.reason}).`);
        load();
        return;
      }
      if (action === 'paid') {
        const reference = prompt('Payment reference (optional):') || '';
        await platformApi.post(`/billing/invoices/${invoice.id}/paid`, { reference });
      }
      if (action === 'void') {
        if (!confirm(`Void invoice ${invoice.invoice_number}?`)) return;
        await platformApi.post(`/billing/invoices/${invoice.id}/void`);
      }
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Action failed');
    }
  };

  const money = (amount, currency) => `${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency || ''}`;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Billing</h1>
          <p>Invoices, payment records and renewal reminders</p>
        </div>
        {summary && !summary.online_gateway && (
          <span className="glass-badge glass-badge-default" title="Enable the billing.online_gateway feature flag to add card payments">
            Online gateway: off
          </span>
        )}
      </div>

      {error && <div className="glass-alert glass-alert-error">{error}</div>}
      {message && <div className="glass-alert glass-alert-success">{message}</div>}

      {summary && (
        <div className="platform-stats-grid" style={{ marginBottom: 20 }}>
          <div className="platform-stat-card">
            <span className="platform-stat-label">Outstanding</span>
            <strong className="platform-stat-value">
              {summary.by_currency?.length
                ? summary.by_currency.map((row) => money(row.amount, row.currency)).join(' + ')
                : '—'}
            </strong>
          </div>
          <div className="platform-stat-card">
            <span className="platform-stat-label">Open invoices</span>
            <strong className="platform-stat-value">{summary.open_invoices || 0}</strong>
          </div>
          <div className="platform-stat-card">
            <span className="platform-stat-label">Overdue</span>
            <strong className="platform-stat-value">{summary.overdue_invoices || 0}</strong>
          </div>
          <div className="platform-stat-card">
            <span className="platform-stat-label">Paid (30 days)</span>
            <strong className="platform-stat-value">{money(summary.paid_30_days, '')}</strong>
          </div>
        </div>
      )}

      {canManage && (
        <div className="glass-card">
          <h2>New invoice</h2>
          <p style={{ opacity: 0.7 }}>Amount is taken from the tenant's pinned price version.</p>
          <form onSubmit={createInvoice} className="platform-plans-form-grid-4" style={{ marginTop: 12 }}>
            <div className="glass-input-group">
              <label>Tenant</label>
              <select className="glass-input" value={form.tenant_id} required
                onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
                <option value="">Select tenant...</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            </div>
            <div className="glass-input-group">
              <label>Cycle</label>
              <select className="glass-input" value={form.cycle}
                onChange={(e) => setForm({ ...form, cycle: e.target.value })}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="glass-input-group">
              <label>Period start</label>
              <input className="glass-input" type="date" value={form.period_start}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </div>
            <div className="glass-input-group">
              <label>Due date</label>
              <input className="glass-input" type="date" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="glass-input-group" style={{ gridColumn: 'span 3' }}>
              <label>Notes</label>
              <input className="glass-input" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="glass-input-group" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" className="glass-btn glass-btn-primary" disabled={busy}>
                <Icon icon="lucide:receipt" /> {busy ? 'Creating...' : 'Create draft'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card" style={{ marginTop: 20 }}>
        <div className="platform-filters">
          <h2>Invoices</h2>
          <select className="glass-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </div>

        {loading ? (
          <div className="glass-loading"><div className="spinner" /></div>
        ) : invoices.length === 0 ? (
          <div className="platform-empty-state">
            <Icon icon="lucide:receipt" size={48} />
            <h3>No invoices</h3>
          </div>
        ) : (
          <div className="platform-table-wrapper">
            <table className="platform-table">
              <thead>
                <tr><th>Invoice</th><th>Tenant</th><th>Period</th><th>Amount</th><th>Due</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const status = STATUS_CONFIG[invoice.status] || { label: invoice.status, color: 'default' };
                  return (
                    <tr key={invoice.id}>
                      <td>{invoice.invoice_number}</td>
                      <td>{invoice.tenant_name}</td>
                      <td>{formatDateCairo(invoice.period_start)} → {formatDateCairo(invoice.period_end)}</td>
                      <td>{money(invoice.amount, invoice.currency)}</td>
                      <td>{formatDateCairo(invoice.due_date)}</td>
                      <td>
                        <span className={`glass-badge glass-badge-${invoice.is_overdue ? 'error' : status.color}`}>
                          {invoice.is_overdue ? 'Overdue' : status.label}
                        </span>
                      </td>
                      <td>
                        <div className="platform-table-actions">
                          {canManage && invoice.status === 'draft' && (
                            <button className="glass-btn glass-btn-sm glass-btn-ghost" title="Send" onClick={() => act(invoice, 'send')}>
                              <Icon icon="lucide:send" />
                            </button>
                          )}
                          {canManage && ['draft', 'sent'].includes(invoice.status) && (
                            <button className="glass-btn glass-btn-sm glass-btn-ghost" title="Send reminder" onClick={() => act(invoice, 'remind')}>
                              <Icon icon="lucide:bell" />
                            </button>
                          )}
                          {canManage && invoice.status === 'sent' && (
                            <button className="glass-btn glass-btn-sm glass-btn-success" title="Mark paid" onClick={() => act(invoice, 'paid')}>
                              <Icon icon="lucide:check" />
                            </button>
                          )}
                          {canManage && invoice.status !== 'paid' && invoice.status !== 'void' && (
                            <button className="glass-btn glass-btn-sm glass-btn-error" title="Void" onClick={() => act(invoice, 'void')}>
                              <Icon icon="lucide:ban" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

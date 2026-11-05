// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useEffect, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import platformApi from '../../../shared/api/platformApi';
import { formatDateTime } from '../../../shared/utils/date';

export default function PlatformSandbox() {
  const [sandboxes, setSandboxes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', admin_email: '', from_tenant_id: '' });
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get('/sandboxes');
      setSandboxes(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sandboxes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    platformApi.get('/tenants', { params: { limit: 100 } })
      .then((res) => setTenants((res.data.tenants || []).filter((tenant) => !tenant.is_sandbox)))
      .catch(() => {});
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    setCreated(null);
    try {
      const res = await platformApi.post('/sandboxes', {
        name: form.name,
        admin_email: form.admin_email,
        from_tenant_id: form.from_tenant_id || null,
      });
      setCreated(res.data);
      setForm({ name: '', admin_email: '', from_tenant_id: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sandbox');
    } finally {
      setBusy(false);
    }
  };

  const reset = async (sandbox) => {
    if (!confirm(`Reset sandbox "${sandbox.name}"? Attendance, leave requests, notifications and activity are cleared.`)) return;
    try {
      const res = await platformApi.post(`/sandboxes/${sandbox.id}/reset`);
      setMessage(`Sandbox reset — ${res.data.deleted_rows} row(s) cleared.`);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    }
  };

  const remove = async (sandbox) => {
    if (!confirm(`Delete sandbox "${sandbox.name}"?`)) return;
    try {
      await platformApi.delete(`/sandboxes/${sandbox.id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Developer Sandboxes</h1>
          <p>Full workspaces for testing that never send email and are never billed</p>
        </div>
      </div>

      {error && <div className="glass-alert glass-alert-error">{error}</div>}
      {message && <div className="glass-alert glass-alert-success">{message}</div>}

      {created && (
        <div className="glass-alert glass-alert-warning">
          <strong>Sandbox created.</strong> Store this password now — it is shown only once.
          <div style={{ marginTop: 8, fontFamily: 'monospace' }}>
            {created.admin.username} / {created.initial_password}
          </div>
        </div>
      )}

      <div className="glass-card">
        <h2>New sandbox</h2>
        <form onSubmit={create} className="platform-plans-form-grid-3" style={{ marginTop: 12 }}>
          <div className="glass-input-group">
            <label>Name</label>
            <input className="glass-input" value={form.name} required placeholder="e.g. QA workspace"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="glass-input-group">
            <label>Admin email</label>
            <input className="glass-input" type="email" value={form.admin_email} required placeholder="qa@example.com"
              onChange={(e) => setForm({ ...form, admin_email: e.target.value })} />
          </div>
          <div className="glass-input-group">
            <label>Copy config from (optional)</label>
            <select className="glass-input" value={form.from_tenant_id}
              onChange={(e) => setForm({ ...form, from_tenant_id: e.target.value })}>
              <option value="">Empty sandbox</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>
          <div className="glass-input-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="glass-btn glass-btn-primary" disabled={busy}>
              <Icon icon="lucide:flask-conical" /> {busy ? 'Creating...' : 'Create sandbox'}
            </button>
          </div>
        </form>
      </div>

      <div className="glass-card" style={{ marginTop: 20 }}>
        {loading ? (
          <div className="glass-loading"><div className="spinner" /></div>
        ) : sandboxes.length === 0 ? (
          <div className="platform-empty-state">
            <Icon icon="lucide:flask-conical" size={48} />
            <h3>No sandboxes yet</h3>
          </div>
        ) : (
          <div className="platform-table-wrapper">
            <table className="platform-table">
              <thead>
                <tr><th>Sandbox</th><th>Source</th><th>Employees</th><th>Status</th><th>Created</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {sandboxes.map((sandbox) => (
                  <tr key={sandbox.id}>
                    <td>
                      <div className="platform-table-tenant">
                        <strong>{sandbox.name}</strong>
                        <span className="tenant-slug">{sandbox.slug}</span>
                      </div>
                    </td>
                    <td>{sandbox.source_name || '—'}</td>
                    <td>{sandbox.employee_count}</td>
                    <td><span className="glass-badge glass-badge-success">{sandbox.status}</span></td>
                    <td>{formatDateTime(sandbox.created_at)}</td>
                    <td>
                      <div className="platform-table-actions">
                        <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => reset(sandbox)}>
                          <Icon icon="lucide:rotate-ccw" /> Reset
                        </button>
                        <button className="glass-btn glass-btn-sm glass-btn-error" onClick={() => remove(sandbox)}>
                          <Icon icon="lucide:trash-2" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

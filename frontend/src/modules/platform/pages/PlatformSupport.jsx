// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';
import platformApi from '../../../shared/api/platformApi';
import { usePlatformAuth } from '../../../shared/context/PlatformAuthContext';
import { formatDateTime } from '../../../shared/utils/date';

export default function PlatformSupport() {
  const navigate = useNavigate();
  const { platformAdmin } = usePlatformAuth();
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const roles = platformAdmin?.roles || [];
  const permissions = platformAdmin?.permissions || [];
  const canImpersonate = roles.includes('owner') || permissions.includes('platform.support.impersonate');
  const canRemediate = roles.includes('owner') || permissions.includes('platform.support.remediate');

  const loadTenants = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get('/tenants', { params: { limit: 100, search: search || undefined } });
      setTenants(res.data.tenants || []);
    } catch {
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTenants(); }, []);

  const openDiagnostics = async (id) => {
    setSelectedId(id);
    setDiagnostics(null);
    setError('');
    setMessage('');
    setDiagLoading(true);
    try {
      const res = await platformApi.get(`/tenants/${id}/diagnostics`);
      setDiagnostics(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load diagnostics');
    } finally {
      setDiagLoading(false);
    }
  };

  const impersonate = async () => {
    if (!selectedId || !diagnostics) return;
    if (!confirm(`Open an audited impersonation session for "${diagnostics.tenant.name}"?`)) return;
    try {
      const res = await platformApi.post(`/tenants/${selectedId}/impersonate`);
      navigate(res.data.redirect || '/admin/settings');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start impersonation');
    }
  };

  const resendMagicLink = async (adminId) => {
    try {
      await platformApi.post(`/tenants/admins/${adminId}/resend-magic-link`);
      setMessage('Magic link sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend magic link');
    }
  };

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Technical Support</h1>
          <p>Diagnose a workspace and, when needed, open an audited impersonation session</p>
        </div>
      </div>

      {error && <div className="glass-alert glass-alert-error">{error}</div>}
      {message && <div className="glass-alert glass-alert-success">{message}</div>}

      <div className="glass-card">
        <div className="platform-filters">
          <div className="platform-search">
            <Icon icon="lucide:search" className="search-icon" />
            <input
              type="text"
              className="glass-input"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') loadTenants(); }}
            />
          </div>
          <button className="glass-btn glass-btn-sm" onClick={loadTenants}>
            <Icon icon="lucide:refresh-cw" /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="glass-loading"><div className="spinner" /></div>
        ) : (
          <div className="platform-table-wrapper">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className={selectedId === tenant.id ? 'selected' : ''}>
                    <td>
                      <div className="platform-table-tenant">
                        <strong>{tenant.name}</strong>
                        <span className="tenant-slug">{tenant.slug}</span>
                      </div>
                    </td>
                    <td>{tenant.plan}</td>
                    <td>
                      <span className={`glass-badge glass-badge-${tenant.status === 'active' ? 'success' : 'warning'}`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td>{tenant.created_at ? formatDateTime(tenant.created_at) : '—'}</td>
                    <td>
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => openDiagnostics(tenant.id)}>
                        <Icon icon="lucide:stethoscope" /> Diagnose
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {diagLoading && <div className="glass-loading"><div className="spinner" /><span>Running diagnostics...</span></div>}

      {diagnostics && !diagLoading && (
        <div className="glass-card" style={{ marginTop: 20 }}>
          <div className="platform-page-header" style={{ marginBottom: 12 }}>
            <div>
              <h2>{diagnostics.tenant.name}</h2>
              <p>{diagnostics.tenant.slug} · {diagnostics.tenant.plan_name || diagnostics.tenant.plan} · {diagnostics.tenant.status}</p>
            </div>
            {canImpersonate && (
              <button className="glass-btn glass-btn-primary" onClick={impersonate}>
                <Icon icon="lucide:user-round-cog" /> Impersonate
              </button>
            )}
          </div>

          {diagnostics.warnings.length > 0 && (
            <div className="glass-alert glass-alert-warning" style={{ marginBottom: 16 }}>
              <strong>Warnings</strong>
              <ul style={{ margin: '8px 0 0 18px' }}>
                {diagnostics.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
              </ul>
            </div>
          )}

          <div className="platform-stats-grid" style={{ marginBottom: 20 }}>
            {[
              ['Employees', `${diagnostics.counts.active_employees} / ${diagnostics.counts.employees}`],
              ['Departments', diagnostics.counts.departments],
              ['Pending leaves', diagnostics.counts.pending_leaves],
              ['Sign-ins today', diagnostics.counts.signins_today],
              ['Published policies', diagnostics.counts.published_policies],
              ['Max employees', diagnostics.tenant.max_employees],
            ].map(([label, value]) => (
              <div key={label} className="platform-stat-card">
                <span className="platform-stat-label">{label}</span>
                <strong className="platform-stat-value">{value}</strong>
              </div>
            ))}
          </div>

          <h3>Subscription</h3>
          {diagnostics.subscription ? (
            <p>
              {diagnostics.tenant.plan_name || diagnostics.tenant.plan} · version {diagnostics.subscription.price_version} ·{' '}
              {diagnostics.subscription.price_monthly} {diagnostics.subscription.currency}/mo ·{' '}
              {diagnostics.subscription.price_yearly} {diagnostics.subscription.currency}/yr
            </p>
          ) : (
            <p className="glass-alert glass-alert-warning">No pinned price version.</p>
          )}

          <h3 style={{ marginTop: 20 }}>Admins</h3>
          <div className="platform-table-wrapper">
            <table className="platform-table">
              <thead>
                <tr><th>Username</th><th>Email</th><th>Status</th><th>Password change</th><th /></tr>
              </thead>
              <tbody>
                {diagnostics.admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.username}</td>
                    <td>{admin.email || '—'}</td>
                    <td>
                      <span className={`glass-badge glass-badge-${admin.is_active ? 'success' : 'error'}`}>
                        {admin.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{admin.must_change_password ? 'Required' : 'Done'}</td>
                    <td>
                      {canRemediate && (
                        <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => resendMagicLink(admin.id)}>
                          <Icon icon="lucide:mail" /> Send magic link
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: 20 }}>Services</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {diagnostics.services.length === 0 && <span>No service overrides</span>}
            {diagnostics.services.map((service) => (
              <span key={service.service_key} className={`glass-badge glass-badge-${service.is_enabled ? 'success' : 'default'}`}>
                {service.service_key}
              </span>
            ))}
          </div>

          <h3 style={{ marginTop: 20 }}>Recent activity</h3>
          {diagnostics.recent_activity.length === 0 ? (
            <p>No activity recorded.</p>
          ) : (
            <ul className="platform-activity-list">
              {diagnostics.recent_activity.map((item) => (
                <li key={item.id}>
                  <strong>{item.action}</strong>
                  <span>{item.description}</span>
                  <time>{formatDateTime(item.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

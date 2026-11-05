// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useEffect, useState } from 'react';
import Icon from '../../../shared/components/Icon';
import platformApi from '../../../shared/api/platformApi';
import { usePlatformAuth } from '../../../shared/context/PlatformAuthContext';

const CHANNELS = [
  { value: 'stable', label: 'Stable' },
  { value: 'beta', label: 'Beta' },
  { value: 'canary', label: 'Canary' },
];

const emptyFlag = { flag_key: '', label: '', module: 'general', default_enabled: false };

export default function PlatformReleases() {
  const { platformAdmin } = usePlatformAuth();
  const roles = platformAdmin?.roles || [];
  const permissions = platformAdmin?.permissions || [];
  const canManage = roles.includes('owner') || permissions.includes('platform.releases.manage');

  const [data, setData] = useState({ flags: [], channels: {} });
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');
  const [release, setRelease] = useState(null);
  const [draftChannel, setDraftChannel] = useState('stable');
  const [draftFlags, setDraftFlags] = useState({});
  const [flagForm, setFlagForm] = useState(emptyFlag);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadFlags = async () => {
    setLoading(true);
    try {
      const res = await platformApi.get('/releases/flags');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
    platformApi.get('/tenants', { params: { limit: 100 } })
      .then((res) => setTenants(res.data.tenants || []))
      .catch(() => {});
  }, []);

  const loadRelease = async (tenantId) => {
    setSelectedTenant(tenantId);
    setRelease(null);
    setDraftFlags({});
    if (!tenantId) return;
    try {
      const res = await platformApi.get(`/releases/tenants/${tenantId}`);
      setRelease(res.data);
      setDraftChannel(res.data.channel);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tenant release');
    }
  };

  const toggleDefault = async (flag) => {
    if (!canManage) return;
    try {
      await platformApi.put(`/releases/flags/${flag.flag_key}`, { default_enabled: !flag.default_enabled });
      loadFlags();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update flag');
    }
  };

  const createFlag = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await platformApi.post('/releases/flags', flagForm);
      setFlagForm(emptyFlag);
      setShowFlagForm(false);
      loadFlags();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create flag');
    }
  };

  const setFlagValue = (key, value) => {
    setDraftFlags((prev) => ({ ...prev, [key]: value }));
  };

  const saveRelease = async () => {
    if (!selectedTenant) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await platformApi.put(`/releases/tenants/${selectedTenant}`, {
        release_channel: draftChannel,
        flags: draftFlags,
      });
      setRelease(res.data);
      setDraftFlags({});
      setMessage('Release settings saved. Tenant sessions pick them up within a minute.');
      loadFlags();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save release settings');
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = Object.keys(draftFlags).length;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Release Channels</h1>
          <p>Move tenants between stable, beta and canary, and override feature flags per tenant</p>
        </div>
      </div>

      {error && <div className="glass-alert glass-alert-error">{error}</div>}
      {message && <div className="glass-alert glass-alert-success">{message}</div>}

      <div className="platform-stats-grid" style={{ marginBottom: 20 }}>
        {CHANNELS.map((channel) => (
          <div key={channel.value} className="platform-stat-card">
            <span className="platform-stat-label">{channel.label}</span>
            <strong className="platform-stat-value">{data.channels?.[channel.value] || 0}</strong>
          </div>
        ))}
        <div className="platform-stat-card">
          <span className="platform-stat-label">Flags</span>
          <strong className="platform-stat-value">{data.flags.length}</strong>
        </div>
      </div>

      <div className="glass-card">
        <div className="platform-page-header" style={{ marginBottom: 12 }}>
          <div>
            <h2>Feature flags</h2>
            <p>Defaults apply to every tenant unless an override exists</p>
          </div>
          {canManage && (
            <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => setShowFlagForm((v) => !v)}>
              <Icon icon="lucide:plus" /> New flag
            </button>
          )}
        </div>

        {showFlagForm && canManage && (
          <form onSubmit={createFlag} className="platform-plans-form-grid-4" style={{ marginBottom: 16 }}>
            <div className="glass-input-group">
              <label>Key</label>
              <input className="glass-input" value={flagForm.flag_key} placeholder="billing.some_flag"
                onChange={(e) => setFlagForm({ ...flagForm, flag_key: e.target.value })} required />
            </div>
            <div className="glass-input-group">
              <label>Label</label>
              <input className="glass-input" value={flagForm.label}
                onChange={(e) => setFlagForm({ ...flagForm, label: e.target.value })} required />
            </div>
            <div className="glass-input-group">
              <label>Module</label>
              <input className="glass-input" value={flagForm.module}
                onChange={(e) => setFlagForm({ ...flagForm, module: e.target.value })} />
            </div>
            <div className="glass-input-group platform-plans-checkbox-group">
              <label className="platform-plans-checkbox-label">
                <input type="checkbox" checked={flagForm.default_enabled}
                  onChange={(e) => setFlagForm({ ...flagForm, default_enabled: e.target.checked })} />
                On by default
              </label>
              <button type="submit" className="glass-btn glass-btn-sm glass-btn-primary">Create</button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="glass-loading"><div className="spinner" /></div>
        ) : (
          <div className="platform-table-wrapper">
            <table className="platform-table">
              <thead>
                <tr>
                  <th>Flag</th>
                  <th>Module</th>
                  <th>Default</th>
                  <th>Overrides</th>
                  <th>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {data.flags.map((flag) => (
                  <tr key={flag.flag_key}>
                    <td>
                      <div className="platform-table-tenant">
                        <strong>{flag.label}</strong>
                        <span className="tenant-slug">{flag.flag_key}</span>
                      </div>
                    </td>
                    <td>{flag.module}</td>
                    <td>
                      <label className="platform-plans-checkbox-label">
                        <input type="checkbox" checked={flag.default_enabled === 1 || flag.default_enabled === true}
                          disabled={!canManage} onChange={() => toggleDefault(flag)} />
                        {flag.default_enabled === 1 || flag.default_enabled === true ? 'On' : 'Off'}
                      </label>
                    </td>
                    <td>{flag.override_count}</td>
                    <td>{flag.enabled_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-card" style={{ marginTop: 20 }}>
        <div className="platform-page-header" style={{ marginBottom: 12 }}>
          <div>
            <h2>Tenant channel</h2>
            <p>Pick a tenant to review its channel and flag overrides</p>
          </div>
          <select className="glass-select" value={selectedTenant} onChange={(e) => loadRelease(e.target.value)}>
            <option value="">Select tenant...</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        </div>

        {release && (
          <>
            <div className="platform-plans-form-grid-3">
              <div className="glass-input-group">
                <label>Release channel</label>
                <select className="glass-input" value={draftChannel} disabled={!canManage}
                  onChange={(e) => setDraftChannel(e.target.value)}>
                  {CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
                </select>
              </div>
              <div className="glass-input-group">
                <label>Plan</label>
                <input className="glass-input" value={release.tenant.slug} disabled />
              </div>
              <div className="glass-input-group" style={{ justifyContent: 'flex-end' }}>
                {canManage && (
                  <button className="glass-btn glass-btn-primary" disabled={saving} onClick={saveRelease}>
                    {saving ? 'Saving...' : `Save${pendingCount ? ` (${pendingCount} flag change${pendingCount > 1 ? 's' : ''})` : ''}`}
                  </button>
                )}
              </div>
            </div>

            <div className="platform-table-wrapper" style={{ marginTop: 12 }}>
              <table className="platform-table">
                <thead>
                  <tr><th>Flag</th><th>Effective</th><th>Override</th><th /></tr>
                </thead>
                <tbody>
                  {release.flags.map((flag) => {
                    const draft = draftFlags[flag.key];
                    const effective = draft === undefined ? flag.enabled : draft === true;
                    const override = draft === undefined ? flag.override : draft;
                    return (
                      <tr key={flag.key}>
                        <td>
                          <div className="platform-table-tenant">
                            <strong>{flag.label}</strong>
                            <span className="tenant-slug">{flag.key}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`glass-badge glass-badge-${effective ? 'success' : 'default'}`}>
                            {effective ? 'On' : 'Off'}
                          </span>
                        </td>
                        <td>
                          <label className="platform-plans-checkbox-label">
                            <input type="checkbox" checked={effective} disabled={!canManage}
                              onChange={(e) => setFlagValue(flag.key, e.target.checked)} />
                            {override === null ? 'Inherited' : 'Pinned'}
                          </label>
                        </td>
                        <td>
                          {canManage && override !== null && (
                            <button className="glass-btn glass-btn-sm glass-btn-ghost"
                              onClick={() => setFlagValue(flag.key, null)}>
                              Use default
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

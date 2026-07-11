// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

export default function PlatformSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('platformToken');

  useEffect(() => {
    fetch('/api/platform/settings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          settings: settings.map((s) => ({ key: s.key, value: s.value })),
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="glass-loading"><div className="spinner" /></div>;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Platform Settings</h1>
          <p style={{ color: '#71717a', fontSize: '0.85rem', margin: '4px 0 0' }}>
            Configure platform-wide settings that affect all tenants and the landing page
          </p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving}>
          <Icon icon="lucide:save" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="glass-alert glass-alert-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && (
        <div className="glass-alert glass-alert-success" style={{ marginBottom: 16 }}>
          <Icon icon="lucide:check-circle" /> Settings saved successfully
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* General Settings */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:settings" /> General
          </h3>
          {settings.filter(s => ['company_name', 'company_email', 'contact_email', 'contact_phone', 'default_currency'].includes(s.key)).map((s) => (
            <div key={s.key} className="glass-input-group" style={{ marginBottom: 12 }}>
              <label style={{ textTransform: 'capitalize' }}>{s.key.replace(/_/g, ' ')}</label>
              {s.key === 'default_currency' ? (
                <select value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input">
                  <option value="USD">USD ($)</option>
                  <option value="EGP">EGP (E£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              ) : (
                <input type="text" value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" />
              )}
              {s.description && <p style={{ fontSize: '0.72rem', color: '#52525b', margin: '4px 0 0' }}>{s.description}</p>}
            </div>
          ))}
        </div>

        {/* Trial Settings */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:clock" /> Trial Period
          </h3>
          {settings.filter(s => s.key === 'default_trial_days').map((s) => (
            <div key={s.key} className="glass-input-group" style={{ marginBottom: 12 }}>
              <label>Default Trial Days</label>
              <input type="number" min="0" value={s.value || '14'} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" />
              <p style={{ fontSize: '0.72rem', color: '#52525b', margin: '4px 0 0' }}>
                New tenants get this many free days before requiring a subscription
              </p>
            </div>
          ))}
        </div>

        {/* Landing Page Settings */}
        <div className="glass-card" style={{ padding: 24, gridColumn: 'span 2' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon icon="lucide:layout" /> Landing Page Content
          </h3>
          {settings.filter(s => s.key.startsWith('landing_')).map((s) => (
            <div key={s.key} className="glass-input-group" style={{ marginBottom: 12 }}>
              <label style={{ textTransform: 'capitalize' }}>{s.key.replace(/_/g, ' ')}</label>
              {s.key.includes('title') || s.key.includes('text') ? (
                <input type="text" value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" />
              ) : (
                <textarea value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" rows={3} style={{ resize: 'vertical' }} />
              )}
              {s.description && <p style={{ fontSize: '0.72rem', color: '#52525b', margin: '4px 0 0' }}>{s.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

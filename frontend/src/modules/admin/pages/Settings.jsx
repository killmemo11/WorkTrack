// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import adminApi from '../../../shared/api/adminApi';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('workweek');
  const [settings, setSettings] = useState({
    work_week_start: 'Sunday', work_week_end: 'Thursday',
    period_start_day: '15', period_end_day: '16',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [allowedDomain, setAllowedDomain] = useState('');

  useEffect(() => {
    adminApi.get('/settings').then((res) => {
      setSettings({
        work_week_start: res.data.work_week_start || 'Sunday',
        work_week_end: res.data.work_week_end || 'Thursday',
        period_start_day: res.data.period_start_day || '15',
        period_end_day: res.data.period_end_day || '16',
      });
      setAllowedDomain(res.data.allowed_email_domain || '');
    });
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (overrides = {}) => {
    setSaving(true);
    setMessage('');
    try {
      await adminApi.put('/settings', { ...settings, ...overrides });
      setMessage('Settings saved successfully');
    } catch (err) {
      setMessage('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Settings</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Configure system settings</p>
        </div>
      </div>

      {message && <div className={`glass-alert ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('error') ? 'glass-alert-danger' : 'glass-alert-success'}`} style={{whiteSpace:'pre-line'}}>{message}</div>}

      <div className="glass-tabs">
        <button className={`glass-tab ${activeTab === 'workweek' ? 'glass-tab-active' : ''}`} onClick={() => setActiveTab('workweek')}>
          <Icon icon="lucide:calendar" /> Work Week
        </button>
        <button className={`glass-tab ${activeTab === 'security' ? 'glass-tab-active' : ''}`} onClick={() => setActiveTab('security')}>
          <Icon icon="lucide:shield" /> Security
        </button>
      </div>

      <div className="settings-form">
        {activeTab === 'workweek' && (
          <>
            <div className="glass-card fade-in-up">
              <div className="glass-card-header"><h3>Work Week & Pay Period</h3></div>
              <div className="glass-card-body">
                <div className="settings-grid">
                  <label>
                    Work Week Start
                    <select className="glass-select" value={settings.work_week_start}
                      onChange={(e) => handleChange('work_week_start', e.target.value)} style={{width:'100%'}}>
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </label>
                  <label>
                    Work Week End
                    <select className="glass-select" value={settings.work_week_end}
                      onChange={(e) => handleChange('work_week_end', e.target.value)} style={{width:'100%'}}>
                      <option value="Sunday">Sunday</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                    </select>
                  </label>
                  <label>
                    Period Start Day
                    <input type="number" className="glass-input" value={settings.period_start_day}
                      onChange={(e) => handleChange('period_start_day', e.target.value)} min={1} max={31} style={{width:'100%'}} />
                  </label>
                  <label>
                    Period End Day
                    <input type="number" className="glass-input" value={settings.period_end_day}
                      onChange={(e) => handleChange('period_end_day', e.target.value)} min={1} max={31} style={{width:'100%'}} />
                  </label>
                </div>
                <div className="settings-actions">
                  <button className="glass-btn glass-btn-primary" onClick={() => handleSave()} disabled={saving}>
                    <Icon icon="lucide:save" /> {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <>
            <div className="glass-card fade-in-up">
              <div className="glass-card-header"><h3>Security Settings</h3></div>
              <div className="glass-card-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                  Restrict employee registration to a specific email domain. Only users with email addresses matching this domain will be able to create an account.
                </p>
                <div className="settings-grid" style={{ maxWidth: 400 }}>
                  <label>
                    Allowed Email Domain
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '1.2rem', color: 'var(--text-dim)' }}>@</span>
                      <input type="text" className="glass-input" value={allowedDomain}
                        onChange={(e) => setAllowedDomain(e.target.value)}
                        placeholder="e.g. company.com" style={{ width: '100%' }} />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', marginTop: 4 }}>
                      Leave empty to allow all email domains.
                    </p>
                  </label>
                </div>
                <div className="settings-actions">
                  <button className="glass-btn glass-btn-primary" onClick={async () => {
                    try {
                      await adminApi.put('/settings', { ...settings, allowed_email_domain: allowedDomain });
                      setMessage('Security settings saved');
                    } catch {
                      setMessage('Failed to save security settings');
                    }
                    setTimeout(() => setMessage(''), 3000);
                  }}><Icon icon="lucide:save" /> Save Security Settings</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

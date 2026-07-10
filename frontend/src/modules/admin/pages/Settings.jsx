// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import Icon from '../../../shared/components/Icon';
import adminApi from '../../../shared/api/adminApi';


function loadLeafletCss() {
  if (!document.querySelector('#leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
}

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('services');
  const [settings, setSettings] = useState({
    work_week_start: 'Sunday', work_week_end: 'Thursday',
    period_start_day: '15', period_end_day: '16',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const [services, setServices] = useState({
    service_wfh: '1', service_office_attendance: '1', service_leaves: '1',
    service_recruitment: '1', service_people: '1', service_manager: '1',
  });

  const [allowedDomain, setAllowedDomain] = useState('');

  useEffect(() => {
    adminApi.get('/settings').then((res) => {
      setSettings({
        work_week_start: res.data.work_week_start || 'Sunday',
        work_week_end: res.data.work_week_end || 'Thursday',
        period_start_day: res.data.period_start_day || '15',
        period_end_day: res.data.period_end_day || '16',
      });
      setServices({
        service_wfh: res.data.service_wfh || '1',
        service_office_attendance: res.data.service_office_attendance || '1',
        service_leaves: res.data.service_leaves || '1',
        service_recruitment: res.data.service_recruitment || '1',
        service_people: res.data.service_people || '1',
        service_manager: res.data.service_manager || '1',
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
        <button className={`glass-tab ${activeTab === 'services' ? 'glass-tab-active' : ''}`} onClick={() => setActiveTab('services')}>
          <Icon icon="lucide:layers" /> Services
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

        {activeTab === 'services' && (
          <>
            <div className="glass-card fade-in-up">
              <div className="glass-card-header"><h3>Service Toggles</h3></div>
              <div className="glass-card-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                  Enable or disable services by module. Disabled services will be hidden from users and blocked at the API level.
                </p>

                <div className="services-modules">
                  <div className="service-module-card glass-card fade-in-up">
                    <h3 className="service-module-title"><Icon icon="lucide:clock" /> Attendance</h3>
                    <div className="service-toggle-list">
                      <label className="service-toggle">
                        <input type="checkbox" checked={services.service_wfh === '1'}
                          onChange={(e) => setServices({ ...services, service_wfh: e.target.checked ? '1' : '0' })} />
                        <div>
                          <strong>WFH Sign-In</strong>
                          <p>Allow employees to sign in from home</p>
                        </div>
                      </label>
                      <label className="service-toggle">
                        <input type="checkbox" checked={services.service_office_attendance === '1'}
                          onChange={(e) => setServices({ ...services, service_office_attendance: e.target.checked ? '1' : '0' })} />
                        <div>
                          <strong>Office Attendance</strong>
                          <p>Allow Office sign-in / sign-out with GPS verification</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="service-module-card glass-card fade-in-up">
                    <h3 className="service-module-title"><Icon icon="lucide:umbrella" /> Leave</h3>
                    <div className="service-toggle-list">
                      <label className="service-toggle">
                        <input type="checkbox" checked={services.service_leaves === '1'}
                          onChange={(e) => setServices({ ...services, service_leaves: e.target.checked ? '1' : '0' })} />
                        <div>
                          <strong>Leave System</strong>
                          <p>Allow employees to submit and manage leave requests</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="service-module-card glass-card fade-in-up">
                    <h3 className="service-module-title"><Icon icon="lucide:target" /> Recruitment (ATS)</h3>
                    <div className="service-toggle-list">
                      <label className="service-toggle">
                        <input type="checkbox" checked={services.service_recruitment === '1'}
                          onChange={(e) => setServices({ ...services, service_recruitment: e.target.checked ? '1' : '0' })} />
                        <div>
                          <strong>Recruitment System</strong>
                          <p>Job postings, candidates, interviews, offers, and career portal</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="service-module-card glass-card fade-in-up">
                    <h3 className="service-module-title"><Icon icon="lucide:users" /> People Management</h3>
                    <div className="service-toggle-list">
                      <label className="service-toggle">
                        <input type="checkbox" checked={services.service_people === '1'}
                          onChange={(e) => setServices({ ...services, service_people: e.target.checked ? '1' : '0' })} />
                        <div>
                          <strong>HR People Module</strong>
                          <p>Employees, profiles, positions, documents, contracts, resignations, headcount</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="service-module-card glass-card fade-in-up">
                    <h3 className="service-module-title"><Icon icon="lucide:clipboard-list" /> Manager Tools</h3>
                    <div className="service-toggle-list">
                      <label className="service-toggle">
                        <input type="checkbox" checked={services.service_manager === '1'}
                          onChange={(e) => setServices({ ...services, service_manager: e.target.checked ? '1' : '0' })} />
                        <div>
                          <strong>Manager Dashboard</strong>
                          <p>Team view, approvals, sign-out requests, headcount requests</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="settings-actions" style={{ marginTop: 20 }}>
                  <button className="glass-btn glass-btn-primary" onClick={async () => {
                    try {
                      await adminApi.put('/settings', services);
                      setMessage('Services updated');
                    } catch (err) {
                      setMessage('Failed to update services: ' + (err.response?.data?.error || err.message));
                    }
                    setTimeout(() => setMessage(''), 3000);
                  }}><Icon icon="lucide:save" /> Save Service Settings</button>
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

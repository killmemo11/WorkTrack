// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState('smtp');
  const [settings, setSettings] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '',
    office_lat: '30.0444', office_lng: '31.2357', office_radius_meters: '200',
    work_week_start: 'Sunday', work_week_end: 'Thursday',
    period_start_day: '15', period_end_day: '16',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const initialized = useRef(false);

  const [services, setServices] = useState({
    service_wfh: '1', service_office_attendance: '1', service_leaves: '1',
    service_recruitment: '1', service_people: '1', service_manager: '1',
  });

  const [allowedDomain, setAllowedDomain] = useState('');
  const [meetingSettings, setMeetingSettings] = useState({
    meeting_google_service_email: '',
    meeting_google_private_key: '',
    meeting_teams_tenant_id: '',
    meeting_teams_client_id: '',
    meeting_teams_client_secret: '',
  });
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);

  useEffect(() => {
    adminApi.get('/settings').then((res) => {
      setSettings((prev) => ({ ...prev, ...res.data }));
      setServices({
        service_wfh: res.data.service_wfh || '1',
        service_office_attendance: res.data.service_office_attendance || '1',
        service_leaves: res.data.service_leaves || '1',
        service_recruitment: res.data.service_recruitment || '1',
        service_people: res.data.service_people || '1',
        service_manager: res.data.service_manager || '1',
      });
      setAllowedDomain(res.data.allowed_email_domain || '');
      setMeetingSettings({
        meeting_google_service_email: res.data.meeting_google_service_email || '',
        meeting_google_private_key: res.data.meeting_google_private_key || '',
        meeting_teams_tenant_id: res.data.meeting_teams_tenant_id || '',
        meeting_teams_client_id: res.data.meeting_teams_client_id || '',
        meeting_teams_client_secret: res.data.meeting_teams_client_secret || '',
      });
    });
  }, []);

  useEffect(() => {
    if (activeTab !== 'office') return;
    if (initialized.current || !mapRef.current) return;
    initialized.current = true;
    loadLeafletCss();

    loadLeaflet().then((L) => {
      const lat = parseFloat(settings.office_lat) || 30.0444;
      const lng = parseFloat(settings.office_lng) || 31.2357;
      const radius = parseInt(settings.office_radius_meters) || 200;

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setSettings((prev) => ({
          ...prev,
          office_lat: pos.lat.toFixed(6),
          office_lng: pos.lng.toFixed(6),
        }));
      });

      const circle = L.circle([lat, lng], {
        radius,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        setSettings((prev) => ({
          ...prev,
          office_lat: e.latlng.lat.toFixed(6),
          office_lng: e.latlng.lng.toFixed(6),
        }));
      });

      setTimeout(() => map.invalidateSize(), 100);

      mapInstance.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current = null;
        circleRef.current = null;
        initialized.current = false;
      }
    };
  }, [activeTab]);

  useEffect(() => {
    if (!markerRef.current || !circleRef.current) return;
    const lat = parseFloat(settings.office_lat) || 30.0444;
    const lng = parseFloat(settings.office_lng) || 31.2357;
    const radius = parseInt(settings.office_radius_meters) || 200;

    markerRef.current.setLatLng([lat, lng]);
    circleRef.current.setLatLng([lat, lng]);
    circleRef.current.setRadius(radius);
    mapInstance.current?.setView([lat, lng]);
  }, [settings.office_lat, settings.office_lng, settings.office_radius_meters]);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (overrides = {}) => {
    setSaving(true);
    setMessage('');
    try {
      await adminApi.put('/settings', { ...settings, ...overrides });
      if (overrides.logo_data === '') {
        setSettings((prev) => ({ ...prev, logo_data: '' }));
      }
      setMessage('Settings saved successfully');
    } catch (err) {
      setMessage('Failed to save settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) return;
    setMessage('');
    try {
      const res = await adminApi.post('/settings/test', { to: testEmail });
      setMessage(res.data.message);
      setTestEmail('');
    } catch (err) {
      setMessage('Failed to send test email: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="subtitle">Configure system settings</p>

      {message && <div className={`alert ${message.toLowerCase().includes('failed') || message.toLowerCase().includes('error') ? 'alert-error' : 'alert-success'}`} style={{whiteSpace:'pre-line'}}>{message}</div>}

      <div className="settings-tabs">
        <button className={`settings-tab ${activeTab === 'smtp' ? 'active' : ''}`} onClick={() => setActiveTab('smtp')}>
          SMTP Settings
        </button>
        <button className={`settings-tab ${activeTab === 'office' ? 'active' : ''}`} onClick={() => setActiveTab('office')}>
          Office Location
        </button>
        <button className={`settings-tab ${activeTab === 'branding' ? 'active' : ''}`} onClick={() => setActiveTab('branding')}>
          Branding
        </button>
        <button className={`settings-tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
          Services
        </button>
        <button className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          Security
        </button>
        <button className={`settings-tab ${activeTab === 'meeting' ? 'active' : ''}`} onClick={() => setActiveTab('meeting')}>
          Meeting Integrations
        </button>
      </div>

      <div className="settings-form">
        {activeTab === 'smtp' && (
          <>
            <div className="settings-section-title">SMTP Configuration</div>
            <div className="settings-grid">
              <label>
                SMTP Host
                <input type="text" className="form-control" value={settings.smtp_host} onChange={(e) => handleChange('smtp_host', e.target.value)} placeholder="smtp.gmail.com" style={{width:'100%'}} />
              </label>
              <label>
                SMTP Port
                <input type="text" className="form-control" value={settings.smtp_port} onChange={(e) => handleChange('smtp_port', e.target.value)} placeholder="587" style={{width:'100%'}} />
              </label>
              <label>
                SMTP User
                <input type="text" className="form-control" value={settings.smtp_user} onChange={(e) => handleChange('smtp_user', e.target.value)} placeholder="your-email@gmail.com" style={{width:'100%'}} />
              </label>
              <label>
                SMTP Password
                <input type="password" className="form-control" value={settings.smtp_pass} onChange={(e) => handleChange('smtp_pass', e.target.value)} placeholder="App password" style={{width:'100%'}} />
              </label>
            </div>
            <div className="settings-actions">
              <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <hr style={{ margin: '28px 0', border: 'none', borderTop: '1px solid #eee' }} />

            <div className="settings-section-title">Test Email</div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 12 }}>
              Send a test email to verify your SMTP settings are working.
            </p>
            <div className="dept-add-form">
              <label style={{ minWidth: 280 }}>
                <input
                  type="email" className="form-control" placeholder="Enter recipient email"
                  value={testEmail} onChange={(e) => setTestEmail(e.target.value)}
                  style={{ width: '100%' }}
                />
              </label>
              <button className="btn btn-outline" onClick={handleSendTest} disabled={!testEmail.trim()}>
                Send Test
              </button>
            </div>
          </>
        )}

        {activeTab === 'office' && (
          <>
            <div className="settings-section-title">Office Location (GPS Geofence)</div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
              Drag the marker or click on the map to set the office location. The orange circle shows the allowed area for Office sign-ins.
            </p>
            <div className="settings-grid">
              <label>
                Latitude
                <input type="text" className="form-control" value={settings.office_lat}
                  onChange={(e) => handleChange('office_lat', e.target.value)} style={{width:'100%'}} />
              </label>
              <label>
                Longitude
                <input type="text" className="form-control" value={settings.office_lng}
                  onChange={(e) => handleChange('office_lng', e.target.value)} style={{width:'100%'}} />
              </label>
              <label>
                Radius (meters)
                <input type="number" className="form-control" value={settings.office_radius_meters}
                  onChange={(e) => handleChange('office_radius_meters', e.target.value)}
                  min={10} max={5000} style={{width:'100%'}} />
              </label>
            </div>
            <div ref={mapRef} style={{ height: 450, borderRadius: 8, marginBottom: 16, border: '1px solid #ddd', zIndex: 0 }} />
            <div className="settings-actions">
              <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </>
        )}

        {activeTab === 'branding' && (
          <>
            <div className="settings-section-title">Branding</div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
              Upload your company logo. It will appear in the top navigation bar.
            </p>
            <div style={{ marginBottom: 20 }}>
              {settings.logo_data && (
                <div style={{ marginBottom: 12, padding: 16, background: '#f9f9f9', borderRadius: 8, border: '1px solid #eee', display: 'inline-block' }}>
                  <img src={settings.logo_data} alt="Current logo" style={{ maxHeight: 60, width: 'auto' }} />
                </div>
              )}
              <input type="file" accept="image/png,image/jpeg,image/gif,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setSettings((prev) => ({ ...prev, logo_data: ev.target.result }));
                  };
                  reader.readAsDataURL(file);
                }}
                style={{ display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: '0.8rem', color: '#999' }}>Recommended: PNG or SVG, max 200px height.</p>
            </div>
            <div className="settings-actions">
              <button className="btn btn-primary" onClick={() => handleSave()} disabled={saving}>
                {saving ? 'Saving...' : 'Save Logo'}
              </button>
              {settings.logo_data && (
                <button className="btn btn-outline" onClick={() => handleSave({ logo_data: '' })} style={{ marginLeft: 8 }}>
                  Remove Logo
                </button>
              )}
            </div>
          </>
        )}

        {activeTab === 'services' && (
          <>
            <div className="settings-section-title">Service Toggles</div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
              Enable or disable services by module. Disabled services will be hidden from users and blocked at the API level.
            </p>

            <div className="services-modules">
              {/* Attendance Module */}
              <div className="service-module-card">
                <h3 className="service-module-title">⏰ Attendance</h3>
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

              {/* Leave Module */}
              <div className="service-module-card">
                <h3 className="service-module-title">🏖️ Leave</h3>
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

              {/* Recruitment Module */}
              <div className="service-module-card">
                <h3 className="service-module-title">🎯 Recruitment (ATS)</h3>
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

              {/* People Management Module */}
              <div className="service-module-card">
                <h3 className="service-module-title">👥 People Management</h3>
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

              {/* Manager Tools Module */}
              <div className="service-module-card">
                <h3 className="service-module-title">📋 Manager Tools</h3>
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
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await adminApi.put('/settings', services);
                  setMessage('Services updated');
                } catch (err) {
                  setMessage('Failed to update services: ' + (err.response?.data?.error || err.message));
                }
                setTimeout(() => setMessage(''), 3000);
              }}>Save Service Settings</button>
            </div>
          </>
        )}

        {activeTab === 'security' && (
          <>
            <div className="settings-section-title">Security Settings</div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
              Restrict employee registration to a specific email domain. Only users with email addresses matching this domain will be able to create an account.
            </p>
            <div className="settings-grid" style={{ maxWidth: 400 }}>
              <label>
                Allowed Email Domain
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: '1.2rem', color: '#666' }}>@</span>
                  <input type="text" className="form-control" value={allowedDomain}
                    onChange={(e) => setAllowedDomain(e.target.value)}
                    placeholder="e.g. company.com" style={{ width: '100%' }} />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#999', marginTop: 4 }}>
                  Leave empty to allow all email domains.
                </p>
              </label>
            </div>
            <div className="settings-actions">
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await adminApi.put('/settings', { ...settings, allowed_email_domain: allowedDomain });
                  setMessage('Security settings saved');
                } catch {
                  setMessage('Failed to save security settings');
                }
                setTimeout(() => setMessage(''), 3000);
              }}>Save Security Settings</button>
            </div>

          </>
        )}

        {activeTab === 'meeting' && (
          <>
            <div className="settings-section-title">Meeting Integrations</div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
              Configure Google Meet and Microsoft Teams to automatically generate meeting links when scheduling interviews.
              After saving, use "Test Connection" to verify your credentials.
            </p>

            <div style={{ display: 'grid', gap: 24 }}>
              {/* Google Meet */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>🌐 Google Meet</h3>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 16 }}>
                  Requires a Google Cloud Service Account with Calendar API enabled and domain-wide delegation.
                </p>
                <div className="settings-grid">
                  <label style={{ gridColumn: '1 / -1' }}>
                    Service Account Email
                    <input type="text" className="form-control" value={meetingSettings.meeting_google_service_email}
                      onChange={e => setMeetingSettings({ ...meetingSettings, meeting_google_service_email: e.target.value })}
                      placeholder="service-account@project.iam.gserviceaccount.com" style={{ width: '100%' }} />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Private Key
                    <textarea className="form-control" value={meetingSettings.meeting_google_private_key}
                      onChange={e => setMeetingSettings({ ...meetingSettings, meeting_google_private_key: e.target.value })}
                      placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                      style={{ width: '100%', minHeight: 120, fontFamily: 'monospace', fontSize: '0.8rem' }} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-outline btn-sm" disabled={testingGoogle}
                    onClick={async () => {
                      setTestingGoogle(true); setMessage('');
                      try {
                        await adminApi.put('/settings', meetingSettings);
                        const res = await adminApi.post('/settings/test-meeting', { provider: 'google' });
                        setMessage('✅ Google Meet: ' + (res.data.message || 'Connected!'));
                      } catch (err) {
                        setMessage('❌ Google Meet: ' + (err.response?.data?.error || err.message));
                      }
                      setTestingGoogle(false);
                      setTimeout(() => setMessage(''), 5000);
                    }}>
                    {testingGoogle ? 'Testing...' : '🧪 Test Google Connection'}
                  </button>
                </div>
              </div>

              {/* Microsoft Teams */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>💼 Microsoft Teams</h3>
                <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 16 }}>
                  Requires an Azure AD app registration with <code>OnlineMeetings.ReadWrite.All</code> (Application permission) and a client secret.
                </p>
                <div className="settings-grid">
                  <label>
                    Tenant ID
                    <input type="text" className="form-control" value={meetingSettings.meeting_teams_tenant_id}
                      onChange={e => setMeetingSettings({ ...meetingSettings, meeting_teams_tenant_id: e.target.value })}
                      placeholder="00000000-0000-0000-0000-000000000000" style={{ width: '100%' }} />
                  </label>
                  <label>
                    Client ID
                    <input type="text" className="form-control" value={meetingSettings.meeting_teams_client_id}
                      onChange={e => setMeetingSettings({ ...meetingSettings, meeting_teams_client_id: e.target.value })}
                      placeholder="00000000-0000-0000-0000-000000000000" style={{ width: '100%' }} />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Client Secret
                    <input type="password" className="form-control" value={meetingSettings.meeting_teams_client_secret}
                      onChange={e => setMeetingSettings({ ...meetingSettings, meeting_teams_client_secret: e.target.value })}
                      placeholder="Enter client secret" style={{ width: '100%' }} />
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-outline btn-sm" disabled={testingTeams}
                    onClick={async () => {
                      setTestingTeams(true); setMessage('');
                      try {
                        await adminApi.put('/settings', meetingSettings);
                        const res = await adminApi.post('/settings/test-meeting', { provider: 'teams' });
                        setMessage('✅ Microsoft Teams: ' + (res.data.message || 'Connected!'));
                      } catch (err) {
                        setMessage('❌ Microsoft Teams: ' + (err.response?.data?.error || err.message));
                      }
                      setTestingTeams(false);
                      setTimeout(() => setMessage(''), 5000);
                    }}>
                    {testingTeams ? 'Testing...' : '🧪 Test Teams Connection'}
                  </button>
                </div>
              </div>
            </div>

            <div className="settings-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await adminApi.put('/settings', meetingSettings);
                  setMessage('Meeting settings saved');
                } catch {
                  setMessage('Failed to save settings');
                }
                setTimeout(() => setMessage(''), 3000);
              }}>Save Meeting Settings</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


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

export default function ITPortal({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'smtp');
  const [settings, setSettings] = useState({
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '',
    office_lat: '30.0444', office_lng: '31.2357', office_radius_meters: '200',
  });
  const [logoData, setLogoData] = useState('');
  const [meetingSettings, setMeetingSettings] = useState({
    meeting_google_service_email: '', meeting_google_private_key: '',
    meeting_teams_tenant_id: '', meeting_teams_client_id: '', meeting_teams_client_secret: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [logoInput, setLogoInput] = useState('');
  const [testingGoogle, setTestingGoogle] = useState(false);
  const [testingTeams, setTestingTeams] = useState(false);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    fetchSettings();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/it/settings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...prev,
          smtp_host: data.smtp_host || '', smtp_port: data.smtp_port || '587',
          smtp_user: data.smtp_user || '', smtp_pass: '',
          office_lat: data.office_lat || '30.0444', office_lng: data.office_lng || '31.2357',
          office_radius_meters: data.office_radius_meters || '200',
        }));
        setLogoData(data.logo_data || '');
        setMeetingSettings({
          meeting_google_service_email: data.meeting_google_service_email || '',
          meeting_google_private_key: '',
          meeting_teams_tenant_id: data.meeting_teams_tenant_id || '',
          meeting_teams_client_id: data.meeting_teams_client_id || '',
          meeting_teams_client_secret: '',
        });
      }
    } catch (err) { console.error('Failed to fetch IT settings:', err); }
  };

  const handleSave = async (section) => {
    setSaving(true); setMessage('');
    let payload = {};
    if (section === 'smtp') payload = { ...settings };
    else if (section === 'branding') payload = { logo_data: logoData };
    else if (section === 'meetings') payload = { ...meetingSettings };

    try {
      const res = await fetch('/api/it/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage(`${section === 'smtp' ? 'SMTP' : section === 'branding' ? 'Branding' : 'Meeting'} settings saved successfully`);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = await res.json();
        setMessage(err.error || 'Failed to save');
      }
    } catch (err) { setMessage('Network error'); }
    setSaving(false);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setLogoData(ev.target.result); };
    reader.readAsDataURL(file);
    setLogoInput(e.target.value);
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setSaving(true);
    try {
      const res = await fetch('/api/it/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json();
      setMessage(res.ok ? `Test email sent to ${testEmail}` : (data.error || 'Failed'));
    } catch { setMessage('Network error'); }
    setSaving(false);
  };

  const handleTestMeeting = async (provider) => {
    if (provider === 'google') setTestingGoogle(true); else setTestingTeams(true);
    try {
      const res = await fetch('/api/it/test-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setMessage(res.ok ? `${provider} connection successful` : (data.error || 'Failed'));
    } catch { setMessage('Network error'); }
    if (provider === 'google') setTestingGoogle(false); else setTestingTeams(false);
  };

  useEffect(() => {
    if (activeTab === 'geofence' && mapRef.current) {
      loadLeafletCss(); loadLeaflet().then((L) => {
        if (mapInstance.current) return;
        const lat = parseFloat(settings.office_lat) || 30.0444;
        const lng = parseFloat(settings.office_lng) || 31.2357;
        const radius = Math.min(parseInt(settings.office_radius_meters) || 200, 2000);
        mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance.current);
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstance.current);
        circleRef.current = L.circle([lat, lng], { radius, color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.1 }).addTo(mapInstance.current);

        markerRef.current.on('dragend', (e) => {
          const ll = e.target.getLatLng();
          setSettings(s => ({ ...s, office_lat: ll.lat.toFixed(6), office_lng: ll.lng.toFixed(6) }));
        });
        mapInstance.current.on('click', (e) => {
          const ll = e.latlng;
          setSettings(s => ({ ...s, office_lat: ll.lat.toFixed(6), office_lng: ll.lng.toFixed(6) }));
          markerRef.current.setLatLng(ll);
          circleRef.current.setLatLng(ll);
        });
      });
    }
  }, [activeTab]);

  useEffect(() => {
    if (mapInstance.current && circleRef.current) {
      const radius = Math.min(parseInt(settings.office_radius_meters) || 200, 2000);
      circleRef.current.setRadius(radius);
    }
  }, [settings.office_radius_meters]);

  const tabs = [
    { key: 'smtp', label: 'SMTP', icon: 'lucide:mail' },
    { key: 'geofence', label: 'Office Geofence', icon: 'lucide:map-pin' },
    { key: 'branding', label: 'Branding', icon: 'lucide:palette' },
    { key: 'meetings', label: 'Meeting Integrations', icon: 'lucide:video' },
  ];

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>IT Portal</h1>
          <p className="subtitle" style={{color:'var(--text-dim)'}}>System infrastructure & integrations</p>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="it-tabs">
          {tabs.map(tab => (
            <button key={tab.key} className={`it-tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              <Icon icon={tab.icon} size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {message && <div className="glass-alert glass-alert-success" style={{ margin: '0 20px 12px' }}>{message}</div>}

        {activeTab === 'smtp' && (
          <div className="it-settings-section">
            <h3 style={{margin:'0 0 16px',padding:'0 20px'}}>SMTP Configuration</h3>
            <div className="it-form-grid" style={{padding:'0 20px 20px'}}>
              <div className="glass-input-group">
                <label>SMTP Host</label>
                <input className="glass-input" value={settings.smtp_host} onChange={(e) => setSettings(s => ({...s, smtp_host: e.target.value}))} placeholder="smtp.gmail.com" />
              </div>
              <div className="glass-input-group">
                <label>Port</label>
                <input className="glass-input" value={settings.smtp_port} onChange={(e) => setSettings(s => ({...s, smtp_port: e.target.value}))} />
              </div>
              <div className="glass-input-group">
                <label>Username</label>
                <input className="glass-input" value={settings.smtp_user} onChange={(e) => setSettings(s => ({...s, smtp_user: e.target.value}))} />
              </div>
              <div className="glass-input-group">
                <label>Password</label>
                <input className="glass-input" type="password" value={settings.smtp_pass} onChange={(e) => setSettings(s => ({...s, smtp_pass: e.target.value}))} placeholder="(leave empty to keep current)" />
              </div>
              <div className="glass-input-group">
                <label>From Address</label>
                <input className="glass-input" value={settings.smtp_from || ''} onChange={(e) => setSettings(s => ({...s, smtp_from: e.target.value}))} placeholder="noreply@company.com" />
              </div>
              <div className="glass-input-group">
                <label>Send Test Email</label>
                <div style={{display:'flex',gap:8}}>
                  <input className="glass-input" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="recipient@email.com" />
                  <button className="glass-btn glass-btn-primary" onClick={handleTestEmail} disabled={saving}>
                    <Icon icon="lucide:send" size={14} /> Send
                  </button>
                </div>
              </div>
            </div>
            <div style={{padding:'0 20px 20px'}}>
              <button className="glass-btn glass-btn-primary" onClick={() => handleSave('smtp')} disabled={saving}>
                {saving ? <span className="spinner" style={{width:14,height:14}} /> : <Icon icon="lucide:save" size={16} />} Save SMTP Settings
              </button>
            </div>
          </div>
        )}

        {activeTab === 'geofence' && (
          <div className="it-settings-section">
            <h3 style={{margin:'0 0 16px',padding:'0 20px'}}>Office GPS Geofence</h3>
            <div style={{padding:'0 20px'}}>
              <div ref={mapRef} style={{height:'320px',borderRadius:'8px',overflow:'hidden',marginBottom:'16px'}} />
              <div className="it-form-grid">
                <div className="glass-input-group">
                  <label>Latitude</label>
                  <input className="glass-input" value={settings.office_lat} onChange={(e) => setSettings(s => ({...s, office_lat: e.target.value}))} />
                </div>
                <div className="glass-input-group">
                  <label>Longitude</label>
                  <input className="glass-input" value={settings.office_lng} onChange={(e) => setSettings(s => ({...s, office_lng: e.target.value}))} />
                </div>
                <div className="glass-input-group">
                  <label>Radius (meters, max 2000)</label>
                  <input className="glass-input" type="number" value={settings.office_radius_meters} onChange={(e) => setSettings(s => ({...s, office_radius_meters: e.target.value}))} />
                </div>
              </div>
              <button className="glass-btn glass-btn-primary" style={{marginTop:12}} onClick={() => handleSave('smtp')} disabled={saving}>
                {saving ? <span className="spinner" style={{width:14,height:14}} /> : <Icon icon="lucide:save" size={16} />} Save Geofence
              </button>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div className="it-settings-section">
            <h3 style={{margin:'0 0 16px',padding:'0 20px'}}>Company Branding</h3>
            <div style={{padding:'0 20px 20px'}}>
              <div className="glass-input-group">
                <label>Company Logo</label>
                <input type="file" accept="image/png,image/svg+xml,image/jpeg" value={logoInput} onChange={handleLogoUpload} />
              </div>
              {logoData && (
                <div style={{marginBottom:'16px'}}>
                  <img src={logoData} alt="Logo" style={{maxHeight:'80px',maxWidth:'200px'}} />
                </div>
              )}
              <button className="glass-btn glass-btn-primary" onClick={() => handleSave('branding')} disabled={saving}>
                {saving ? <span className="spinner" style={{width:14,height:14}} /> : <Icon icon="lucide:save" size={16} />} Save Branding
              </button>
            </div>
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="it-settings-section">
            <h3 style={{margin:'0 0 16px',padding:'0 20px'}}>Meeting Integrations</h3>
            <div style={{padding:'0 20px 20px'}}>
              <h4 style={{marginBottom:'8px'}}>Google Meet</h4>
              <div className="it-form-grid">
                <div className="glass-input-group">
                  <label>Service Account Email</label>
                  <input className="glass-input" value={meetingSettings.meeting_google_service_email} onChange={(e) => setMeetingSettings(s => ({...s, meeting_google_service_email: e.target.value}))} placeholder="worktrack@project.iam.gserviceaccount.com" />
                </div>
                <div className="glass-input-group">
                  <label>Private Key</label>
                  <textarea className="glass-input" rows="3" value={meetingSettings.meeting_google_private_key} onChange={(e) => setMeetingSettings(s => ({...s, meeting_google_private_key: e.target.value}))} placeholder="(leave empty to keep current)" />
                </div>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:'20px'}}>
                <button className="glass-btn glass-btn-ghost" onClick={() => handleTestMeeting('google')} disabled={testingGoogle}>
                  {testingGoogle ? <span className="spinner" style={{width:14,height:14}} /> : <Icon icon="lucide:check" size={14} />} Test Google
                </button>
                <button className="glass-btn glass-btn-primary" onClick={() => handleSave('meetings')}>Save Google</button>
              </div>

              <h4 style={{marginBottom:'8px'}}>Microsoft Teams</h4>
              <div className="it-form-grid">
                <div className="glass-input-group"><label>Tenant ID</label><input className="glass-input" value={meetingSettings.meeting_teams_tenant_id} onChange={(e) => setMeetingSettings(s => ({...s, meeting_teams_tenant_id: e.target.value}))} /></div>
                <div className="glass-input-group"><label>Client ID</label><input className="glass-input" value={meetingSettings.meeting_teams_client_id} onChange={(e) => setMeetingSettings(s => ({...s, meeting_teams_client_id: e.target.value}))} /></div>
                <div className="glass-input-group"><label>Client Secret</label><input className="glass-input" type="password" value={meetingSettings.meeting_teams_client_secret} onChange={(e) => setMeetingSettings(s => ({...s, meeting_teams_client_secret: e.target.value}))} placeholder="(leave empty to keep current)" /></div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="glass-btn glass-btn-ghost" onClick={() => handleTestMeeting('teams')} disabled={testingTeams}>
                  {testingTeams ? <span className="spinner" style={{width:14,height:14}} /> : <Icon icon="lucide:check" size={14} />} Test Teams
                </button>
                <button className="glass-btn glass-btn-primary" onClick={() => handleSave('meetings')}>Save Teams</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
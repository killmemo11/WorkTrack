import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

export default function PlatformSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

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

  const ensureSetting = (key, defaultValue = '') => {
    if (!settings.find(s => s.key === key)) {
      setSettings(prev => [...prev, { key, value: defaultValue }]);
    }
  };

  const handleChange = (key, value) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s));
  };

  const getVal = (key) => {
    const s = settings.find(s => s.key === key);
    return s ? s.value || '' : '';
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

  const handleTestSmtp = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult('');
    try {
      const res = await fetch('/api/platform/settings/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      setTestResult(res.ok ? 'ok' : (data.error || 'Failed'));
    } catch {
      setTestResult('Network error');
    } finally {
      setTesting(false);
    }
  };

  const smtpFields = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];
  smtpFields.forEach(k => ensureSetting(k));

  if (loading) return <div className="glass-loading"><div className="spinner" /></div>;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Platform Settings</h1>
          <p>Configure platform-wide settings that affect all tenants and the landing page</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving}>
          <Icon icon="lucide:save" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && <div className="glass-alert glass-alert-error">{error}</div>}
      {success && (
        <div className="glass-alert glass-alert-success">
          <Icon icon="lucide:check-circle" /> Settings saved successfully
        </div>
      )}

      <div className="platform-settings-grid">
        {/* General Settings */}
        <div className="glass-card platform-settings-card">
          <h3><Icon icon="lucide:settings" /> General</h3>
          {settings.filter(s => ['company_name', 'company_email', 'contact_email', 'contact_phone', 'default_currency'].includes(s.key)).map((s) => (
            <div key={s.key} className="glass-input-group">
              <label>{s.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
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
              {s.description && <p className="field-desc">{s.description}</p>}
            </div>
          ))}
        </div>

        {/* Trial Settings */}
        <div className="glass-card platform-settings-card">
          <h3><Icon icon="lucide:clock" /> Trial Period</h3>
          {settings.filter(s => s.key === 'default_trial_days').map((s) => (
            <div key={s.key} className="glass-input-group">
              <label>Default Trial Days</label>
              <input type="number" min="0" value={s.value || '14'} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" />
              <p className="field-desc">
                New tenants get this many free days before requiring a subscription
              </p>
            </div>
          ))}
        </div>

        {/* Platform SMTP */}
        <div className="glass-card platform-settings-card full-width">
          <h3>
            <Icon icon="lucide:mail" /> Platform Email (SMTP)
            <span className={`platform-smtp-status ${getVal('smtp_user') ? 'smtp-configured' : 'smtp-unconfigured'}`}>
              {getVal('smtp_user') ? 'Configured' : 'Not Configured'}
            </span>
          </h3>
              <p className="field-desc platform-mb-sm">
                SMTP settings for platform emails (magic links, tenant notifications, alerts). Falls back to environment variables if empty.
              </p>
          <div className="platform-settings-grid-2">
            <div className="glass-input-group">
              <label>SMTP Host</label>
              <input type="text" value={getVal('smtp_host')} onChange={e => handleChange('smtp_host', e.target.value)} className="glass-input" placeholder="smtp.gmail.com" />
            </div>
            <div className="glass-input-group">
              <label>Port</label>
              <input type="number" value={getVal('smtp_port')} onChange={e => handleChange('smtp_port', e.target.value)} className="glass-input" placeholder="587" />
            </div>
            <div className="glass-input-group">
              <label>Username</label>
              <input type="text" value={getVal('smtp_user')} onChange={e => handleChange('smtp_user', e.target.value)} className="glass-input" placeholder="your@email.com" />
            </div>
            <div className="glass-input-group">
              <label>Password</label>
              <input type="password" value={getVal('smtp_pass')} onChange={e => handleChange('smtp_pass', e.target.value)} className="glass-input" placeholder="App password or SMTP password" />
            </div>
            <div className="glass-input-group">
              <label>From Address</label>
              <input type="email" value={getVal('smtp_from')} onChange={e => handleChange('smtp_from', e.target.value)} className="glass-input" placeholder="noreply@worktrack.ddns.net" />
            </div>
          </div>
          <div className="platform-settings-divider">
            <p className="platform-settings-label">Send Test Email</p>
            <div className="platform-test-row">
              <input
                type="email"
                className="glass-input"
                placeholder="test@example.com"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
              />
              <button className="glass-btn glass-btn-ghost" onClick={handleTestSmtp} disabled={testing || !testEmail}>
                {testing ? 'Sending...' : 'Send Test'}
              </button>
            </div>
            {testResult && (
              <p className={`platform-test-result ${testResult === 'ok' ? 'success' : 'error'}`}>
                {testResult === 'ok' ? 'Test email sent successfully!' : testResult}
              </p>
            )}
          </div>
        </div>

        {/* Landing Page Settings */}
        <div className="glass-card platform-settings-card full-width">
          <h3><Icon icon="lucide:layout" /> Landing Page Content</h3>
          {settings.filter(s => s.key.startsWith('landing_')).map((s) => (
            <div key={s.key} className="glass-input-group">
              <label>{s.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</label>
              {s.key.includes('title') || s.key.includes('text') ? (
                <input type="text" value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input" />
              ) : (
                <textarea value={s.value || ''} onChange={(e) => handleChange(s.key, e.target.value)} className="glass-input glass-textarea" rows={3} />
              )}
              {s.description && <p className="field-desc">{s.description}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

const DEFAULT_FEATURES = '{"items":[{"icon":"lucide:clock","title":"Attendance Tracking","desc":"Real-time attendance tracking with geofence support and missing sign-out alerts."},{"icon":"lucide:calendar","title":"Leave Management","desc":"Comprehensive leave management with approval workflows and balance tracking."},{"icon":"lucide:users","title":"HR & People Ops","desc":"Employee profiles, organization charts, documents, contracts, and checklists in one place."},{"icon":"lucide:briefcase","title":"Recruitment ATS","desc":"Full applicant tracking system with candidate pipeline, interview scheduling, and offer management."},{"icon":"lucide:bar-chart-3","title":"Reports & Analytics","desc":"Detailed reports and analytics for attendance, headcount, and audit compliance."},{"icon":"lucide:shield","title":"Security & RBAC","desc":"Role-based access control with granular permissions and audit trails for every action."}]}';
const DEFAULT_STEPS = '{"steps":[{"icon":"lucide:user-plus","title":"Register Your Company","desc":"Create your account and tell us about your team."},{"icon":"lucide:check-circle","title":"Get Approved","desc":"Our team reviews and approves your workspace within 24 hours."},{"icon":"lucide:rocket","title":"Set Up & Go","desc":"Add your employees, configure settings, and start managing."}]}';
const DEFAULT_FOOTER_LINKS = '{"links":[{"label":"Careers","url":"/careers"},{"label":"Sign In","url":"/login"},{"label":"Register","url":"/tenant-register"}]}';

const ICON_OPTIONS = [
  { value: 'lucide:clock', label: 'Clock' },
  { value: 'lucide:calendar', label: 'Calendar' },
  { value: 'lucide:users', label: 'Users' },
  { value: 'lucide:user', label: 'User' },
  { value: 'lucide:briefcase', label: 'Briefcase' },
  { value: 'lucide:bar-chart-3', label: 'Bar Chart' },
  { value: 'lucide:shield', label: 'Shield' },
  { value: 'lucide:shield-check', label: 'Shield Check' },
  { value: 'lucide:check-circle', label: 'Check Circle' },
  { value: 'lucide:heart', label: 'Heart' },
  { value: 'lucide:zap', label: 'Zap' },
  { value: 'lucide:globe', label: 'Globe' },
  { value: 'lucide:lock', label: 'Lock' },
  { value: 'lucide:bell', label: 'Bell' },
  { value: 'lucide:target', label: 'Target' },
  { value: 'lucide:star', label: 'Star' },
  { value: 'lucide:eye', label: 'Eye' },
  { value: 'lucide:settings', label: 'Settings' },
  { value: 'lucide:layers', label: 'Layers' },
  { value: 'lucide:cpu', label: 'CPU' },
  { value: 'lucide:mail', label: 'Mail' },
  { value: 'lucide:phone', label: 'Phone' },
  { value: 'lucide:smartphone', label: 'Smartphone' },
  { value: 'lucide:database', label: 'Database' },
  { value: 'lucide:file-text', label: 'File Text' },
  { value: 'lucide:headphones', label: 'Headphones' },
  { value: 'lucide:message-square', label: 'Message' },
  { value: 'lucide:truck', label: 'Truck' },
];

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function PlatformSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [activeLandingTab, setActiveLandingTab] = useState('hero');
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);

  const token = localStorage.getItem('platformToken');

  useEffect(() => {
    fetch('/api/platform/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { setSettings(data); setLoading(false); })
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: settings.map((s) => ({ key: s.key, value: s.value })) }),
      });
      if (res.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
      else { const data = await res.json(); setError(data.error || 'Failed to save'); }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const handleTestSmtp = async () => {
    if (!testEmail) return;
    setTesting(true); setTestResult('');
    try {
      const res = await fetch('/api/platform/settings/test-smtp', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json(); setTestResult(res.ok ? 'ok' : (data.error || 'Failed'));
    } catch { setTestResult('Network error'); }
    finally { setTesting(false); }
  };

  // Landing helpers
  const features = parseJSON(getVal('landing_features_list', DEFAULT_FEATURES), { items: [] }).items || [];
  const updateFeature = (idx, field, value) => {
    const list = [...features]; list[idx] = { ...list[idx], [field]: value };
    handleChange('landing_features_list', JSON.stringify({ items: list }));
  };
  const addFeature = () => { handleChange('landing_features_list', JSON.stringify({ items: [...features, { icon: 'lucide:star', title: 'New Feature', desc: 'Feature description' }] })); setActiveFeatureTab(features.length); };
  const removeFeature = (idx) => { handleChange('landing_features_list', JSON.stringify({ items: features.filter((_, i) => i !== idx) })); setActiveFeatureTab(Math.min(idx, Math.max(0, features.length - 2))); };
  const moveFeature = (idx, dir) => {
    const ni = idx + dir; if (ni < 0 || ni >= features.length) return;
    const list = [...features]; [list[idx], list[ni]] = [list[ni], list[idx]];
    handleChange('landing_features_list', JSON.stringify({ items: list }));
  };

  const steps = parseJSON(getVal('landing_steps_list', DEFAULT_STEPS), { steps: [] }).steps || [];
  const updateStep = (idx, field, value) => {
    const list = [...steps]; list[idx] = { ...list[idx], [field]: value };
    handleChange('landing_steps_list', JSON.stringify({ steps: list }));
  };
  const addStep = () => handleChange('landing_steps_list', JSON.stringify({ steps: [...steps, { icon: 'lucide:check', title: 'New Step', desc: 'Step description' }] }));
  const removeStep = (idx) => handleChange('landing_steps_list', JSON.stringify({ steps: steps.filter((_, i) => i !== idx) }));
  const moveStep = (idx, dir) => {
    const ni = idx + dir; if (ni < 0 || ni >= steps.length) return;
    const list = [...steps]; [list[idx], list[ni]] = [list[ni], list[idx]];
    handleChange('landing_steps_list', JSON.stringify({ steps: list }));
  };

  const footerLinks = parseJSON(getVal('landing_footer_links', DEFAULT_FOOTER_LINKS), { links: [] }).links || [];
  const updateFooterLink = (idx, field, value) => {
    const list = [...footerLinks]; list[idx] = { ...list[idx], [field]: value };
    handleChange('landing_footer_links', JSON.stringify({ links: list }));
  };
  const addFooterLink = () => handleChange('landing_footer_links', JSON.stringify({ links: [...footerLinks, { label: 'New Link', url: '/new-link' }] }));
  const removeFooterLink = (idx) => handleChange('landing_footer_links', JSON.stringify({ links: footerLinks.filter((_, i) => i !== idx) }));

  const smtpFields = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'];
  smtpFields.forEach(k => ensureSetting(k));

  if (loading) return <div className="glass-loading"><div className="spinner" /></div>;

  const tabs = [
    { id: 'general', label: 'General', icon: 'lucide:settings' },
    { id: 'landing', label: 'Landing Page', icon: 'lucide:layout-template' },
  ];

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

      {/* Tabs */}
      <div className="platform-settings-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`platform-settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon icon={tab.icon} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── General Tab ─── */}
      {activeTab === 'general' && (
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
                <p className="field-desc">New tenants get this many free days before requiring a subscription</p>
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
                <input type="email" className="glass-input" placeholder="test@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
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
        </div>
      )}

      {/* ─── Landing Page Tab ─── */}
      {activeTab === 'landing' && (
        <div className="platform-landing-tabs-content">
          {/* Sub-tabs for landing sections */}
          <div className="platform-landing-subtabs">
            {[
              { id: 'hero', label: 'Hero', icon: 'lucide:sparkles' },
              { id: 'features', label: 'Features', icon: 'lucide:grid-3x3' },
              { id: 'steps', label: 'How It Works', icon: 'lucide:route' },
              { id: 'cta', label: 'CTA Cards', icon: 'lucide:mouse-pointer-click' },
              { id: 'footer', label: 'Footer', icon: 'lucide:anchor' },
              { id: 'visibility', label: 'Visibility', icon: 'lucide:eye' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`platform-landing-subtab ${activeLandingTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveLandingTab(tab.id)}
              >
                <Icon icon={tab.icon} size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="platform-landing-panel">
            {/* Hero */}
            {activeLandingTab === 'hero' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:sparkles" /> Hero Section</h3>
                <p className="platform-landing-hint">The first thing visitors see at the top of your landing page.</p>
                <div className="platform-landing-form">
                  <div className="glass-input-group">
                    <label>Nav Brand Name</label>
                    <input className="glass-input" value={getVal('landing_nav_title', '')} onChange={e => handleChange('landing_nav_title', e.target.value)} placeholder="WorkTrack" />
                  </div>
                  <div className="glass-input-group">
                    <label>Hero Badge Text</label>
                    <input className="glass-input" value={getVal('landing_hero_badge', '')} onChange={e => handleChange('landing_hero_badge', e.target.value)} placeholder="HR Management Platform" />
                  </div>
                  <div className="glass-input-group">
                    <label>Hero Title (Main Heading)</label>
                    <input className="glass-input" value={getVal('landing_hero_title', '')} onChange={e => handleChange('landing_hero_title', e.target.value)} placeholder="Simplify Your HR Operations in One Place" />
                  </div>
                  <div className="glass-input-group">
                    <label>Hero Subtitle / Description</label>
                    <textarea className="glass-input glass-textarea" value={getVal('landing_hero_subtitle', '')} onChange={e => handleChange('landing_hero_subtitle', e.target.value)} placeholder="Track attendance, manage leaves..." />
                  </div>
                  <div className="platform-landing-form-2col">
                    <div className="glass-input-group">
                      <label>Primary Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_text', '')} onChange={e => handleChange('landing_cta_text', e.target.value)} placeholder="Start Your Company" />
                    </div>
                    <div className="glass-input-group">
                      <label>Secondary Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_secondary_text', '')} onChange={e => handleChange('landing_cta_secondary_text', e.target.value)} placeholder="Sign In" />
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <div className="platform-landing-preview">
                  <div className="platform-landing-preview-label"><Icon icon="lucide:eye" size={12} /> Live Preview</div>
                  <div className="platform-landing-preview-hero">
                    {getVal('landing_hero_badge', '') && <span className="platform-landing-preview-badge">{getVal('landing_hero_badge', '')}</span>}
                    <h2>{getVal('landing_hero_title', 'Your Title Here')}</h2>
                    <p>{getVal('landing_hero_subtitle', 'Your subtitle appears here...')}</p>
                    <div className="platform-landing-preview-btns">
                      <span className="glass-btn glass-btn-primary glass-btn-sm">{getVal('landing_cta_text', 'Start')}</span>
                      <span className="glass-btn glass-btn-ghost glass-btn-sm">{getVal('landing_cta_secondary_text', 'Sign In')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features */}
            {activeLandingTab === 'features' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:grid-3x3" /> Features Section</h3>
                <p className="platform-landing-hint">Each tab is a feature card on the landing page. Click a tab to edit, or add a new one.</p>
                <div className="platform-landing-form">
                  <div className="platform-landing-form-2col">
                    <div className="glass-input-group">
                      <label>Section Title</label>
                      <input className="glass-input" value={getVal('landing_features_title', '')} onChange={e => handleChange('landing_features_title', e.target.value)} placeholder="Everything You Need to Run Your Team" />
                    </div>
                    <div className="glass-input-group">
                      <label>Section Subtitle</label>
                      <input className="glass-input" value={getVal('landing_features_subtitle', '')} onChange={e => handleChange('landing_features_subtitle', e.target.value)} placeholder="Powerful tools designed to make HR management effortless" />
                    </div>
                  </div>
                </div>

                {/* Feature Tabs */}
                <div className="platform-feature-tabs">
                  {features.map((f, i) => (
                    <button
                      key={i}
                      className={`platform-feature-tab ${activeFeatureTab === i ? 'active' : ''}`}
                      onClick={() => setActiveFeatureTab(i)}
                    >
                      <Icon icon={f.icon || 'lucide:star'} size={13} />
                      <span>{f.title || `Feature ${i + 1}`}</span>
                    </button>
                  ))}
                  <button className="platform-feature-tab platform-feature-tab-add" onClick={addFeature}>
                    <Icon icon="lucide:plus" size={14} /> Add
                  </button>
                </div>

                {/* Feature Editor + Live Preview */}
                {features.length > 0 && features[activeFeatureTab] && (
                  <div className="platform-feature-editor">
                    {/* Left: Form */}
                    <div className="platform-feature-form">
                      <div className="glass-input-group">
                        <label>Icon</label>
                        <div className="platform-icon-picker-row">
                          <select
                            className="glass-input platform-icon-picker"
                            value={features[activeFeatureTab].icon}
                            onChange={e => updateFeature(activeFeatureTab, 'icon', e.target.value)}
                          >
                            {ICON_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <div className="platform-icon-picker-preview">
                            <Icon icon={features[activeFeatureTab].icon || 'lucide:star'} size={20} />
                          </div>
                        </div>
                      </div>
                      <div className="glass-input-group">
                        <label>Title</label>
                        <input className="glass-input" value={features[activeFeatureTab].title} onChange={e => updateFeature(activeFeatureTab, 'title', e.target.value)} placeholder="Feature Title" />
                      </div>
                      <div className="glass-input-group">
                        <label>Description</label>
                        <textarea className="glass-input glass-textarea" value={features[activeFeatureTab].desc} onChange={e => updateFeature(activeFeatureTab, 'desc', e.target.value)} placeholder="Short description of this feature..." style={{ minHeight: 80 }} />
                      </div>
                      <div className="platform-feature-actions">
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveFeature(activeFeatureTab, -1)} disabled={activeFeatureTab === 0}><Icon icon="lucide:chevron-left" size={14} /> Left</button>
                        <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveFeature(activeFeatureTab, 1)} disabled={activeFeatureTab === features.length - 1}>Right <Icon icon="lucide:chevron-right" size={14} /></button>
                        <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeFeature(activeFeatureTab)}><Icon icon="lucide:trash-2" size={14} /> Delete</button>
                      </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div className="platform-feature-preview">
                      <div className="platform-landing-preview-label"><Icon icon="lucide:eye" size={12} /> Live Preview</div>
                      <div className="platform-feature-preview-card">
                        <div className="platform-feature-preview-icon">
                          <Icon icon={features[activeFeatureTab].icon || 'lucide:star'} size={24} />
                        </div>
                        <h4>{features[activeFeatureTab].title || 'Feature Title'}</h4>
                        <p>{features[activeFeatureTab].desc || 'Feature description will appear here...'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {features.length === 0 && <div className="platform-empty-state small"><p>No features yet. Click "Add" to create one.</p></div>}
              </div>
            )}

            {/* How It Works */}
            {activeLandingTab === 'steps' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:route" /> How It Works Section</h3>
                <p className="platform-landing-hint">A numbered stepper showing how customers get started with your platform.</p>
                <div className="platform-landing-form">
                  <div className="glass-input-group">
                    <label>Section Title</label>
                    <input className="glass-input" value={getVal('landing_steps_title', '')} onChange={e => handleChange('landing_steps_title', e.target.value)} placeholder="Get Started in 3 Simple Steps" />
                  </div>
                  <div className="glass-input-group">
                    <label>Section Subtitle</label>
                    <input className="glass-input" value={getVal('landing_steps_subtitle', '')} onChange={e => handleChange('landing_steps_subtitle', e.target.value)} placeholder="No technical expertise required" />
                  </div>
                </div>

                <div className="platform-landing-list-header">
                  <span>Steps ({steps.length})</span>
                  <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={addStep}><Icon icon="lucide:plus" size={14} /> Add Step</button>
                </div>
                <div className="platform-landing-list">
                  {steps.map((step, i) => (
                    <div key={i} className="platform-landing-list-item">
                      <div className="platform-landing-list-top">
                        <span className="platform-landing-list-num">{i + 1}</span>
                        <div className="platform-landing-list-fields">
                          <div className="glass-input-group" style={{ marginBottom: 8 }}>
                            <label>Step Title</label>
                            <input className="glass-input" value={step.title} onChange={e => updateStep(i, 'title', e.target.value)} placeholder="Register Your Company" />
                          </div>
                          <div className="glass-input-group" style={{ marginBottom: 0 }}>
                            <label>Step Description</label>
                            <textarea className="glass-input glass-textarea" value={step.desc} onChange={e => updateStep(i, 'desc', e.target.value)} style={{ minHeight: 60 }} />
                          </div>
                        </div>
                        <div className="platform-landing-list-controls">
                          <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveStep(i, -1)} disabled={i === 0}><Icon icon="lucide:chevron-up" size={14} /></button>
                          <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}><Icon icon="lucide:chevron-down" size={14} /></button>
                          <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeStep(i)}><Icon icon="lucide:trash-2" size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {steps.length === 0 && <div className="platform-empty-state small"><p>No steps yet. Click "Add Step" to create one.</p></div>}
                </div>
              </div>
            )}

            {/* CTA Cards */}
            {activeLandingTab === 'cta' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:mouse-pointer-click" /> CTA Cards Section</h3>
                <p className="platform-landing-hint">Two call-to-action cards at the bottom of the page — one for registration, one for sign-in.</p>

                <div className="platform-landing-cta-grid">
                  <div className="platform-landing-cta-block">
                    <h4>Card 1 — Register</h4>
                    <div className="glass-input-group">
                      <label>Title</label>
                      <input className="glass-input" value={getVal('landing_cta_card_1_title', '')} onChange={e => handleChange('landing_cta_card_1_title', e.target.value)} placeholder="Ready to Get Started?" />
                    </div>
                    <div className="glass-input-group">
                      <label>Body Text</label>
                      <textarea className="glass-input glass-textarea" value={getVal('landing_cta_card_1_text', '')} onChange={e => handleChange('landing_cta_card_1_text', e.target.value)} />
                    </div>
                    <div className="glass-input-group">
                      <label>Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_card_1_button', '')} onChange={e => handleChange('landing_cta_card_1_button', e.target.value)} placeholder="Register Your Company" />
                    </div>
                  </div>
                  <div className="platform-landing-cta-block">
                    <h4>Card 2 — Sign In</h4>
                    <div className="glass-input-group">
                      <label>Title</label>
                      <input className="glass-input" value={getVal('landing_cta_card_2_title', '')} onChange={e => handleChange('landing_cta_card_2_title', e.target.value)} placeholder="Already Have an Account?" />
                    </div>
                    <div className="glass-input-group">
                      <label>Body Text</label>
                      <textarea className="glass-input glass-textarea" value={getVal('landing_cta_card_2_text', '')} onChange={e => handleChange('landing_cta_card_2_text', e.target.value)} />
                    </div>
                    <div className="glass-input-group">
                      <label>Button Text</label>
                      <input className="glass-input" value={getVal('landing_cta_card_2_button', '')} onChange={e => handleChange('landing_cta_card_2_button', e.target.value)} placeholder="Sign In" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            {activeLandingTab === 'footer' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:anchor" /> Footer Section</h3>
                <p className="platform-landing-hint">The footer at the very bottom of the landing page.</p>

                <div className="glass-input-group" style={{ marginBottom: 20 }}>
                  <label>Footer Tagline</label>
                  <input className="glass-input" value={getVal('landing_footer_text', '')} onChange={e => handleChange('landing_footer_text', e.target.value)} placeholder="Empowering teams with modern HR tools." />
                </div>

                <div className="platform-landing-list-header">
                  <span>Footer Links ({footerLinks.length})</span>
                  <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={addFooterLink}><Icon icon="lucide:plus" size={14} /> Add Link</button>
                </div>
                <div className="platform-landing-list">
                  {footerLinks.map((l, i) => (
                    <div key={i} className="platform-landing-list-item platform-landing-link-row">
                      <div className="glass-input-group" style={{ marginBottom: 0, flex: 1 }}>
                        <input className="glass-input" value={l.label} onChange={e => updateFooterLink(i, 'label', e.target.value)} placeholder="Link Label" />
                      </div>
                      <div className="glass-input-group" style={{ marginBottom: 0, flex: 1 }}>
                        <input className="glass-input" value={l.url} onChange={e => updateFooterLink(i, 'url', e.target.value)} placeholder="/url" />
                      </div>
                      <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeFooterLink(i)}><Icon icon="lucide:trash-2" size={14} /></button>
                    </div>
                  ))}
                  {footerLinks.length === 0 && <div className="platform-empty-state small"><p>No footer links yet.</p></div>}
                </div>
              </div>
            )}

            {/* Visibility */}
            {activeLandingTab === 'visibility' && (
              <div className="glass-card platform-landing-section">
                <h3 className="platform-landing-section-title"><Icon icon="lucide:eye" /> Section Visibility</h3>
                <p className="platform-landing-hint">Show or hide individual sections of the landing page without deleting their content.</p>

                <div className="platform-landing-toggles">
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_features', '1') === '1'} onChange={e => handleChange('landing_show_features', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show Features Section</strong><span>The grid of feature cards</span></div>
                  </label>
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_how_it_works', '1') === '1'} onChange={e => handleChange('landing_show_how_it_works', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show How It Works</strong><span>The numbered stepper section</span></div>
                  </label>
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_plans', '1') === '1'} onChange={e => handleChange('landing_show_plans', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show Pricing Section</strong><span>The subscription plans grid</span></div>
                  </label>
                  <label className="platform-landing-toggle">
                    <input type="checkbox" checked={getVal('landing_show_cta_cards', '1') === '1'} onChange={e => handleChange('landing_show_cta_cards', e.target.checked ? '1' : '0')} />
                    <div className="platform-landing-toggle-info"><strong>Show CTA Cards</strong><span>The register / sign-in cards</span></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
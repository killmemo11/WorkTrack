// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';

const DEFAULT_FEATURES = '{"items":[{"icon":"lucide:clock","title":"Attendance Tracking","desc":"Real-time attendance tracking with geofence support and missing sign-out alerts."},{"icon":"lucide:calendar","title":"Leave Management","desc":"Comprehensive leave management with approval workflows and balance tracking."},{"icon":"lucide:users","title":"HR & People Ops","desc":"Employee profiles, organization charts, documents, contracts, and checklists in one place."},{"icon":"lucide:briefcase","title":"Recruitment ATS","desc":"Full applicant tracking system with candidate pipeline, interview scheduling, and offer management."},{"icon":"lucide:bar-chart-3","title":"Reports & Analytics","desc":"Detailed reports and analytics for attendance, headcount, and audit compliance."},{"icon":"lucide:shield","title":"Security & RBAC","desc":"Role-based access control with granular permissions and audit trails for every action."}]}';
const DEFAULT_STEPS = '{"steps":[{"icon":"lucide:user-plus","title":"Register Your Company","desc":"Create your account and tell us about your team."},{"icon":"lucide:check-circle","title":"Get Approved","desc":"Our team reviews and approves your workspace within 24 hours."},{"icon":"lucide:rocket","title":"Set Up & Go","desc":"Add your employees, configure settings, and start managing."}]}';
const DEFAULT_FOOTER_LINKS = '{"links":[{"label":"Careers","url":"/careers"},{"label":"Sign In","url":"/login"},{"label":"Register","url":"/tenant-register"}]}';

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function PlatformLandingEditor() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('hero');

  const token = localStorage.getItem('platformToken');

  useEffect(() => {
    fetch('/api/platform/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(s => { map[s.key] = s.value; });
        setSettings(map);
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const get = (key, fallback = '') => settings[key] || fallback;
  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      const keys = Object.keys(settings).filter(k => k.startsWith('landing_'));
      const payload = keys.map(k => ({ key: k, value: settings[k] }));
      const res = await fetch('/api/platform/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ settings: payload }),
      });
      if (res.ok) { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
      else { const d = await res.json(); setError(d.error || 'Save failed'); }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  // ── Feature list helpers ──
  const features = parseJSON(get('landing_features_list', DEFAULT_FEATURES), { items: [] }).items || [];
  const updateFeature = (idx, field, value) => {
    const list = [...features];
    list[idx] = { ...list[idx], [field]: value };
    set('landing_features_list', JSON.stringify({ items: list }));
  };
  const addFeature = () => {
    const list = [...features, { icon: 'lucide:star', title: 'New Feature', desc: 'Feature description' }];
    set('landing_features_list', JSON.stringify({ items: list }));
  };
  const removeFeature = (idx) => {
    const list = features.filter((_, i) => i !== idx);
    set('landing_features_list', JSON.stringify({ items: list }));
  };
  const moveFeature = (idx, dir) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= features.length) return;
    const list = [...features];
    [list[idx], list[ni]] = [list[ni], list[idx]];
    set('landing_features_list', JSON.stringify({ items: list }));
  };

  // ── Steps helpers ──
  const steps = parseJSON(get('landing_steps_list', DEFAULT_STEPS), { steps: [] }).steps || [];
  const updateStep = (idx, field, value) => {
    const list = [...steps];
    list[idx] = { ...list[idx], [field]: value };
    set('landing_steps_list', JSON.stringify({ steps: list }));
  };
  const addStep = () => {
    const list = [...steps, { icon: 'lucide:check', title: 'New Step', desc: 'Step description' }];
    set('landing_steps_list', JSON.stringify({ steps: list }));
  };
  const removeStep = (idx) => {
    const list = steps.filter((_, i) => i !== idx);
    set('landing_steps_list', JSON.stringify({ steps: list }));
  };
  const moveStep = (idx, dir) => {
    const ni = idx + dir;
    if (ni < 0 || ni >= steps.length) return;
    const list = [...steps];
    [list[idx], list[ni]] = [list[ni], list[idx]];
    set('landing_steps_list', JSON.stringify({ steps: list }));
  };

  // ── Footer links helpers ──
  const footerLinks = parseJSON(get('landing_footer_links', DEFAULT_FOOTER_LINKS), { links: [] }).links || [];
  const updateFooterLink = (idx, field, value) => {
    const list = [...footerLinks];
    list[idx] = { ...list[idx], [field]: value };
    set('landing_footer_links', JSON.stringify({ links: list }));
  };
  const addFooterLink = () => {
    const list = [...footerLinks, { label: 'New Link', url: '/new-link' }];
    set('landing_footer_links', JSON.stringify({ links: list }));
  };
  const removeFooterLink = (idx) => {
    const list = footerLinks.filter((_, i) => i !== idx);
    set('landing_footer_links', JSON.stringify({ links: list }));
  };

  if (loading) return <div className="glass-loading"><div className="spinner" /></div>;

  const tabs = [
    { id: 'hero', label: 'Hero', icon: 'lucide:sparkles' },
    { id: 'features', label: 'Features', icon: 'lucide:grid-3x3' },
    { id: 'steps', label: 'How It Works', icon: 'lucide:route' },
    { id: 'cta', label: 'CTA Cards', icon: 'lucide:mouse-pointer-click' },
    { id: 'footer', label: 'Footer', icon: 'lucide:anchor' },
    { id: 'visibility', label: 'Visibility', icon: 'lucide:eye' },
  ];

  const navTitle = get('landing_nav_title', get('company_name', 'WorkTrack'));

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Landing Page Editor</h1>
          <p>Edit every section of your public landing page — changes apply instantly</p>
        </div>
        <div className="platform-landing-actions">
          <Link to="/" target="_blank" className="glass-btn glass-btn-ghost glass-btn-sm">
            <Icon icon="lucide:external-link" size={14} /> View Live
          </Link>
          <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving}>
            <Icon icon="lucide:save" /> {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {error && <div className="glass-alert glass-alert-error"><Icon icon="lucide:alert-circle" size={16} /> {error}</div>}
      {success && <div className="glass-alert glass-alert-success"><Icon icon="lucide:check-circle" size={16} /> Landing page content saved! Changes are live now.</div>}

      {/* Tabs */}
      <div className="platform-landing-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`platform-landing-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon icon={tab.icon} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Hero Tab ── */}
      {activeTab === 'hero' && (
        <div className="glass-card platform-landing-section">
          <h3 className="platform-landing-section-title"><Icon icon="lucide:sparkles" /> Hero Section</h3>
          <p className="platform-landing-hint">The first thing visitors see at the top of your landing page.</p>
          <div className="platform-landing-form">
            <div className="glass-input-group">
              <label>Nav Brand Name</label>
              <input className="glass-input" value={get('landing_nav_title', '')} onChange={e => set('landing_nav_title', e.target.value)} placeholder="WorkTrack" />
            </div>
            <div className="glass-input-group">
              <label>Hero Badge Text</label>
              <input className="glass-input" value={get('landing_hero_badge', '')} onChange={e => set('landing_hero_badge', e.target.value)} placeholder="HR Management Platform" />
            </div>
            <div className="glass-input-group">
              <label>Hero Title (Main Heading)</label>
              <input className="glass-input" value={get('landing_hero_title', '')} onChange={e => set('landing_hero_title', e.target.value)} placeholder="Simplify Your HR Operations in One Place" />
            </div>
            <div className="glass-input-group">
              <label>Hero Subtitle / Description</label>
              <textarea className="glass-input glass-textarea" value={get('landing_hero_subtitle', '')} onChange={e => set('landing_hero_subtitle', e.target.value)} placeholder="Track attendance, manage leaves..." />
            </div>
            <div className="platform-landing-form-2col">
              <div className="glass-input-group">
                <label>Primary Button Text</label>
                <input className="glass-input" value={get('landing_cta_text', '')} onChange={e => set('landing_cta_text', e.target.value)} placeholder="Start Your Company" />
              </div>
              <div className="glass-input-group">
                <label>Secondary Button Text</label>
                <input className="glass-input" value={get('landing_cta_secondary_text', '')} onChange={e => set('landing_cta_secondary_text', e.target.value)} placeholder="Sign In" />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="platform-landing-preview">
            <div className="platform-landing-preview-label"><Icon icon="lucide:eye" size={12} /> Live Preview</div>
            <div className="platform-landing-preview-hero">
              {get('landing_hero_badge', '') && <span className="platform-landing-preview-badge">{get('landing_hero_badge', '')}</span>}
              <h2>{get('landing_hero_title', 'Your Title Here')}</h2>
              <p>{get('landing_hero_subtitle', 'Your subtitle appears here...')}</p>
              <div className="platform-landing-preview-btns">
                <span className="glass-btn glass-btn-primary glass-btn-sm">{get('landing_cta_text', 'Start')}</span>
                <span className="glass-btn glass-btn-ghost glass-btn-sm">{get('landing_cta_secondary_text', 'Sign In')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Features Tab ── */}
      {activeTab === 'features' && (
        <div className="glass-card platform-landing-section">
          <h3 className="platform-landing-section-title"><Icon icon="lucide:grid-3x3" /> Features Section</h3>
          <p className="platform-landing-hint">The grid of feature cards that showcase what your platform offers.</p>
          <div className="platform-landing-form">
            <div className="glass-input-group">
              <label>Section Title</label>
              <input className="glass-input" value={get('landing_features_title', '')} onChange={e => set('landing_features_title', e.target.value)} placeholder="Everything You Need to Run Your Team" />
            </div>
            <div className="glass-input-group">
              <label>Section Subtitle</label>
              <input className="glass-input" value={get('landing_features_subtitle', '')} onChange={e => set('landing_features_subtitle', e.target.value)} placeholder="Powerful tools designed to make HR management effortless" />
            </div>
          </div>

          <div className="platform-landing-list-header">
            <span>Feature Cards ({features.length})</span>
            <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={addFeature}>
              <Icon icon="lucide:plus" size={14} /> Add Feature
            </button>
          </div>
          <div className="platform-landing-list">
            {features.map((f, i) => (
              <div key={i} className="platform-landing-list-item">
                <div className="platform-landing-list-top">
                  <span className="platform-landing-list-num">{i + 1}</span>
                  <div className="platform-landing-list-fields">
                    <div className="glass-input-group" style={{ marginBottom: 8 }}>
                      <label>Icon (lucide icon name)</label>
                      <input className="glass-input" value={f.icon} onChange={e => updateFeature(i, 'icon', e.target.value)} placeholder="lucide:clock" />
                    </div>
                    <div className="glass-input-group" style={{ marginBottom: 8 }}>
                      <label>Title</label>
                      <input className="glass-input" value={f.title} onChange={e => updateFeature(i, 'title', e.target.value)} placeholder="Attendance Tracking" />
                    </div>
                    <div className="glass-input-group" style={{ marginBottom: 0 }}>
                      <label>Description</label>
                      <textarea className="glass-input glass-textarea" value={f.desc} onChange={e => updateFeature(i, 'desc', e.target.value)} style={{ minHeight: 60 }} />
                    </div>
                  </div>
                  <div className="platform-landing-list-controls">
                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveFeature(i, -1)} disabled={i === 0} title="Move up">
                      <Icon icon="lucide:chevron-up" size={14} />
                    </button>
                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => moveFeature(i, 1)} disabled={i === features.length - 1} title="Move down">
                      <Icon icon="lucide:chevron-down" size={14} />
                    </button>
                    <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeFeature(i)} title="Delete">
                      <Icon icon="lucide:trash-2" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {features.length === 0 && (
              <div className="platform-empty-state small"><p>No features yet. Click "Add Feature" to create one.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── How It Works Tab ── */}
      {activeTab === 'steps' && (
        <div className="glass-card platform-landing-section">
          <h3 className="platform-landing-section-title"><Icon icon="lucide:route" /> How It Works Section</h3>
          <p className="platform-landing-hint">A numbered stepper showing how customers get started with your platform.</p>
          <div className="platform-landing-form">
            <div className="glass-input-group">
              <label>Section Title</label>
              <input className="glass-input" value={get('landing_steps_title', '')} onChange={e => set('landing_steps_title', e.target.value)} placeholder="Get Started in 3 Simple Steps" />
            </div>
            <div className="glass-input-group">
              <label>Section Subtitle</label>
              <input className="glass-input" value={get('landing_steps_subtitle', '')} onChange={e => set('landing_steps_subtitle', e.target.value)} placeholder="No technical expertise required" />
            </div>
          </div>

          <div className="platform-landing-list-header">
            <span>Steps ({steps.length})</span>
            <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={addStep}>
              <Icon icon="lucide:plus" size={14} /> Add Step
            </button>
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
            {steps.length === 0 && (
              <div className="platform-empty-state small"><p>No steps yet. Click "Add Step" to create one.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── CTA Cards Tab ── */}
      {activeTab === 'cta' && (
        <div className="glass-card platform-landing-section">
          <h3 className="platform-landing-section-title"><Icon icon="lucide:mouse-pointer-click" /> CTA Cards Section</h3>
          <p className="platform-landing-hint">Two call-to-action cards at the bottom of the page — one for registration, one for sign-in.</p>

          <div className="platform-landing-cta-grid">
            <div className="platform-landing-cta-block">
              <h4>Card 1 — Register</h4>
              <div className="glass-input-group">
                <label>Title</label>
                <input className="glass-input" value={get('landing_cta_card_1_title', '')} onChange={e => set('landing_cta_card_1_title', e.target.value)} placeholder="Ready to Get Started?" />
              </div>
              <div className="glass-input-group">
                <label>Body Text</label>
                <textarea className="glass-input glass-textarea" value={get('landing_cta_card_1_text', '')} onChange={e => set('landing_cta_card_1_text', e.target.value)} />
              </div>
              <div className="glass-input-group">
                <label>Button Text</label>
                <input className="glass-input" value={get('landing_cta_card_1_button', '')} onChange={e => set('landing_cta_card_1_button', e.target.value)} placeholder="Register Your Company" />
              </div>
            </div>
            <div className="platform-landing-cta-block">
              <h4>Card 2 — Sign In</h4>
              <div className="glass-input-group">
                <label>Title</label>
                <input className="glass-input" value={get('landing_cta_card_2_title', '')} onChange={e => set('landing_cta_card_2_title', e.target.value)} placeholder="Already Have an Account?" />
              </div>
              <div className="glass-input-group">
                <label>Body Text</label>
                <textarea className="glass-input glass-textarea" value={get('landing_cta_card_2_text', '')} onChange={e => set('landing_cta_card_2_text', e.target.value)} />
              </div>
              <div className="glass-input-group">
                <label>Button Text</label>
                <input className="glass-input" value={get('landing_cta_card_2_button', '')} onChange={e => set('landing_cta_card_2_button', e.target.value)} placeholder="Sign In" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer Tab ── */}
      {activeTab === 'footer' && (
        <div className="glass-card platform-landing-section">
          <h3 className="platform-landing-section-title"><Icon icon="lucide:anchor" /> Footer Section</h3>
          <p className="platform-landing-hint">The footer at the very bottom of the landing page.</p>

          <div className="glass-input-group" style={{ marginBottom: 20 }}>
            <label>Footer Tagline</label>
            <input className="glass-input" value={get('landing_footer_text', '')} onChange={e => set('landing_footer_text', e.target.value)} placeholder="Empowering teams with modern HR tools." />
          </div>

          <div className="platform-landing-list-header">
            <span>Footer Links ({footerLinks.length})</span>
            <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={addFooterLink}>
              <Icon icon="lucide:plus" size={14} /> Add Link
            </button>
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
                <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => removeFooterLink(i)}>
                  <Icon icon="lucide:trash-2" size={14} />
                </button>
              </div>
            ))}
            {footerLinks.length === 0 && (
              <div className="platform-empty-state small"><p>No footer links yet.</p></div>
            )}
          </div>
        </div>
      )}

      {/* ── Visibility Tab ── */}
      {activeTab === 'visibility' && (
        <div className="glass-card platform-landing-section">
          <h3 className="platform-landing-section-title"><Icon icon="lucide:eye" /> Section Visibility</h3>
          <p className="platform-landing-hint">Show or hide individual sections of the landing page without deleting their content.</p>

          <div className="platform-landing-toggles">
            <label className="platform-landing-toggle">
              <input type="checkbox" checked={get('landing_show_features', '1') === '1'} onChange={e => set('landing_show_features', e.target.checked ? '1' : '0')} />
              <div className="platform-landing-toggle-info">
                <strong>Show Features Section</strong>
                <span>The grid of feature cards</span>
              </div>
            </label>
            <label className="platform-landing-toggle">
              <input type="checkbox" checked={get('landing_show_how_it_works', '1') === '1'} onChange={e => set('landing_show_how_it_works', e.target.checked ? '1' : '0')} />
              <div className="platform-landing-toggle-info">
                <strong>Show How It Works</strong>
                <span>The numbered stepper section</span>
              </div>
            </label>
            <label className="platform-landing-toggle">
              <input type="checkbox" checked={get('landing_show_plans', '1') === '1'} onChange={e => set('landing_show_plans', e.target.checked ? '1' : '0')} />
              <div className="platform-landing-toggle-info">
                <strong>Show Pricing Section</strong>
                <span>The subscription plans grid</span>
              </div>
            </label>
            <label className="platform-landing-toggle">
              <input type="checkbox" checked={get('landing_show_cta_cards', '1') === '1'} onChange={e => set('landing_show_cta_cards', e.target.checked ? '1' : '0')} />
              <div className="platform-landing-toggle-info">
                <strong>Show CTA Cards</strong>
                <span>The register / sign-in cards</span>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

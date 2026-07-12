import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function LandingHome() {
  const [s, setS] = useState({});

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  const g = (key, fallback) => s[key] || fallback;
  const navTitle = g('landing_nav_title', g('company_name', 'WorkTrack'));

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-bg">
          <div className="landing-hero-gradient" />
          <div className="landing-hero-orb landing-hero-orb-1" />
          <div className="landing-hero-orb landing-hero-orb-2" />
          <div className="landing-hero-orb landing-hero-orb-3" />
          <div className="landing-hero-grid" />
        </div>
        <div className="landing-hero-content">
          <img src={s.platform_logo || '/logo.svg'} alt={navTitle} className="landing-hero-logo" />
          {g('landing_hero_badge', '') && (
            <div className="landing-hero-badge">{g('landing_hero_badge', 'HR Management Platform')}</div>
          )}
          <h1>{g('landing_hero_title', 'Simplify Your HR Operations in One Place')}</h1>
          <p>{g('landing_hero_subtitle', 'Track attendance, manage leaves, streamline recruitment, and empower your team.')}</p>
          <div className="landing-hero-actions">
            <Link to="/tenant-register" className="landing-btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {g('landing_cta_text', 'Start Your Company')}
            </Link>
            <Link to="/login" className="landing-btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              {g('landing_cta_secondary_text', 'Sign In')}
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="landing-stats-section">
        <div className="landing-stats-grid">
          <div className="landing-stat-card">
            <div className="landing-stat-number">14+</div>
            <div className="landing-stat-label">HR Modules</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-number">99.9%</div>
            <div className="landing-stat-label">Uptime</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-number">24/7</div>
            <div className="landing-stat-label">Support</div>
          </div>
          <div className="landing-stat-card">
            <div className="landing-stat-number">SOC2</div>
            <div className="landing-stat-label">Compliant</div>
          </div>
        </div>
      </section>

      {/* Quick Features Preview */}
      <section className="landing-preview-section">
        <div className="landing-section-header">
          <h2>Powerful HR Tools</h2>
          <p>Everything you need to manage your workforce efficiently</p>
        </div>
        <div className="landing-preview-grid">
          {[
            { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Smart Attendance', desc: 'GPS, QR codes, and automated tracking.', color: '#6366f1' },
            { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', title: 'Team Management', desc: 'Organize, track, and grow your team.', color: '#22c55e' },
            { icon: 'M18 20V10 M12 20V4 M6 20v-6', title: 'Live Analytics', desc: 'Real-time reports and insights.', color: '#f59e0b' },
          ].map((f, i) => (
            <Link key={i} to="/features" className="landing-preview-card">
              <div className="landing-preview-icon" style={{ background: `${f.color}15`, color: f.color }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <span className="landing-preview-link">Learn more &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-home-cta">
        <div className="landing-home-cta-content">
          <h2>Ready to Transform Your HR?</h2>
          <p>Join teams that use WorkTrack to streamline their operations.</p>
          <div className="landing-hero-actions">
            <Link to="/tenant-register" className="landing-btn-primary">
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
            <Link to="/pricing" className="landing-btn-secondary">View Pricing</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import useScrollReveal from '../hooks/useScrollReveal';

const DEFAULT_FEATURES = [
  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Attendance Tracking', desc: 'Real-time attendance tracking with geofence support, QR codes, and missing sign-out alerts.', color: '#6366f1' },
  { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75', title: 'Leave Management', desc: 'Comprehensive leave management with approval workflows and balance tracking.', color: '#22c55e' },
  { icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8', title: 'HR & People Ops', desc: 'Employee profiles, organization charts, documents, contracts, and checklists in one place.', color: '#3b82f6' },
  { icon: 'M2 7 20 7 20 21 2 21z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16', title: 'Recruitment ATS', desc: 'Full applicant tracking system with candidate pipeline, interview scheduling, and offer management.', color: '#a78bfa' },
  { icon: 'M12 20V10 M18 20V4 M6 20v-6', title: 'Reports & Analytics', desc: 'Detailed reports and analytics for attendance, headcount, and audit compliance.', color: '#f59e0b' },
  { icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', title: 'Security & RBAC', desc: 'Role-based access control with granular permissions and audit trails for every action.', color: '#f472b6' },
];

const FEATURE_CATEGORIES = [
  { key: 'all', label: 'All Features' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'hr', label: 'HR & People' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'security', label: 'Security' },
];

const CATEGORY_MAP = {
  'Attendance Tracking': 'attendance',
  'Leave Management': 'attendance',
  'HR & People Ops': 'hr',
  'Recruitment ATS': 'recruitment',
  'Reports & Analytics': 'hr',
  'Security & RBAC': 'security',
};

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function LandingFeatures() {
  const [s, setS] = useState({});
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  const g = (key, fallback) => s[key] || fallback;
  const features = (parseJSON(g('landing_features_list', null), { items: DEFAULT_FEATURES }).items) || DEFAULT_FEATURES;

  const filteredFeatures = activeCategory === 'all'
    ? features
    : features.filter(f => CATEGORY_MAP[f.title] === activeCategory);

  // Scroll reveal
  const heroRef = useScrollReveal({ margin: '-10% 0px' });
  const catsRef = useScrollReveal();
  const gridRef = useScrollReveal();

  // Reset category on route change
  useEffect(() => {
    setActiveCategory('all');
  }, [location.pathname]);

  return (
    <div className="landing-page">
      <ParticlesBackground count={30} className="landing-page-particles" />

      {/* Page Hero */}
      <section className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div ref={heroRef} className="landing-page-hero-content">
          <div className="landing-page-badge">FEATURES</div>
          <h1>{g('landing_features_title', 'Everything You Need to Run Your Team')}</h1>
          <p>{g('landing_features_subtitle', 'Powerful tools designed to make HR management effortless')}</p>
        </div>
      </section>

      {/* Category Tabs */}
      <section ref={catsRef} className="landing-features" style={{ paddingTop: 40 }}>
        <div className="landing-section-header">
          <div style={{display:'flex',gap:'8px',justifyContent:'center',flexWrap:'wrap',marginTop:'24px'}}>
            {FEATURE_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                className={`landing-category-tab ${activeCategory === cat.key ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '8px 20px',
                  border: '1px solid var(--landing-card-border)',
                  background: activeCategory === cat.key ? 'var(--landing-accent)' : 'var(--landing-card-bg)',
                  color: activeCategory === cat.key ? '#fff' : 'var(--landing-text-secondary)',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Grid */}
        <div ref={gridRef} className="landing-features-grid landing-features-grid-large">
          {filteredFeatures.map((f, i) => (
            <TiltCard key={i} maxTilt={8} scale={1.015} className="landing-feature-card-wrapper">
              <div className="landing-feature-card landing-feature-card-large">
                <div className="landing-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="landing-page-cta">
        <h2>See It in Action</h2>
        <p>Start your free trial and explore all features.</p>
        <div className="landing-hero-actions">
          <Link to="/tenant-register" className="landing-btn-primary">
            Start Free Trial
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <Link to="/pricing" className="landing-btn-secondary">View Pricing</Link>
        </div>
      </section>
    </div>
  );
}
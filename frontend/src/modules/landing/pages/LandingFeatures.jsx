// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_FEATURES = [
  { icon: 'lucide:clock', title: 'Attendance Tracking', desc: 'Real-time attendance tracking with geofence support, QR codes, and missing sign-out alerts.' },
  { icon: 'lucide:calendar', title: 'Leave Management', desc: 'Comprehensive leave management with approval workflows and balance tracking.' },
  { icon: 'lucide:users', title: 'HR & People Ops', desc: 'Employee profiles, organization charts, documents, contracts, and checklists in one place.' },
  { icon: 'lucide:briefcase', title: 'Recruitment ATS', desc: 'Full applicant tracking system with candidate pipeline, interview scheduling, and offer management.' },
  { icon: 'lucide:bar-chart-3', title: 'Reports & Analytics', desc: 'Detailed reports and analytics for attendance, headcount, and audit compliance.' },
  { icon: 'lucide:shield', title: 'Security & RBAC', desc: 'Role-based access control with granular permissions and audit trails for every action.' },
];

const FEATURE_COLORS = ['#818cf8', '#22c55e', '#f59e0b', '#3b82f6', '#a78bfa', '#f472b6'];

function lucideIcon(name) {
  const paths = {
    'lucide:clock': <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    'lucide:calendar': <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    'lucide:users': <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    'lucide:briefcase': <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    'lucide:bar-chart-3': <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
    'lucide:shield': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
  };
  return paths[name] || paths['lucide:clock'];
}

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function LandingFeatures() {
  const [s, setS] = useState({});

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  const g = (key, fallback) => s[key] || fallback;
  const features = (parseJSON(g('landing_features_list', null), { items: DEFAULT_FEATURES }).items) || DEFAULT_FEATURES;

  return (
    <div className="landing-page">
      <div className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div className="landing-page-hero-content">
          <div className="landing-page-badge">FEATURES</div>
          <h1>{g('landing_features_title', 'Everything You Need to Run Your Team')}</h1>
          <p>{g('landing_features_subtitle', 'Powerful tools designed to make HR management effortless')}</p>
        </div>
      </div>

      <section className="landing-features">
        <div className="landing-features-grid landing-features-grid-large">
          {features.map((f, i) => (
            <div key={i} className="landing-feature-card landing-feature-card-large">
              <div className="landing-feature-icon" style={{ background: `rgba(${i % 2 ? '34,197,94' : '99,102,241'},0.1)`, color: FEATURE_COLORS[i % FEATURE_COLORS.length] }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {lucideIcon(f.icon)}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

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

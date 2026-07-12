// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import MagneticButton from '../components/MagneticButton';
import useScrollReveal from '../hooks/useScrollReveal';

const ICON_SVG = {
  'lucide:shield': <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  'lucide:shield-check': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></>,
  'lucide:users': <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  'lucide:user-check': <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></>,
  'lucide:user-plus': <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
  'lucide:briefcase': <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
  'lucide:bar-chart-3': <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
  'lucide:bar-chart-2': <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
  'lucide:clock': <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  'lucide:calendar': <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  'lucide:calendar-check': <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 12 18 16 14"/></>,
  'lucide:rocket': <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-1.66.5-3-1.5-1-4-.5-5 1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
  'lucide:check-circle': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
};

const SVG_WRAP_PROPS = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };
const SVG_SMALL_PROPS = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

function FeatureIcon({ icon, color, size = 26 }) {
  const svgProps = size <= 16 ? SVG_SMALL_PROPS : SVG_WRAP_PROPS;
  const iconContent = ICON_SVG[icon];
  if (iconContent) {
    return (
      <svg {...svgProps} stroke={color} strokeWidth={size <= 16 ? '2' : '1.5'}>
        {iconContent}
      </svg>
    );
  }
  return (
    <svg {...svgProps} stroke={color} strokeWidth={size <= 16 ? '2' : '1.5'}>
      <circle cx="12" cy="12" r="10"/>
    </svg>
  );
}

const DEFAULT_FEATURES = [
  {
    icon: 'lucide:shield',
    title: 'Attendance Tracking',
    desc: 'Real-time attendance with GPS geofence, QR codes, biometric integration, and automated missing sign-out alerts.',
    color: '#6366f1',
    category: 'attendance',
    highlights: ['GPS & Geofence', 'QR Check-in', 'Auto Alerts', 'Overtime Tracking'],
  },
  {
    icon: 'lucide:users',
    title: 'Leave Management',
    desc: 'Comprehensive leave policies, approval workflows, balance tracking, and calendar integration.',
    color: '#22c55e',
    category: 'attendance',
    highlights: ['Custom Policies', 'Approval Flows', 'Balance Tracking', 'Calendar Sync'],
  },
  {
    icon: 'lucide:user-check',
    title: 'HR & People Ops',
    desc: 'Employee profiles, org charts, document vault, contracts, onboarding checklists, and offboarding workflows.',
    color: '#3b82f6',
    category: 'hr',
    highlights: ['Org Chart', 'Document Vault', 'Onboarding', 'Contract Mgmt'],
  },
  {
    icon: 'lucide:briefcase',
    title: 'Recruitment ATS',
    desc: 'Full applicant tracking with drag-and-drop pipeline, interview scheduling, scorecards, and offer management.',
    color: '#a78bfa',
    category: 'recruitment',
    highlights: ['Pipeline View', 'Interview Sched.', 'Scorecards', 'Offer Letters'],
  },
  {
    icon: 'lucide:bar-chart-3',
    title: 'Reports & Analytics',
    desc: 'Real-time dashboards, attendance trends, headcount reports, compliance audits, and custom report builder.',
    color: '#f59e0b',
    category: 'hr',
    highlights: ['Live Dashboards', 'Trend Analysis', 'Export Excel/PDF', 'Audit Reports'],
  },
  {
    icon: 'lucide:shield-check',
    title: 'Security & RBAC',
    desc: 'Granular role-based permissions, audit trails, SSO integration, 2FA, and data encryption at rest.',
    color: '#f472b6',
    category: 'security',
    highlights: ['RBAC Permissions', 'Audit Trails', 'SSO / 2FA', 'AES-256 Encryption'],
  },
];

const FEATURE_CATEGORIES = [
  { key: 'all', label: 'All Features', icon: null },
  { key: 'attendance', label: 'Attendance & Leave', icon: 'lucide:shield' },
  { key: 'hr', label: 'HR & People', icon: 'lucide:users' },
  { key: 'recruitment', label: 'Recruitment', icon: 'lucide:briefcase' },
  { key: 'security', label: 'Security', icon: 'lucide:shield-check' },
];

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function LandingFeatures() {
  const [s, setS] = useState({});
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState('all');
  const { ref: heroRef, inView: heroInView } = useScrollReveal({ margin: '-10% 0px' });
  const { ref: gridRef, inView: gridInView } = useScrollReveal();

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setActiveCategory('all');
  }, [location.pathname]);

  const g = (key, fallback) => s[key] || fallback;
  const features = (parseJSON(g('landing_features_list', null), { items: DEFAULT_FEATURES }).items) || DEFAULT_FEATURES;

  const normalizedFeatures = features.map((f, i) => ({
    ...DEFAULT_FEATURES[i % DEFAULT_FEATURES.length],
    ...f,
    category: f.category || DEFAULT_FEATURES[i % DEFAULT_FEATURES.length].category,
    highlights: f.highlights || DEFAULT_FEATURES[i % DEFAULT_FEATURES.length].highlights,
    color: f.color || DEFAULT_FEATURES[i % DEFAULT_FEATURES.length].color,
  }));

  const filteredFeatures = activeCategory === 'all'
    ? normalizedFeatures
    : normalizedFeatures.filter(f => f.category === activeCategory);

  return (
    <div className="landing-page">
      <ParticlesBackground count={30} className="landing-page-particles" />

      <section className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div ref={heroRef} className={`landing-page-hero-content ${heroInView ? 'visible' : ''}`}>
          <div className="landing-page-badge">FEATURES</div>
          <h1>{g('landing_features_title', 'Everything You Need to Run Your Team')}</h1>
          <p>{g('landing_features_subtitle', 'Powerful tools designed to make HR management effortless')}</p>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-section-header">
          <h2>Explore Our Modules</h2>
          <p>Each module is designed to work independently or together as a complete HR platform</p>
        </div>

        <div className="feat-tabs-wrap">
          {FEATURE_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              className={`feat-tab ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.icon && (
                <span className="feat-tab-icon">
                  <FeatureIcon icon={cat.icon} color="currentColor" size={14} />
                </span>
              )}
              <span>{cat.label}</span>
              {activeCategory === cat.key && (
                <motion.div
                  className="feat-tab-indicator"
                  layoutId="feat-tab"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <div ref={gridRef} className={`feat-grid ${gridInView ? 'visible' : ''}`}>
          {filteredFeatures.map((f) => (
            <TiltCard key={f.title} maxTilt={6} scale={1.01}>
              <div className="feat-card">
                <div className="feat-card-glow" style={{ background: `radial-gradient(circle at 30% 0%, ${f.color}18 0%, transparent 60%)` }} />
                <div className="feat-card-icon" style={{ background: `${f.color}14`, boxShadow: `0 0 20px ${f.color}10` }}>
                  <FeatureIcon icon={f.icon} color={f.color} size={26} />
                </div>
                <h3 className="feat-card-title">{f.title}</h3>
                <p className="feat-card-desc">{f.desc}</p>
                <div className="feat-card-tags">
                  {f.highlights.map((h) => (
                    <span key={h} className="feat-tag" style={{ borderColor: `${f.color}25`, color: f.color }}>
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      <section className="landing-page-cta">
        <h2>See It in Action</h2>
        <p>Start your free trial and explore all features.</p>
        <div className="landing-hero-actions">
          <MagneticButton strength={6}>
            <Link to="/tenant-register" className="landing-btn-primary">
              Start Free Trial
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </MagneticButton>
          <MagneticButton strength={6}>
            <Link to="/pricing" className="landing-btn-secondary">View Pricing</Link>
          </MagneticButton>
        </div>
      </section>
    </div>
  );
}

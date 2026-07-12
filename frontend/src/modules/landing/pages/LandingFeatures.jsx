// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import MagneticButton from '../components/MagneticButton';
import useScrollReveal from '../hooks/useScrollReveal';

const DEFAULT_FEATURES = [
  {
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    title: 'Attendance Tracking',
    desc: 'Real-time attendance with GPS geofence, QR codes, biometric integration, and automated missing sign-out alerts.',
    color: '#6366f1',
    category: 'attendance',
    highlights: ['GPS & Geofence', 'QR Check-in', 'Auto Alerts', 'Overtime Tracking'],
  },
  {
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    title: 'Leave Management',
    desc: 'Comprehensive leave policies, approval workflows, balance tracking, and calendar integration.',
    color: '#22c55e',
    category: 'attendance',
    highlights: ['Custom Policies', 'Approval Flows', 'Balance Tracking', 'Calendar Sync'],
  },
  {
    icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    title: 'HR & People Ops',
    desc: 'Employee profiles, org charts, document vault, contracts, onboarding checklists, and offboarding workflows.',
    color: '#3b82f6',
    category: 'hr',
    highlights: ['Org Chart', 'Document Vault', 'Onboarding', 'Contract Mgmt'],
  },
  {
    icon: 'M2 7 20 7 20 21 2 21z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
    title: 'Recruitment ATS',
    desc: 'Full applicant tracking with drag-and-drop pipeline, interview scheduling, scorecards, and offer management.',
    color: '#a78bfa',
    category: 'recruitment',
    highlights: ['Pipeline View', 'Interview Sched.', 'Scorecards', 'Offer Letters'],
  },
  {
    icon: 'M12 20V10 M18 20V4 M6 20v-6',
    title: 'Reports & Analytics',
    desc: 'Real-time dashboards, attendance trends, headcount reports, compliance audits, and custom report builder.',
    color: '#f59e0b',
    category: 'hr',
    highlights: ['Live Dashboards', 'Trend Analysis', 'Export Excel/PDF', 'Audit Reports'],
  },
  {
    icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    title: 'Security & RBAC',
    desc: 'Granular role-based permissions, audit trails, SSO integration, 2FA, and data encryption at rest.',
    color: '#f472b6',
    category: 'security',
    highlights: ['RBAC Permissions', 'Audit Trails', 'SSO / 2FA', 'AES-256 Encryption'],
  },
];

const FEATURE_CATEGORIES = [
  { key: 'all', label: 'All Features', icon: null },
  { key: 'attendance', label: 'Attendance & Leave', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { key: 'hr', label: 'HR & People', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { key: 'recruitment', label: 'Recruitment', icon: 'M2 7 20 7 20 21 2 21z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' },
  { key: 'security', label: 'Security', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
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

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  const g = (key, fallback) => s[key] || fallback;
  const features = (parseJSON(g('landing_features_list', null), { items: DEFAULT_FEATURES }).items) || DEFAULT_FEATURES;

  // Normalize features from API (may not have category/highlights)
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

  // Scroll reveal
  const heroRef = useScrollReveal({ margin: '-10% 0px' });
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

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-section-header">
          <h2>Explore Our Modules</h2>
          <p>Each module is designed to work independently or together as a complete HR platform</p>
        </div>

        {/* Category Tabs */}
        <div className="feat-tabs-wrap">
          {FEATURE_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              className={`feat-tab ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.icon && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={cat.icon} />
                </svg>
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

        {/* Feature Grid */}
        <div ref={gridRef} className="feat-grid">
          <AnimatePresence mode="popLayout">
            {filteredFeatures.map((f) => (
              <motion.div
                key={f.title}
                layout
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -16 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <TiltCard maxTilt={6} scale={1.01}>
                  <div className="feat-card">
                    <div className="feat-card-glow" style={{ background: `radial-gradient(circle at 30% 0%, ${f.color}18 0%, transparent 60%)` }} />
                    <div className="feat-card-icon" style={{ background: `${f.color}14`, color: f.color, boxShadow: `0 0 20px ${f.color}10` }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={f.icon} />
                      </svg>
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
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* CTA */}
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

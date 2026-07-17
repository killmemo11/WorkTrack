// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import './../styles/landing.css';

// ── Default content (used as fallback if settings missing) ──
const DEFAULT_FEATURES = [
  { icon: 'lucide:clock', title: 'Attendance Tracking', desc: 'Real-time attendance tracking with geofence support and missing sign-out alerts.' },
  { icon: 'lucide:calendar', title: 'Leave Management', desc: 'Comprehensive leave management with approval workflows and balance tracking.' },
  { icon: 'lucide:users', title: 'HR & People Ops', desc: 'Employee profiles, organization charts, documents, contracts, and checklists in one place.' },
  { icon: 'lucide:briefcase', title: 'Recruitment ATS', desc: 'Full applicant tracking system with candidate pipeline, interview scheduling, and offer management.' },
  { icon: 'lucide:bar-chart-3', title: 'Reports & Analytics', desc: 'Detailed reports and analytics for attendance, headcount, and audit compliance.' },
  { icon: 'lucide:shield', title: 'Security & RBAC', desc: 'Role-based access control with granular permissions and audit trails for every action.' },
];
const DEFAULT_STEPS = [
  { icon: 'lucide:user-plus', title: 'Register Your Company', desc: 'Create your account and tell us about your team.' },
  { icon: 'lucide:check-circle', title: 'Get Approved', desc: 'Our team reviews and approves your workspace within 24 hours.' },
  { icon: 'lucide:rocket', title: 'Set Up & Go', desc: 'Add your employees, configure settings, and start managing.' },
];
const FEATURE_COLORS = ['#818cf8', '#22c55e', '#f59e0b', '#3b82f6', '#a78bfa', '#f472b6'];
const STEP_ICONS = ['lucide:user-plus', 'lucide:check-circle', 'lucide:rocket'];

function lucideIcon(name) {
  const paths = {
    'lucide:clock': <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    'lucide:calendar': <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    'lucide:calendar-check': <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 12 18 16 14"/></>,
    'lucide:users': <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    'lucide:briefcase': <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    'lucide:bar-chart-3': <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
    'lucide:shield': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    'lucide:shield-check': <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></>,
    'lucide:user-plus': <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
    'lucide:check-circle': <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    'lucide:rocket': <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-1.66.5-3-1.5-1-4-.5-5 1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
  };
  return paths[name] || paths['lucide:clock'];
}

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function Landing() {
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState('monthly');
  const [s, setS] = useState({});

  useEffect(() => {
    fetch('/api/platform/public/plans')
      .then((res) => res.json())
      .then((data) => setPlans(data))
      .catch(() => {});

    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data))
      .catch(() => {});
  }, []);

  const g = (key, fallback) => s[key] || fallback;
  const navTitle = g('landing_nav_title', g('company_name', 'WorkTrack'));
  const features = (parseJSON(g('landing_features_list', null), { items: DEFAULT_FEATURES }).items) || DEFAULT_FEATURES;
  const steps = (parseJSON(g('landing_steps_list', null), { steps: DEFAULT_STEPS }).steps) || DEFAULT_STEPS;
  const footerLinks = (parseJSON(g('landing_footer_links', null), { links: [] }).links) || [];
  const showFeatures = g('landing_show_features', '1') === '1';
  const showSteps = g('landing_show_how_it_works', '1') === '1';
  const showCTA = g('landing_show_cta_cards', '1') === '1';
  const showPlans = g('landing_show_plans', '1') === '1';

  const formatPrice = (price, currency) => {
    if (price === 0) return 'Free';
    const symbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: '﷼', AED: 'AED' };
    return `${symbols[currency] || '$'}${price}`;
  };

  return (
    <div className="landing-page">
      {/* ─── Navbar ─── */}
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-brand">
          {s.platform_logo ? (
            <img src={s.platform_logo} alt={navTitle} className="landing-nav-logo" />
          ) : (
            <img src="/logo.svg" alt={navTitle} className="landing-nav-logo" />
          )}
          <span className="landing-nav-name">{navTitle}</span>
        </Link>
        <div className="landing-nav-links">
          {footerLinks.map((l, i) => l.url !== '/' && (
            <Link key={i} to={l.url} className="landing-nav-link">{l.label}</Link>
          ))}
          <Link to="/tenant-register" className="landing-nav-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {g('landing_cta_text', 'Get Started')}
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* ─── Hero ─── */}
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

      {/* ─── Features ─── */}
      {showFeatures && (
        <section className="landing-features">
          <div className="landing-section-header">
            <h2>{g('landing_features_title', 'Everything You Need to Run Your Team')}</h2>
            <p>{g('landing_features_subtitle', 'Powerful tools designed to make HR management effortless')}</p>
          </div>

          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div key={i} className="landing-feature-card">
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
      )}

      {/* ─── How It Works ─── */}
      {showSteps && (
        <section className="landing-how">
          <div className="landing-section-header">
            <h2>{g('landing_steps_title', 'Get Started in 3 Simple Steps')}</h2>
            <p>{g('landing_steps_subtitle', 'No technical expertise required')}</p>
          </div>

          <div className="landing-steps">
            {steps.map((step, i) => (
              <div key={i} className="landing-step">
                <div className="landing-step-number">{i + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Pricing ─── */}
      {showPlans && plans.length > 0 && (
        <section className="landing-pricing">
          <div className="landing-section-header">
            <h2>Simple, Transparent Pricing</h2>
            <p>Choose the plan that fits your team. Upgrade or downgrade anytime.</p>
          </div>

          <div className="landing-billing-toggle">
            <button className={`billing-btn ${billing === 'monthly' ? 'active' : ''}`} onClick={() => setBilling('monthly')}>Monthly</button>
            <button className={`billing-btn ${billing === 'yearly' ? 'active' : ''}`} onClick={() => setBilling('yearly')}>
              Yearly
              <span className="billing-save">Save 17%</span>
            </button>
          </div>

          <div className="landing-plans-grid">
            {plans.map((plan, idx) => {
              const planFeatures = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : [];
              const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
              return (
                <div key={plan.id} className={`landing-plan-card ${idx === 1 ? 'featured' : ''}`}>
                  {idx === 1 && <div className="plan-badge">Most Popular</div>}
                  <h3>{plan.name}</h3>
                  <p className="plan-desc">{plan.description}</p>
                  <div className="plan-price">
                    <span className="plan-amount">{formatPrice(price, plan.currency)}</span>
                    {price > 0 && <span className="plan-period">/{billing === 'monthly' ? 'mo' : 'yr'}</span>}
                  </div>
                  {plan.max_employees < 9999 && (
                    <div className="plan-limit">Up to {plan.max_employees} employees</div>
                  )}
                  {plan.max_employees >= 9999 && (
                    <div className="plan-limit">Unlimited employees</div>
                  )}
                  {plan.trial_days > 0 && (
                    <div className="plan-trial">{plan.trial_days}-day free trial</div>
                  )}
                  <ul className="plan-features">
                    {planFeatures.map((f, i) => (
                      <li key={i}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/tenant-register" className={idx === 1 ? 'landing-btn-primary plan-cta' : 'landing-btn-secondary plan-cta'}>
                    Get Started
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── CTA Cards ─── */}
      {showCTA && (
        <section className="landing-cta-section">
          <div className="landing-section-header">
            <h2>{g('landing_cta_card_1_title', 'Ready to Get Started?')}</h2>
            <p>{g('landing_cta_card_2_title', 'Already Have an Account?')}</p>
          </div>

          <div className="landing-cta-cards">
            <div className="landing-cta-card">
              <div className="landing-cta-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3>{g('landing_cta_card_1_title', 'Register Your Company')}</h3>
              <p>{g('landing_cta_card_1_text', 'Create your company workspace and start your free trial today. No credit card required.')}</p>
              <Link to="/tenant-register" className="landing-btn-primary">
                {g('landing_cta_card_1_button', 'Register Your Company')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>

            <div className="landing-cta-card">
              <div className="landing-cta-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h3>{g('landing_cta_card_2_title', 'Already Have an Account?')}</h3>
              <p>{g('landing_cta_card_2_text', 'Sign in to your workspace and pick up right where you left off.')}</p>
              <Link to="/login" className="landing-btn-secondary">
                {g('landing_cta_card_2_button', 'Sign In')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <img src={s.platform_logo || '/logo.svg'} alt={navTitle} className="landing-footer-logo" />
            <span>{navTitle}</span>
          </div>
          <div className="landing-footer-links">
            {footerLinks.map((l, i) => (
              <Link key={i} to={l.url}>{l.label}</Link>
            ))}
          </div>
        </div>
        <div className="landing-footer-bottom">
          {g('landing_footer_text', 'Empowering teams with modern HR tools.')} &copy; {new Date().getFullYear()} {navTitle}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
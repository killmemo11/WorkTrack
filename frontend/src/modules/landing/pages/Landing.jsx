// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import './../styles/landing.css';

const featureList = [
  {
    icon: 'lucide:clock',
    color: '#818cf8',
    bgColor: 'rgba(99,102,241,0.1)',
    title: 'Attendance Tracking',
    desc: 'Real-time clock-in/out with geofencing. Office vs remote work tracking with automatic status detection.',
  },
  {
    icon: 'lucide:calendar-check',
    color: '#22c55e',
    bgColor: 'rgba(34,197,94,0.1)',
    title: 'Leave Management',
    desc: 'Streamlined leave requests with multi-level approvals. Balance tracking, holiday calendars, and automated accruals.',
  },
  {
    icon: 'lucide:users',
    color: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.1)',
    title: 'HR & People Ops',
    desc: 'Employee profiles, organization charts, bulk onboarding, document management, contract templates, and checklists.',
  },
  {
    icon: 'lucide:briefcase',
    color: '#3b82f6',
    bgColor: 'rgba(59,130,246,0.1)',
    title: 'Recruitment ATS',
    desc: 'Full-cycle recruitment — job postings, candidate pipeline, interview scheduling, offers, and custom workflows.',
  },
  {
    icon: 'lucide:bar-chart-3',
    color: '#a78bfa',
    bgColor: 'rgba(167,139,250,0.1)',
    title: 'Reports & Analytics',
    desc: 'Attendance reports, headcount insights, audit logs, and compliance exports — all in one place.',
  },
  {
    icon: 'lucide:shield-check',
    color: '#f472b6',
    bgColor: 'rgba(244,114,182,0.1)',
    title: 'Security & RBAC',
    desc: 'Multi-phase RBAC with fine-grained permissions. Audit trails, service toggles, and forced password policies.',
  },
];

const steps = [
  {
    num: 1,
    title: 'Register Your Company',
    desc: 'Fill out a quick form with your company details. We review every request to ensure quality onboarding.',
  },
  {
    num: 2,
    title: 'Get Approved',
    desc: 'Our platform team reviews and activates your tenant. You receive a secure magic link via email.',
  },
  {
    num: 3,
    title: 'Set Up & Go',
    desc: 'Set your password, configure departments, invite your team, and start using WorkTrack immediately.',
  },
];

export default function Landing() {
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState('monthly');

  useEffect(() => {
    fetch('/api/platform/public/plans')
      .then((res) => res.json())
      .then((data) => setPlans(data))
      .catch(() => {});
  }, []);

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
          <img src="/logo.svg" alt="WorkTrack" className="landing-nav-logo" />
          <span className="landing-nav-name">WorkTrack</span>
        </Link>
        <div className="landing-nav-links">
          <Link to="/careers" className="landing-nav-link">Careers</Link>
          <Link to="/login" className="landing-nav-link">Sign In</Link>
          <Link to="/tenant-register" className="landing-nav-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Get Started
          </Link>
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
          <img src="/logo.svg" alt="WorkTrack" className="landing-hero-logo" />
          <div className="landing-hero-badge">HR Management Platform</div>
          <h1>
            Simplify Your <span>HR Operations</span> in One Place
          </h1>
          <p>
            Track attendance, manage leaves, run recruitment pipelines, and generate HR insights —
            all from a single, secure platform built for modern teams.
          </p>
          <div className="landing-hero-actions">
            <Link to="/tenant-register" className="landing-btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Start Your Company
            </Link>
            <Link to="/login" className="landing-btn-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="landing-features">
        <div className="landing-section-header">
          <h2>Everything You Need to Run HR</h2>
          <p>One platform. Six modules. Zero complexity.</p>
        </div>

        <div className="landing-features-grid">
          {featureList.map((f) => (
            <div key={f.title} className="landing-feature-card">
              <div className="landing-feature-icon" style={{ background: f.bgColor, color: f.color }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {f.icon === 'lucide:clock' && <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>}
                  {f.icon === 'lucide:calendar-check' && <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 12 18 16 14"/></>}
                  {f.icon === 'lucide:users' && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                  {f.icon === 'lucide:briefcase' && <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>}
                  {f.icon === 'lucide:bar-chart-3' && <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>}
                  {f.icon === 'lucide:shield-check' && <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></>}
                </svg>
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="landing-how">
        <div className="landing-section-header">
          <h2>Get Started in 3 Simple Steps</h2>
          <p>From registration to full deployment — fast and guided.</p>
        </div>

        <div className="landing-steps">
          {steps.map((s) => (
            <div key={s.num} className="landing-step">
              <div className="landing-step-number">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Pricing ─── */}
      {plans.length > 0 && (
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
              const features = plan.features ? (typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features) : [];
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
                    {features.map((f, i) => (
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
      <section className="landing-cta-section">
        <div className="landing-section-header">
          <h2>Ready to Work?</h2>
          <p>Two ways to join WorkTrack depending on your role.</p>
        </div>

        <div className="landing-cta-cards">
          <div className="landing-cta-card">
            <div className="landing-cta-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <h3>Register Your Company</h3>
            <p>Company owners & HR teams — sign up your organization and get a dedicated tenant with full admin controls.</p>
            <Link to="/tenant-register" className="landing-btn-primary">
              Register Company
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
            <h3>Already Have an Account?</h3>
            <p>Employees and admins — sign in to your existing tenant or register as an employee if your company uses WorkTrack.</p>
            <Link to="/login" className="landing-btn-secondary">
              Sign In
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <img src="/logo.svg" alt="WorkTrack" className="landing-footer-logo" />
            <span>WorkTrack</span>
          </div>
          <div className="landing-footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Employee Register</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/tenant-register">Register Company</Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          &copy; {new Date().getFullYear()} WorkTrack. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
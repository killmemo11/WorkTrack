// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import useScrollReveal from '../hooks/useScrollReveal';

const STEP_ICONS = {
  register: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></>,
  approve: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  rocket: <><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-1.66.5-3-1.5-1-4-.5-5 1z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>,
};

const DEFAULT_STEPS = [
  { stepIcon: 'register', title: 'Register Your Company', desc: 'Create your account and tell us about your team. It takes less than 5 minutes.' },
  { stepIcon: 'approve', title: 'Get Approved', desc: 'Our team reviews and approves your workspace within 24 hours.' },
  { stepIcon: 'rocket', title: 'Set Up & Go', desc: 'Add your employees, configure settings, and start managing your workforce.' },
];

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function StepIcon({ name, color }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {STEP_ICONS[name] || STEP_ICONS.rocket}
    </svg>
  );
}

export default function LandingHowItWorks() {
  const [s, setS] = useState({});
  const { ref: heroRef, inView: heroInView } = useScrollReveal({ margin: '-10% 0px' });
  const { ref: stepsRef, inView: stepsInView } = useScrollReveal();
  const { ref: ctaRef, inView: ctaInView } = useScrollReveal();

  const g = (key, fallback) => s[key] || fallback;

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then(res => res.json())
      .then(data => setS(data))
      .catch(() => {});
  }, []);

  const steps = (parseJSON(g('landing_steps_list', null), { steps: DEFAULT_STEPS }).steps) || DEFAULT_STEPS;

  const normalizedSteps = steps.map((step, i) => ({
    ...DEFAULT_STEPS[i % DEFAULT_STEPS.length],
    ...step,
    stepIcon: step.stepIcon || step.icon || DEFAULT_STEPS[i % DEFAULT_STEPS.length].stepIcon,
  }));

  return (
    <div className="landing-page">
      <ParticlesBackground count={25} className="landing-page-particles" />

      <section className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div ref={heroRef} className={`landing-page-hero-content ${heroInView ? 'visible' : ''}`}>
          <div className="landing-page-badge">HOW IT WORKS</div>
          <h1>{g('landing_steps_title', 'Get Started in 3 Simple Steps')}</h1>
          <p>{g('landing_steps_subtitle', 'No technical expertise required — just a few clicks and you\'re live.')}</p>
        </div>
      </section>

      <section ref={stepsRef} className={`landing-how ${stepsInView ? 'visible' : ''}`}>
        <div className="landing-steps-visual">
          {normalizedSteps.map((step, i) => (
            <TiltCard key={i} maxTilt={6} scale={1.01} className="landing-step-visual-wrapper">
              <div className="landing-step-visual">
                <div className="landing-step-visual-number">
                  <span>{i + 1}</span>
                  {i < normalizedSteps.length - 1 && <div className="landing-step-connector" />}
                </div>
                <div className="landing-step-visual-content">
                  <div className="landing-step-visual-icon">
                    <StepIcon name={step.stepIcon} color="var(--landing-accent-light)" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      <section ref={ctaRef} className={`landing-page-cta ${ctaInView ? 'visible' : ''}`}>
        <h2>Ready to Get Started?</h2>
        <p>Set up your workspace in minutes, not months.</p>
        <Link to="/tenant-register" className="landing-btn-primary">
          Create Your Account
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </section>
    </div>
  );
}

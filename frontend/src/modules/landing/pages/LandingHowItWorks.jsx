// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import useScrollReveal from '../hooks/useScrollReveal';

const DEFAULT_STEPS = [
  { icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', title: 'Register Your Company', desc: 'Create your account and tell us about your team. It takes less than 5 minutes.' },
  { icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14', title: 'Get Approved', desc: 'Our team reviews and approves your workspace within 24 hours.' },
  { icon: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-1.66.5-3-1.5-1-4-.5-5 1z', title: 'Set Up & Go', desc: 'Add your employees, configure settings, and start managing your workforce.' },
];

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

export default function LandingHowItWorks() {
  const [s, setS] = useState({});

  const g = (key, fallback) => s[key] || fallback;

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then(res => res.json())
      .then(data => setS(data))
      .catch(() => {});
  }, []);

  const steps = (parseJSON(g('landing_steps_list', null), { steps: DEFAULT_STEPS }).steps) || DEFAULT_STEPS;

  // Scroll reveal
  const heroRef = useScrollReveal({ margin: '-10% 0px' });
  const stepsRef = useScrollReveal();
  const ctaRef = useScrollReveal();

  return (
    <div className="landing-page">
      <ParticlesBackground count={25} className="landing-page-particles" />

      {/* Page Hero */}
      <section className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div ref={heroRef} className="landing-page-hero-content">
          <div className="landing-page-badge">HOW IT WORKS</div>
          <h1>{g('landing_steps_title', 'Get Started in 3 Simple Steps')}</h1>
          <p>{g('landing_steps_subtitle', 'No technical expertise required — just a few clicks and you\'re live.')}</p>
        </div>
      </section>

      {/* Steps */}
      <section ref={stepsRef} className="landing-how">
        <div className="landing-steps-visual">
          {steps.map((step, i) => (
            <TiltCard key={i} maxTilt={6} scale={1.01} className="landing-step-visual-wrapper">
              <div className="landing-step-visual">
                <div className="landing-step-visual-number">
                  <span>{i + 1}</span>
                  {i < steps.length - 1 && <div className="landing-step-connector" />}
                </div>
                <div className="landing-step-visual-content">
                  <div className="landing-step-visual-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={step.icon} />
                    </svg>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="landing-page-cta">
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
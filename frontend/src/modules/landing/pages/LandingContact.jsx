// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import MagneticButton from '../components/MagneticButton';
import useScrollReveal from '../hooks/useScrollReveal';

function parseJSON(val, fallback) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

const LandingContact = () => {
  const [s, setS] = useState({});
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const g = (key, fallback) => s[key] || fallback;

  useEffect(() => {
    fetch('/api/platform/public/settings')
      .then(r => r.json())
      .then(data => setS(data.settings || {}))
      .catch(() => {});
  }, []);

  const { ref: heroRef, inView: heroInView } = useScrollReveal({ margin: '-10% 0px' });
  const { ref: formRef, inView: formInView } = useScrollReveal();
  const { ref: trustRef, inView: trustInView } = useScrollReveal();

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', company: '', message: '' });
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="landing-page">
      <ParticlesBackground count={25} className="landing-page-particles" />

      {/* Page Hero */}
      <section className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div ref={heroRef} className="landing-page-hero-content">
          <div className="landing-page-badge">GET STARTED</div>
          <h1>{g('landing_contact_title', 'Ready to Transform Your HR?')}</h1>
          <p>{g('landing_contact_subtitle', 'Join teams that use WorkTrack to streamline their operations.')}</p>
        </div>
      </section>

      {/* Contact Form + CTA Cards */}
      <section ref={formRef} className="landing-cta-section">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Success Message */}
          <AnimatePresence>
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                style={{
                  marginBottom: 32,
                  padding: '16px 24px',
                  borderRadius: 14,
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#22c55e',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Message sent! We&apos;ll get back to you within 24 hours.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="landing-contact-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="landing-form-group">
                <label htmlFor="contact-name" className="landing-form-label">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="landing-form-input"
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="landing-form-group">
                <label htmlFor="contact-email" className="landing-form-label">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="landing-form-input"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>
            <div className="landing-form-group">
              <label htmlFor="contact-company" className="landing-form-label">Company</label>
              <input
                id="contact-company"
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="landing-form-input"
                placeholder="Your company name"
              />
            </div>
            <div className="landing-form-group">
              <label htmlFor="contact-message" className="landing-form-label">Message</label>
              <textarea
                id="contact-message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="landing-form-input landing-form-textarea"
                placeholder="Tell us about your team and what you're looking for..."
                rows={5}
                required
              />
            </div>
            <MagneticButton strength={6}>
              <button type="submit" className="landing-btn-primary landing-contact-submit">
                Send Message
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </MagneticButton>
          </form>
        </div>

        {/* CTA Cards */}
        <div className="landing-cta-cards" style={{ marginTop: 48, maxWidth: 800, margin: '48px auto 0' }}>
          <TiltCard maxTilt={8} scale={1.02}>
            <div className="landing-cta-card">
              <div className="landing-cta-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <h3>{g('landing_cta_card_1_title', 'Register Your Company')}</h3>
              <p>{g('landing_cta_card_1_text', 'Create your company workspace and start your free trial today. No credit card required.')}</p>
              <MagneticButton strength={6}>
                <Link to="/tenant-register" className="landing-btn-primary">
                  {g('landing_cta_card_1_button', 'Register Your Company')}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              </MagneticButton>
            </div>
          </TiltCard>

          <TiltCard maxTilt={8} scale={1.02}>
            <div className="landing-cta-card">
              <div className="landing-cta-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h3>{g('landing_cta_card_2_title', 'Already Have an Account?')}</h3>
              <p>{g('landing_cta_card_2_text', 'Sign in to your workspace and pick up right where you left off.')}</p>
              <MagneticButton strength={6}>
                <Link to="/login" className="landing-btn-secondary">
                  {g('landing_cta_card_2_button', 'Sign In')}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
              </MagneticButton>
            </div>
          </TiltCard>
        </div>
      </section>

      {/* Trust Section */}
      <section ref={trustRef} className="landing-trust">
        <div className="landing-trust-items">
          {['No credit card required', 'Setup in 30 minutes', 'Cancel anytime', '24/7 support'].map((text) => (
            <div key={text} className="landing-trust-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default LandingContact;

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import FAQAccordion from '../components/FAQAccordion';
import MagneticButton from '../components/MagneticButton';
import useScrollReveal from '../hooks/useScrollReveal';

const formatPrice = (price, currency) => {
  if (price === 0) return 'Free';
  const symbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: '﷼', AED: 'AED' };
  return `${symbols[currency] || '$'}${price}`;
};

const PRICING_FAQ = [
  { question: 'Can I change plans later?', answer: 'Yes. Upgrade or downgrade anytime from your dashboard. Changes take effect immediately with prorated billing.' },
  { question: 'Is there a free trial?', answer: 'Yes. Every paid plan comes with a 14-day free trial. No credit card required to start.' },
  { question: 'What payment methods do you accept?', answer: 'We accept all major credit cards, bank transfers, and mobile wallets. Enterprise customers can pay via invoice.' },
  { question: 'What happens when my trial ends?', answer: 'You can choose a paid plan to continue with all features, or switch to our limited free tier.' },
  { question: 'Do you offer discounts for nonprofits?', answer: 'Yes! Qualified nonprofit organizations get 50% off any paid plan. Contact sales to learn more.' },
  { question: 'Is there a minimum contract?', answer: 'No. Monthly plans cancel anytime. Annual plans are prepaid for the year with a 17% discount.' },
];

export default function LandingPricing() {
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState('monthly');
  const [s, setS] = useState({});

  const g = (key, fallback) => s[key] || fallback;

  useEffect(() => {
    fetch('/api/platform/public/plans')
      .then((res) => res.json())
      .then((data) => setPlans(Array.isArray(data) ? data : data.plans || []))
      .catch(() => {});
    fetch('/api/platform/public/settings')
      .then((res) => res.json())
      .then((data) => setS(data.settings || data))
      .catch(() => {});
  }, []);

  const { ref: heroRef, inView: heroInView } = useScrollReveal({ margin: '-10% 0px' });
  const { ref: plansRef, inView: plansInView } = useScrollReveal();
  const { ref: faqRef, inView: faqInView } = useScrollReveal();
  const { ref: ctaRef, inView: ctaInView } = useScrollReveal();

  return (
    <div className="landing-page">
      <ParticlesBackground count={30} className="landing-page-particles" />

      {/* Page Hero */}
      <section className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div ref={heroRef} className="landing-page-hero-content">
          <div className="landing-page-badge">PRICING</div>
          <h1>Simple, Transparent Pricing</h1>
          <p>Choose the plan that fits your team. Upgrade or downgrade anytime.</p>
        </div>
      </section>

      {/* Billing Toggle */}
      <div ref={plansRef} className="landing-billing-toggle">
        <button
          className={`billing-btn ${billing === 'monthly' ? 'active' : ''}`}
          onClick={() => setBilling('monthly')}
        >
          Monthly
        </button>
        <button
          className={`billing-btn ${billing === 'yearly' ? 'active' : ''}`}
          onClick={() => setBilling('yearly')}
        >
          Yearly
          <span className="billing-save">Save 17%</span>
        </button>
      </div>

      {/* Plans Grid */}
      <section className="landing-pricing">
        <div className="landing-plans-grid">
          {plans.map((plan, idx) => {
            const planFeatures = plan.features
              ? typeof plan.features === 'string'
                ? JSON.parse(plan.features)
                : plan.features
              : [];
            const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
            const isFeatured = idx === 1;
            return (
              <TiltCard key={plan.id} maxTilt={8} scale={isFeatured ? 1.01 : 1.02} className="landing-plan-card-wrapper">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={billing}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className={`landing-plan-card ${isFeatured ? 'featured' : ''}`}>
                      {isFeatured && <div className="plan-badge">Most Popular</div>}
                      <h3>{plan.name}</h3>
                      <p className="plan-desc">{plan.description}</p>
                      <div className="plan-price">
                        <span className="plan-amount">{formatPrice(price, plan.currency)}</span>
                        {price > 0 && (
                          <span className="plan-period">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                        )}
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                      <MagneticButton strength={6}>
                        <Link
                          to="/tenant-register"
                          className={isFeatured ? 'landing-btn-primary plan-cta' : 'landing-btn-secondary plan-cta'}
                        >
                          Get Started
                        </Link>
                      </MagneticButton>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </TiltCard>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section ref={faqRef} className="landing-faq">
        <div className="landing-section-header">
          <h2>Frequently Asked Questions</h2>
        </div>
        <FAQAccordion items={PRICING_FAQ} defaultOpen={-1} />
      </section>

      {/* Final CTA */}
      <section ref={ctaRef} className="landing-page-cta">
        <h2>Ready to Get Started?</h2>
        <p>Start your free trial today. No credit card required.</p>
        <MagneticButton strength={8}>
          <Link to="/tenant-register" className="landing-btn-primary">
            Start Free Trial
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
        </MagneticButton>
      </section>
    </div>
  );
}
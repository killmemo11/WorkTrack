// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ParticlesBackground from '../components/ParticlesBackground';
import TiltCard from '../components/TiltCard';
import FAQAccordion from '../components/FAQAccordion';
import TestimonialCarousel from '../components/TestimonialCarousel';
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

const COMPARISON_FEATURES = [
  { name: 'Employees', key: 'max_employees' },
  { name: 'Departments', key: 'departments' },
  { name: 'Projects', key: 'projects' },
  { name: 'Time Tracking', key: 'time_tracking' },
  { name: 'Leave Management', key: 'leave' },
  { name: 'Payroll', key: 'payroll' },
  { name: 'Reports & Analytics', key: 'reports' },
  { name: 'API Access', key: 'api' },
  { name: 'Priority Support', key: 'priority_support' },
  { name: 'Custom Branding', key: 'custom_branding' },
  { name: 'SSO / SAML', key: 'sso' },
  { name: 'Dedicated Account Manager', key: 'dedicated_manager' },
];

const PRICING_TESTIMONIALS = [
  { quote: 'WorkTrack replaced 3 separate tools for us. The pricing is transparent and the ROI was immediate.', name: 'Sarah Chen', role: 'COO, TechFlow', initials: 'SC', color: '#6366f1' },
  { quote: 'Switching from spreadsheets to WorkTrack saved us 15 hours per month on HR tasks alone.', name: 'Ahmed Hassan', role: 'HR Director, NexaCorp', initials: 'AH', color: '#10b981' },
  { quote: 'The annual plan paid for itself in the first quarter. Best investment we made this year.', name: 'Maria Santos', role: 'Finance Lead, Orbital', initials: 'MS', color: '#f59e0b' },
  { quote: 'Our team adopted WorkTrack instantly. The onboarding flow made it seamless for 200+ employees.', name: 'James Wright', role: 'CTO, Pinnacle', initials: 'JW', color: '#ec4899' },
];

const TRUST_METRICS = [
  { value: '500+', label: 'Companies' },
  { value: '50K+', label: 'Employees Managed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'Customer Rating' },
];

function CompareValue({ plan, feature }) {
  if (feature.key === 'max_employees') {
    return <span>{plan.max_employees >= 9999 ? 'Unlimited' : plan.max_employees}</span>;
  }
  const val = plan[feature.key] ?? plan.features_raw?.[feature.key];
  if (val === undefined || val === null) return <span className="plan-compare-na">-</span>;
  if (typeof val === 'boolean') {
    return val ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    );
  }
  return <span>{val}</span>;
}

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

  const highlightedPlanName = g('landing_highlighted_plan', '');
  const glowColor = g('landing_pricing_glow_color', '#6366f1');
  const pricingTitle = g('landing_pricing_title', '');
  const pricingSubtitle = g('landing_pricing_subtitle', '');

  const { ref: heroRef, inView: heroInView } = useScrollReveal({ margin: '-10% 0px' });
  const { ref: plansRef, inView: plansInView } = useScrollReveal();
  const { ref: compareRef, inView: compareInView } = useScrollReveal();
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
          <h1>{pricingTitle || 'Simple, Transparent Pricing'}</h1>
          <p>{pricingSubtitle || 'Choose the plan that fits your team. Upgrade or downgrade anytime.'}</p>
        </div>
      </section>

      {/* Trust Bar */}
      <motion.div
        className="pricing-trust-bar"
        initial={{ opacity: 0, y: 20 }}
        animate={heroInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {TRUST_METRICS.map((m) => (
          <div key={m.label} className="pricing-trust-metric">
            <span className="pricing-trust-value">{m.value}</span>
            <span className="pricing-trust-label">{m.label}</span>
          </div>
        ))}
      </motion.div>

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
            const isFeatured = highlightedPlanName ? plan.name === highlightedPlanName : idx === 1;
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
                    <div
                      className={`landing-plan-card ${isFeatured ? 'featured' : ''}`}
                      style={isFeatured ? { '--plan-glow-color': glowColor } : undefined}
                    >
                      {isFeatured && <div className="plan-badge" style={{ background: glowColor }}>Most Popular</div>}
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
                          style={isFeatured ? { background: `linear-gradient(135deg, ${glowColor}, ${glowColor}dd)`, boxShadow: `0 10px 30px -5px ${glowColor}66` } : undefined}
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

      {/* Feature Comparison Table */}
      <section ref={compareRef} className="pricing-compare">
        <div className="landing-section-header">
          <h2>Compare Plans</h2>
          <p>See exactly what's included in every plan</p>
        </div>
        <motion.div
          className="pricing-compare-table-wrap"
          initial={{ opacity: 0, y: 30 }}
          animate={compareInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <table className="pricing-compare-table">
            <thead>
              <tr>
                <th className="pricing-compare-feature-col">Feature</th>
                {plans.map((plan) => {
                  const isFeatured = highlightedPlanName ? plan.name === highlightedPlanName : plans.indexOf(plan) === 1;
                  return (
                    <th key={plan.id} className={isFeatured ? 'pricing-compare-featured-col' : ''}>
                      {plan.name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((feature) => (
                <tr key={feature.key}>
                  <td className="pricing-compare-feature-name">{feature.name}</td>
                  {plans.map((plan) => {
                    const isFeatured = highlightedPlanName ? plan.name === highlightedPlanName : plans.indexOf(plan) === 1;
                    return (
                      <td key={plan.id} className={isFeatured ? 'pricing-compare-featured-col' : ''}>
                        <CompareValue plan={plan} feature={feature} />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="pricing-compare-feature-name">Price</td>
                {plans.map((plan) => {
                  const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
                  const isFeatured = highlightedPlanName ? plan.name === highlightedPlanName : plans.indexOf(plan) === 1;
                  return (
                    <td key={plan.id} className={`pricing-compare-price ${isFeatured ? 'pricing-compare-featured-col' : ''}`}>
                      <strong>{formatPrice(price, plan.currency)}</strong>
                      {price > 0 && <span>/{billing === 'monthly' ? 'mo' : 'yr'}</span>}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="pricing-testimonials-section">
        <div className="landing-section-header">
          <h2>Trusted by Growing Teams</h2>
          <p>See why companies choose WorkTrack</p>
        </div>
        <TestimonialCarousel items={PRICING_TESTIMONIALS} interval={5000} />
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

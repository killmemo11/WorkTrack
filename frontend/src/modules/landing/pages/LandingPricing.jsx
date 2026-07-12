import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const formatPrice = (price, currency) => {
  if (price === 0) return 'Free';
  const symbols = { USD: '$', EGP: 'E£', EUR: '€', GBP: '£', SAR: '﷼', AED: 'AED' };
  return `${symbols[currency] || '$'}${price}`;
};

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

  return (
    <div className="landing-page">
      <div className="landing-page-hero">
        <div className="landing-page-hero-bg" />
        <div className="landing-page-hero-content">
          <div className="landing-page-badge">PRICING</div>
          <h1>Simple, Transparent Pricing</h1>
          <p>Choose the plan that fits your team. Upgrade or downgrade anytime.</p>
        </div>
      </div>

      <div className="landing-billing-toggle">
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

      <section className="landing-pricing">
        <div className="landing-plans-grid">
          {plans.map((plan, idx) => {
            const planFeatures = plan.features
              ? typeof plan.features === 'string'
                ? JSON.parse(plan.features)
                : plan.features
              : [];
            const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
            return (
              <div
                key={plan.id}
                className={`landing-plan-card ${idx === 1 ? 'featured' : ''}`}
              >
                {idx === 1 && <div className="plan-badge">Most Popular</div>}
                <h3>{plan.name}</h3>
                <p className="plan-desc">{plan.description}</p>
                <div className="plan-price">
                  <span className="plan-amount">
                    {formatPrice(price, plan.currency)}
                  </span>
                  {price > 0 && (
                    <span className="plan-period">
                      /{billing === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>
                {plan.max_employees < 9999 && (
                  <div className="plan-limit">
                    Up to {plan.max_employees} employees
                  </div>
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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/tenant-register"
                  className={
                    idx === 1
                      ? 'landing-btn-primary plan-cta'
                      : 'landing-btn-secondary plan-cta'
                  }
                >
                  Get Started
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="landing-faq">
        <div className="landing-section-header">
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="landing-faq-list">
          {[
            {
              q: 'Can I change plans later?',
              a: 'Yes. Upgrade or downgrade anytime from your dashboard. Changes take effect immediately.',
            },
            {
              q: 'Is there a free trial?',
              a: 'Yes. Every paid plan comes with a free trial. No credit card required to start.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major credit cards, bank transfers, and mobile wallets.',
            },
            {
              q: 'What happens when my trial ends?',
              a: 'You can choose a paid plan or continue with limited free features.',
            },
          ].map((faq, i) => (
            <div key={i} className="landing-faq-item">
              <h4>{faq.q}</h4>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-page-cta">
        <h2>Ready to Get Started?</h2>
        <p>Start your free trial today. No credit card required.</p>
        <Link to="/tenant-register" className="landing-btn-primary">
          Start Free Trial
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </section>
    </div>
  );
}

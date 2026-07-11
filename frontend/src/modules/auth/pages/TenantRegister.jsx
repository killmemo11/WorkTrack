// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function TenantRegister() {
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    employee_count: '',
    message: '',
    plan: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/platform/public/plans')
      .then((res) => res.json())
      .then((data) => {
        setPlans(data);
        if (data.length > 0) {
          const trial = data.find(p => p.slug === 'trial') || data[0];
          setForm((prev) => ({ ...prev, plan: trial.slug }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.company_name.trim()) {
      setError('Company name is required');
      return;
    }
    if (!form.contact_email.trim()) {
      setError('Contact email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contact_email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const body = {
        company_name: form.company_name.trim(),
        contact_email: form.contact_email.trim().toLowerCase(),
        contact_phone: form.contact_phone.trim() || undefined,
        employee_count: form.employee_count ? parseInt(form.employee_count) : undefined,
        message: form.message.trim() || undefined,
        plan: form.plan || undefined,
      };

      const res = await fetch('/api/public/tenant-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit request');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-page-modern">
        <div className="login-bg">
          <div className="login-bg-gradient" />
          <div className="login-bg-orb login-orb-1" />
          <div className="login-bg-orb login-orb-2" />
          <div className="login-bg-orb login-orb-3" />
        </div>

        <div className="login-card-modern" style={{ textAlign: 'center', maxWidth: 480 }}>
          <div style={{ marginBottom: 24 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', color: '#f4f4f5', letterSpacing: '-0.02em' }}>
            Request Submitted!
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#71717a', lineHeight: 1.6, margin: '0 0 24px' }}>
            Thank you! We've received your request and will review it within 24 hours.
            Once approved, you'll receive a secure magic link to set up your admin account.
          </p>

          <div style={{
            background: 'rgba(34, 197, 94, 0.06)',
            border: '1px solid rgba(34, 197, 94, 0.12)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 28,
            textAlign: 'left',
          }}>
            <p style={{ fontSize: '0.82rem', color: '#a1a1aa', margin: '0 0 16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              What happens next?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', text: 'Our team reviews your request' },
                { icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', text: 'You receive a magic link via email' },
                { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', text: 'Set your password & configure your tenant' },
                { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', text: 'Invite employees and start using WorkTrack' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d={step.icon} />
                  </svg>
                  <span style={{ fontSize: '0.85rem', color: '#d4d4d8' }}>{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="landing-btn-secondary" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Home
            </Link>
            <Link to="/careers" className="landing-btn-primary" style={{ padding: '12px 24px', fontSize: '0.9rem' }}>
              Browse Careers
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-modern">
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-orb login-orb-1" />
        <div className="login-bg-orb login-orb-2" />
        <div className="login-bg-orb login-orb-3" />
      </div>

      <div className="login-card-modern" style={{ maxWidth: 480 }}>
        <div className="login-modern-header">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <h1>Register Your Company</h1>
          <p>Get your own WorkTrack tenant in minutes</p>
        </div>

        {error && (
          <div className="login-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-modern-form">
          <div className="login-field">
            <label className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <span>Company Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={form.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className="login-field-input"
              required
            />
          </div>

          <div className="login-field-group">
            <div className="login-field">
              <label className="login-field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                <span>Choose Plan</span>
              </label>
              <select
                value={form.plan}
                onChange={(e) => handleChange('plan', e.target.value)}
                className="login-field-input"
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.name} — {p.price_monthly === 0 ? 'Free' : `$${p.price_monthly}/mo`} ({p.max_employees >= 9999 ? 'Unlimited' : p.max_employees} employees)
                  </option>
                ))}
              </select>
            </div>

            <div className="login-field">
              <label className="login-field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22 6 12 13 2 6"/>
                </svg>
                <span>Contact Email</span>
              </label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={form.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="login-field-input"
                required
              />
            </div>

            <div className="login-field">
              <label className="login-field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>Phone (optional)</span>
              </label>
              <input
                type="tel"
                placeholder="+20..."
                value={form.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="login-field-input"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Estimated Employees</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={form.employee_count}
              onChange={(e) => handleChange('employee_count', e.target.value)}
              className="login-field-input"
            />
          </div>

          <div className="login-field">
            <label className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Message (optional)</span>
            </label>
            <textarea
              placeholder="Tell us about your needs..."
              value={form.message}
              onChange={(e) => handleChange('message', e.target.value)}
              className="login-field-input"
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Request'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: '#52525b', margin: '0 0 4px' }}>
            Already registered? <Link to="/login" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
          <Link to="/" style={{ fontSize: '0.78rem', color: '#52525b', textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 4 }}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
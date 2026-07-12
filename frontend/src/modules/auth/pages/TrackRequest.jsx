// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_ICONS = {
  submitted: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  ),
  payment_uploaded: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  ),
  payment_verified: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  payment_rejected: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  ),
  pending: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  approved: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ),
  rejected: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  ),
};

const STATUS_COLORS = {
  submitted: '#6366f1',
  payment_uploaded: '#f59e0b',
  payment_verified: '#22c55e',
  payment_rejected: '#ef4444',
  pending: '#f59e0b',
  approved: '#22c55e',
  rejected: '#ef4444',
};

export default function TrackRequest() {
  const [email, setEmail] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    setData(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/public/track-request?email=${encodeURIComponent(email.trim())}`);
      const json = await res.json();
      if (json.found === false) {
        setError('No registration found with this email address.');
      } else {
        setData(json);
      }
    } catch {
      setError('Failed to track request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="landing-page">
      <section className="landing-page-hero" style={{ paddingBottom: 60 }}>
        <div className="landing-page-hero-bg" />
        <div className="landing-page-hero-content">
          <div className="landing-page-badge">TRACK REQUEST</div>
          <h1>Track Your Registration</h1>
          <p>Enter your email to check the status of your WorkTrack registration</p>
        </div>
      </section>

      <div className="tr-track-container">
        <form onSubmit={handleTrack} className="tr-track-form">
          <div className="tr-track-input-row">
            <input
              type="email"
              className="glass-input"
              placeholder="Enter your company email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="landing-btn-primary" disabled={loading}>
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>
        </form>

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="tr-track-loading"
            >
              <div className="spinner" />
            </motion.div>
          )}

          {error && searched && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="tr-track-result"
            >
              <div className="tr-track-not-found">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--landing-text-secondary)" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p>{error}</p>
                <Link to="/tenant-register" className="landing-btn-secondary" style={{ marginTop: 12, display: 'inline-flex' }}>
                  Register Now
                </Link>
              </div>
            </motion.div>
          )}

          {data && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="tr-track-result"
            >
              <div className="tr-track-info-card">
                <div className="tr-track-info-row">
                  <span className="tr-track-info-label">Company</span>
                  <span className="tr-track-info-value">{data.company_name}</span>
                </div>
                <div className="tr-track-info-row">
                  <span className="tr-track-info-label">Plan</span>
                  <span className="tr-track-info-value" style={{ textTransform: 'capitalize' }}>{data.requested_plan}</span>
                </div>
                <div className="tr-track-info-row">
                  <span className="tr-track-info-label">Status</span>
                  <span className={`tr-track-status-badge tr-track-status-${data.status}`}>{data.status}</span>
                </div>
                {data.payment_status && (
                  <div className="tr-track-info-row">
                    <span className="tr-track-info-label">Payment</span>
                    <span className={`tr-track-status-badge tr-track-pay-${data.payment_status}`}>{data.payment_status}</span>
                  </div>
                )}
                {data.payment_amount && (
                  <div className="tr-track-info-row">
                    <span className="tr-track-info-label">Amount</span>
                    <span className="tr-track-info-value">{data.payment_amount} {data.payment_currency}</span>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="tr-track-timeline">
                {data.timeline.map((step, idx) => (
                  <div key={idx} className={`tr-track-timeline-item tr-track-tl-${step.status}`}>
                    <div className="tr-track-timeline-dot" style={{ borderColor: STATUS_COLORS[step.status] }}>
                      {STATUS_ICONS[step.status]}
                    </div>
                    <div className="tr-track-timeline-content">
                      <div className="tr-track-timeline-label">{step.label}</div>
                      {step.date && <div className="tr-track-timeline-date">{formatDate(step.date)}</div>}
                      {step.reason && <div className="tr-track-timeline-reason">{step.reason}</div>}
                    </div>
                  </div>
                ))}
              </div>

              {data.status === 'pending' && (
                <div className="tr-track-note">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span>We typically review requests within 24 hours. You will receive an email once a decision is made.</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

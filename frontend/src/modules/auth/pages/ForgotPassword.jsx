// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setSent(true);
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 1500);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-bg-orb orb-3" />
        <div className="auth-bg-grid" />
      </div>

      <div className="auth-container fade-in-up">
        <div className="auth-brand">
          <span className="iconify" data-icon="lucide:key-round" style={{ fontSize: 32, color: 'var(--brand-primary)' }} />
          <h1>Forgot Password</h1>
          <p>Enter your email to receive a reset code</p>
        </div>

        {error && (
          <div className="glass-alert glass-alert-danger">
            <span className="iconify" data-icon="lucide:alert-triangle" />
            {error}
          </div>
        )}

        {sent && (
          <div className="glass-alert glass-alert-success">
            <span className="iconify" data-icon="lucide:mail-check" />
            Reset code sent! Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="glass-form-group">
            <label className="glass-label"><span className="iconify" data-icon="lucide:mail" style={{ marginRight: 6, fontSize: 14 }} />Email</label>
            <input type="email" className="glass-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={sent} autoComplete="email" />
          </div>

          <button type="submit" className="glass-btn glass-btn-primary glass-btn-lg" disabled={loading || sent} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Sending...</> : sent ? <>Redirecting... <span className="iconify" data-icon="lucide:loader-2" style={{ marginLeft: 8 }} /></> : <>Send Reset Code <span className="iconify" data-icon="lucide:send" style={{ marginLeft: 8 }} /></>}
          </button>
        </form>

        <p className="auth-footer" style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Remember your password? <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Back to login</Link>
        </p>
      </div>
    </div>
  );
}

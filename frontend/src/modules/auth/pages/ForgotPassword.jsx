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
    <div className="login-page-modern">
      {/* Background */}
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-orb login-orb-1" />
        <div className="login-bg-orb login-orb-2" />
        <div className="login-bg-orb login-orb-3" />
      </div>

      {/* Login Card */}
      <div className="login-card-modern">
        {/* Logo */}
        <div className="login-modern-header">
          <img src="/logo.png" alt="WorkTrack" className="login-modern-logo" />
          <h1>Forgot Password</h1>
          <p>Enter your email to receive a reset code</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {sent && (
          <div className="login-alert" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.2)', color: '#86efac' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>Reset code sent! Redirecting...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-modern-form">
          {/* Email */}
          <div className="login-field">
            <label htmlFor="forgot-email" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9l9 6 9-6"/>
              </svg>
              <span>Email</span>
            </label>
            <input
              id="forgot-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-field-input"
              required
              disabled={sent}
              autoComplete="email"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading || sent}
          >
            {loading ? 'Sending...' : sent ? 'Redirecting...' : 'Send Reset Code'}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <span>Or continue with</span>
        </div>

        {/* Social Login */}
        <div className="login-social">
          <button type="button" className="login-social-btn" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google</span>
          </button>
          <button type="button" className="login-social-btn" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M0 0v24h24V0H0zm22.3 21.7L2.3 1.7 1.7 2.3l20 20 0.6-0.6z M20.1 15.5v-5.6h-4V9.1c0-1.6 1.3-2.9 2.9-2.9s2.9 1.3 2.9 2.9h1.7c0-2.5-2-4.5-4.6-4.5-2.5 0-4.6 2-4.6 4.5v3.4h3v5.6h4z"/>
            </svg>
            <span>Microsoft</span>
          </button>
        </div>

        {/* Footer */}
        <div className="login-modern-footer">
          <p>Remember your password?</p>
          <Link to="/login" className="login-register-link">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
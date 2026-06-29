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
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔑</div>
        <h1>Forgot Password</h1>
        <p>Enter your email to receive a reset code</p>
        {error && <div className="alert alert-error">{error}</div>}
        {sent && <div className="alert alert-success">Code sent! Redirecting...</div>}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input type="email" placeholder="Your email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="form-control"
            style={{ width: '100%', marginBottom: 20 }} required disabled={sent} />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || sent}>
            {loading ? 'Sending...' : 'Send Reset Code'}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
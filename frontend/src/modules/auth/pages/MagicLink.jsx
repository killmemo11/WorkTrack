// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';

export default function MagicLinkSetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid or missing magic link');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/magic-link/verify-and-set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/admin'), 1500);
      } else {
        setError(data.error || 'Failed to set password');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="platform-login-page">
        <div className="platform-login-card glass-card">
          <div className="platform-login-header">
            <Icon icon="lucide:alert-circle" size={48} style={{color: '#ef4444'}} />
            <h1>Invalid Link</h1>
            <p>This magic link is invalid or has expired.</p>
          </div>
          <div style={{textAlign:'center',marginTop:'24px'}}>
            <Link to="/platform/login" className="platform-link">Contact your administrator</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="platform-login-page">
      <div className="platform-login-card glass-card">
        <div className="platform-login-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: '#22c55e'}}>
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <h1>Set Your Password</h1>
          <p>Welcome to your WorkTrack tenant. Please create a secure password to continue.</p>
        </div>

        {error && <div className="glass-alert glass-alert-error">{error}</div>}
        {success && <div className="glass-alert glass-alert-success">Password set successfully! Redirecting...</div>}

        <form onSubmit={handleSubmit} className="platform-login-form">
          <div className="glass-input-group">
            <label>New Password</label>
            <div className="glass-input-wrapper">
              <Icon icon="lucide:lock" className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 12 characters"
                required
                autoComplete="new-password"
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="glass-input-group">
            <label>Confirm Password</label>
            <div className="glass-input-wrapper">
              <Icon icon="lucide:lock" className="input-icon" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
                disabled={loading || success}
              />
            </div>
          </div>

          <button type="submit" className="glass-btn glass-btn-primary" style={{width:'100%',marginTop:8}} disabled={loading || success}>
            {loading ? (
              <>
                <span className="spinner" style={{width:16,height:16,marginRight:8}} />
                Setting password...
              </>
            ) : (
              'Set Password & Enter Dashboard'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
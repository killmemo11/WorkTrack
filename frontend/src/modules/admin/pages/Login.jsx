// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../shared/context/AdminAuthContext';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/admin/settings', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(ellipse at top, rgba(79,70,229,0.12) 0%, transparent 60%), radial-gradient(ellipse at bottom, rgba(139,92,246,0.08) 0%, transparent 60%)',
    }}>
      <div className="glass-panel" style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-xl)',
        padding: 40,
        width: '90%',
        maxWidth: 420,
        textAlign: 'center',
        boxShadow: 'var(--shadow-card)',
        animation: 'fadeInUp 0.5s ease-out',
      }}>
        <div style={{ marginBottom: 24 }}>
          <img src="/logo.svg" alt="WorkTrack" style={{ width: 64, height: 64, margin: '0 auto 16px', display: 'block', filter: 'drop-shadow(0 8px 32px rgba(99,102,241,0.3))' }} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            WorkTrack
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Admin Panel — Sign in to manage the system</p>
        </div>

        {error && (
          <div className="glass-alert glass-alert-danger" style={{ textAlign: 'left', marginBottom: 20 }}>
            <span className="iconify" data-icon="lucide:alert-circle"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="glass-form-group">
            <label className="glass-label">Username</label>
            <div style={{ position: 'relative' }}>
              <span className="iconify" data-icon="lucide:user" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '1rem' }}></span>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>
          <div className="glass-form-group">
            <label className="glass-label">Password</label>
            <div style={{ position: 'relative' }}>
              <span className="iconify" data-icon="lucide:lock" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: '1rem' }}></span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: 38 }}
                required
              />
            </div>
          </div>
          <button type="submit" className="glass-btn glass-btn-primary glass-btn-lg glass-btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? (
              <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Signing in...</>
            ) : (
              <><span className="iconify" data-icon="lucide:log-in"></span> Sign In</>
            )}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: '0.8rem', color: 'var(--text-faint)' }}>
          Secure admin access only. Contact IT support for assistance.
        </p>
      </div>
    </div>
  );
}

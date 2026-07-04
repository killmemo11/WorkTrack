// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, rememberMe);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data;
      if (msg?.error && msg?.email) {
        navigate(`/verify?email=${encodeURIComponent(msg.email)}`);
      } else {
        setError(msg?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
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
          <img src="/logo.svg" alt="WorkTrack" style={{ width: 64, height: 64 }} />
          <h1>WorkTrack</h1>
          <p>Sign in to your account</p>
        </div>

        {error && (
          <div className="glass-alert glass-alert-danger">
            <span className="iconify" data-icon="lucide:alert-triangle" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="glass-form-group">
            <label className="glass-label">Username or Email</label>
            <input type="text" className="glass-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" autoComplete="username" required />
          </div>

          <div className="glass-form-group">
            <label className="glass-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} className="glass-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                <span className="iconify" data-icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <label className="glass-checkbox"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><span>Remember me</span></label>
            <Link to="/forgot-password" style={{ color: 'var(--brand-primary)', fontSize: '0.85rem' }}>Forgot password?</Link>
          </div>

          <button type="submit" className="glass-btn glass-btn-primary glass-btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Signing in...</> : <>Sign In <span className="iconify" data-icon="lucide:log-in" style={{ marginLeft: 8 }} /></>}
          </button>
        </form>

        <p className="auth-footer" style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Don&apos;t have an account? <Link to="/register" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useRef } from 'react';
import Icon from '../../../shared/components/Icon';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputs = useRef([]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') || '';

  const handleCodeChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: code.join(''), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-bg-orb orb-1" />
          <div className="auth-bg-orb orb-2" />
          <div className="auth-bg-grid" />
        </div>
        <div className="auth-container fade-in-up" style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 20 }}>
            <Icon icon="lucide:check-circle" style={{ fontSize: 56, color: 'var(--color-success)' }} />
          </div>
          <h1 style={{ marginBottom: 8 }}>Password Reset!</h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>You can now login with your new password.</p>
          <Link to="/login" className="glass-btn glass-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <Icon icon="lucide:log-in" /> Go to Login
          </Link>
        </div>
      </div>
    );
  }

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
          <Icon icon="lucide:key-round" style={{ fontSize: 32, color: 'var(--brand-primary)' }} />
          <h1>Reset Password</h1>
          <p>Enter the 6-digit code and your new password</p>
        </div>

        {error && (
          <div className="glass-alert glass-alert-danger">
            <Icon icon="lucide:alert-triangle" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
            {code.map((digit, i) => (
              <input key={i} ref={(el) => (inputs.current[i] = el)} type="text" maxLength={1}
                value={digit} onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="glass-code-input"
                autoFocus={i === 0} />
            ))}
          </div>

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:lock" style={{ marginRight: 6, fontSize: 14 }} />New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} className="glass-input" placeholder="New password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} />
              </button>
            </div>
          </div>

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:shield-check" style={{ marginRight: 6, fontSize: 14 }} />Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} className="glass-input" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required style={{ width: '100%' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} />
              </button>
            </div>
          </div>

          <button type="submit" className="glass-btn glass-btn-primary glass-btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Resetting...</> : <>Reset Password <Icon icon="lucide:key-round" style={{ marginLeft: 8 }} /></>}
          </button>
        </form>

        <p className="auth-footer" style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Back to <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}

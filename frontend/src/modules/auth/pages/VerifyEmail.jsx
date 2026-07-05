// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useRef } from 'react';
import Icon from '../../../shared/components/Icon';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';

export default function VerifyEmail() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputs = useRef([]);
  const { setEmployee } = useAuth();
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
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
        return;
      }
      localStorage.setItem('token', data.token);
      setEmployee(data.employee);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(true);
    setError('');
    await fetch('/api/auth/resend-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setCode(['', '', '', '', '', '']);
    inputs.current[0]?.focus();
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
          <Icon icon="lucide:shield-check" style={{ fontSize: 32, color: 'var(--brand-primary)' }} />
          <h1>Verify Email</h1>
          <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
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
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="glass-code-input"
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button type="submit" className="glass-btn glass-btn-primary glass-btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Verifying...</> : <>Verify & Sign In <Icon icon="lucide:arrow-right" style={{ marginLeft: 8 }} /></>}
          </button>
        </form>

        <p className="auth-footer" style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Didn&apos;t get the code?{' '}
          <button onClick={handleResend} className="glass-btn glass-btn-ghost glass-btn-sm" disabled={resent}>
            {resent ? <><Icon icon="lucide:check" style={{ marginRight: 4 }} /> Code sent!</> : <><Icon icon="lucide:refresh-cw" style={{ marginRight: 4 }} /> Resend code</>}
          </button>
        </p>
      </div>
    </div>
  );
}

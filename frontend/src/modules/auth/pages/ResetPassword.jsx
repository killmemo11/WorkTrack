// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
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
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon">✅</div>
          <h1>Password Reset!</h1>
          <p>You can now login with your new password.</p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔑</div>
        <h1>Reset Password</h1>
        <p>Enter the 6-digit code and your new password</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="code-inputs">
            {code.map((digit, i) => (
              <input key={i} ref={(el) => (inputs.current[i] = el)} type="text" maxLength={1}
                value={digit} onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)} className="code-digit" autoFocus={i === 0} />
            ))}
          </div>
          <input type="password" placeholder="New password (min 6 chars)" value={password}
            onChange={(e) => setPassword(e.target.value)} className="form-control"
            style={{ width: '100%', marginBottom: 12, marginTop: 16 }} required />
          <input type="password" placeholder="Confirm new password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} className="form-control"
            style={{ width: '100%', marginBottom: 20 }} required />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
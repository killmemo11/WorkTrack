// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
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
    <div className="login-page">
      <div className="login-card">
        <img src="/logo.png" alt="WorkTrack" className="login-icon-img" />
        <h1>WorkTrack</h1>
        <p>Sign in to your account</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <label htmlFor="login-username" style={{ display: 'none' }}>Username</label>
          <input
            id="login-username"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-control"
            style={{ width: '100%', marginBottom: 12 }}
            required
            autoComplete="username"
          />
          <label htmlFor="login-password" style={{ display: 'none' }}>Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-control"
            style={{ width: '100%', marginBottom: 20 }}
            required
            autoComplete="current-password"
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
        <p style={{ fontSize: '0.8rem', marginTop: 8 }}>
          <Link to="/forgot-password" style={{ color: '#999', textDecoration: 'none' }}>Forgot password?</Link>
        </p>
      </div>
    </div>
  );
}


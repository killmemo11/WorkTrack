// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ employee_id: '', name: '', email: '', username: '', password: '', confirm: '', department_id: '' });
  const [departments, setDepartments] = useState([]);
  const [allowedDomain, setAllowedDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/settings/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.allowed_email_domain) {
          setAllowedDomain(data.allowed_email_domain);
        }
      })
      .catch((err) => console.error('Failed to load settings:', err));
    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => setDepartments(data))
      .catch((err) => console.error('Failed to load departments:', err));
  }, []);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!form.department_id) {
      setError('Please select a department');
      return;
    }

    setLoading(true);
    try {
      const body = {
        employee_id: parseInt(form.employee_id),
        name: form.name,
        email: form.email,
        username: form.username,
        password: form.password,
        department_id: parseInt(form.department_id),
      };

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }
      navigate(`/verify?email=${encodeURIComponent(form.email)}`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
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
          <h1>Create Account</h1>
          <p>Register for WorkTrack</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-modern-form">
          {/* Employee ID */}
          <div className="login-field">
            <label htmlFor="reg-employee-id" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Employee ID</span>
            </label>
            <input
              id="reg-employee-id"
              type="text"
              placeholder="Enter employee ID (e.g. 100)"
              value={form.employee_id}
              onChange={(e) => handleChange('employee_id', e.target.value)}
              className="login-field-input"
              required
              autoComplete="off"
            />
          </div>

          {/* Full Name */}
          <div className="login-field">
            <label htmlFor="reg-name" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Full Name</span>
            </label>
            <input
              id="reg-name"
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="login-field-input"
              required
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div className="login-field">
            <label htmlFor="reg-email" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M3 9l9 6 9-6"/>
              </svg>
              <span>Email</span>
            </label>
            <input
              id="reg-email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="login-field-input"
              required
              autoComplete="email"
            />
          </div>

          {/* Domain Hint */}
          {allowedDomain && (
            <div className="login-domain-hint">
              Only @{allowedDomain} email addresses are allowed
            </div>
          )}

          {/* Username */}
          <div className="login-field">
            <label htmlFor="reg-username" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Username</span>
            </label>
            <input
              id="reg-username"
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={(e) => handleChange('username', e.target.value)}
              className="login-field-input"
              required
              autoComplete="username"
            />
          </div>

          {/* Department */}
          <div className="login-field">
            <label htmlFor="reg-department" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Department</span>
            </label>
            <select
              id="reg-department"
              value={form.department_id}
              onChange={(e) => handleChange('department_id', e.target.value)}
              className="login-field-input"
              required
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div className="login-field">
            <label htmlFor="reg-password" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Password</span>
            </label>
            <div className="login-password-wrapper">
              <input
                id="reg-password"
                type="password"
                placeholder="Enter password (min 6 chars)"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="login-field-input"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="login-field">
            <label htmlFor="reg-confirm" className="login-field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>Confirm Password</span>
            </label>
            <div className="login-password-wrapper">
              <input
                id="reg-confirm"
                type="password"
                placeholder="Confirm password"
                value={form.confirm}
                onChange={(e) => handleChange('confirm', e.target.value)}
                className="login-field-input"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Register'}
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
          <p>Already have an account?</p>
          <Link to="/login" className="login-register-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
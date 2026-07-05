// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const [form, setForm] = useState({ employee_id: '', name: '', email: '', username: '', password: '', confirm: '', department_id: '' });
  const [departments, setDepartments] = useState([]);
  const [allowedDomain, setAllowedDomain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strengthLabel = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981'];

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
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb orb-1" />
        <div className="auth-bg-orb orb-2" />
        <div className="auth-bg-orb orb-3" />
        <div className="auth-bg-grid" />
      </div>

      <div className="auth-container fade-in-up">
        <div className="auth-brand">
          <Icon icon="lucide:user-plus" style={{ fontSize: 32, color: 'var(--brand-primary)' }} />
          <h1>Create Account</h1>
          <p>Register for WorkTrack</p>
        </div>

        {error && (
          <div className="glass-alert glass-alert-danger">
            <Icon icon="lucide:alert-triangle" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:id-card" style={{ marginRight: 6, fontSize: 14 }} />Employee ID</label>
            <input type="text" className="glass-input" placeholder="Enter employee ID (e.g. 100)" value={form.employee_id} onChange={(e) => handleChange('employee_id', e.target.value)} autoComplete="off" />
          </div>

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:user" style={{ marginRight: 6, fontSize: 14 }} />Full Name</label>
            <input type="text" className="glass-input" placeholder="Enter your full name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required autoComplete="name" />
          </div>

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:mail" style={{ marginRight: 6, fontSize: 14 }} />Email</label>
            <input type="email" className="glass-input" placeholder="Enter your email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} required autoComplete="email" />
          </div>

          {allowedDomain && (
            <div className="glass-alert glass-alert-info" style={{ padding: '8px 12px', fontSize: '0.82rem' }}>
              <Icon icon="lucide:info" style={{ marginRight: 6 }} />
              Only @{allowedDomain} email addresses are allowed
            </div>
          )}

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:at-sign" style={{ marginRight: 6, fontSize: 14 }} />Username</label>
            <input type="text" className="glass-input" placeholder="Enter username" value={form.username} onChange={(e) => handleChange('username', e.target.value)} required autoComplete="username" />
          </div>

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:building-2" style={{ marginRight: 6, fontSize: 14 }} />Department</label>
            <select className="glass-select" value={form.department_id} onChange={(e) => handleChange('department_id', e.target.value)} required>
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:lock" style={{ marginRight: 6, fontSize: 14 }} />Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} className="glass-input" placeholder="Enter password (min 6 chars)" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} />
              </button>
            </div>
            {form.password && (
              <div style={{ marginTop: 8 }}>
                <div className="stat-bar" style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                  <div className="stat-bar-fill" style={{ width: `${(passwordStrength() / 5) * 100}%`, height: '100%', borderRadius: 2, background: strengthColor[passwordStrength() - 1] || strengthColor[0], transition: 'all 0.3s' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>{strengthLabel[passwordStrength() - 1]}</span>
              </div>
            )}
          </div>

          <div className="glass-form-group">
            <label className="glass-label"><Icon icon="lucide:shield-check" style={{ marginRight: 6, fontSize: 14 }} />Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} className="glass-input" placeholder="Confirm password" value={form.confirm} onChange={(e) => handleChange('confirm', e.target.value)} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                <Icon icon={showPassword ? 'lucide:eye-off' : 'lucide:eye'} />
              </button>
            </div>
          </div>

          <button type="submit" className="glass-btn glass-btn-primary glass-btn-lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? <><span className="spinner" style={{ marginRight: 8 }} />Creating account...</> : <>Register <Icon icon="lucide:user-plus" style={{ marginLeft: 8 }} /></>}
          </button>
        </form>

        <p className="auth-footer" style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

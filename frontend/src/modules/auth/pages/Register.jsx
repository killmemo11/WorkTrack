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

    setLoading(true);
    try {
      const body = {
        employee_id: parseInt(form.employee_id),
        name: form.name,
        email: form.email,
        username: form.username,
        password: form.password,
      };
      if (form.department_id) body.department_id = parseInt(form.department_id);

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
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">📝</div>
        <h1>Create Account</h1>
        <p>Register for WorkTrack</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <label htmlFor="reg-employee-id" style={{ display: 'none' }}>Employee ID</label>
          <input
            id="reg-employee-id"
            type="number"
            placeholder="Employee ID (e.g. 100)"
            value={form.employee_id}
            onChange={(e) => handleChange('employee_id', e.target.value)}
            className="form-control" style={{ width: '100%', marginBottom: 12 }} required
          />
          <label htmlFor="reg-name" style={{ display: 'none' }}>Full Name</label>
          <input
            id="reg-name"
            type="text"
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="form-control" style={{ width: '100%', marginBottom: 12 }} required
          />
          <label htmlFor="reg-email" style={{ display: 'none' }}>Email</label>
          <input
            id="reg-email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="form-control" style={{ width: '100%', marginBottom: 4 }} required
          />
          {allowedDomain && (
            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: 12, marginTop: 0 }} id="domain-hint">
              Only @{allowedDomain} email addresses are allowed
            </p>
          )}
          <label htmlFor="reg-username" style={{ display: 'none' }}>Username</label>
          <input
            id="reg-username"
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => handleChange('username', e.target.value)}
            className="form-control" style={{ width: '100%', marginBottom: 12 }} required
          />
          <label htmlFor="reg-department" style={{ display: 'none' }}>Department</label>
          <select
            id="reg-department"
            value={form.department_id}
            onChange={(e) => handleChange('department_id', e.target.value)}
            className="form-control" style={{ width: '100%', marginBottom: 12 }}
          >
            <option value="">Select Department (optional)</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <label htmlFor="reg-password" style={{ display: 'none' }}>Password</label>
          <input
            id="reg-password"
            type="password"
            placeholder="Password (min 6 chars)"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            className="form-control" style={{ width: '100%', marginBottom: 12 }} required
          />
          <label htmlFor="reg-confirm" style={{ display: 'none' }}>Confirm Password</label>
          <input
            id="reg-confirm"
            type="password"
            placeholder="Confirm Password"
            value={form.confirm}
            onChange={(e) => handleChange('confirm', e.target.value)}
            className="form-control" style={{ width: '100%', marginBottom: 20 }} required
          />
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

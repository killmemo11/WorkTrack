// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../../shared/context/AdminAuthContext';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { recheck, logout } = useAdminAuth();
  const navigate = useNavigate();

  const validate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (newPassword.length < 10) {
      setError('Password must be at least 10 characters');
      return false;
    }
    if (newPassword === currentPassword) {
      setError('New password must differ from current');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken') || localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }
      // Recheck session to refresh must_change_password flag, then navigate.
      await recheck();
      setSuccess(true);
      setTimeout(() => navigate('/admin/settings', { replace: true }), 1200);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => logout();

  return (
    <div className="platform-login-page">
      <div className="platform-login-card glass-card">
        <div className="platform-login-header">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: '#f59e0b'}}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <h1>Change Your Password</h1>
          <p>You must set a new password before continuing.</p>
        </div>

        {error && <div className="glass-alert glass-alert-error">{error}</div>}
        {success && <div className="glass-alert glass-alert-success">Password updated! Redirecting...</div>}

        <form onSubmit={handleSubmit} className="platform-login-form">
          <div className="glass-input-group">
            <label>Current Password</label>
            <div className="glass-input-wrapper">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                autoComplete="current-password"
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="glass-input-group">
            <label>New Password</label>
            <div className="glass-input-wrapper">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 10 characters"
                required
                autoComplete="new-password"
                disabled={loading || success}
              />
            </div>
          </div>

          <div className="glass-input-group">
            <label>Confirm New Password</label>
            <div className="glass-input-wrapper">
              <input
                type={showNew ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                required
                autoComplete="new-password"
                disabled={loading || success}
              />
            </div>
          </div>

          <button type="submit" className="glass-btn glass-btn-primary" style={{width: '100%', marginTop: 8}} disabled={loading || success}>
            {loading ? (
              <>
                <span className="spinner" style={{width: 16, height: 16, marginRight: 8}} />
                Updating...
              </>
            ) : (
              'Update Password & Continue'
            )}
          </button>
        </form>

        <div style={{textAlign: 'center', marginTop: 16}}>
          <button type="button" className="glass-btn glass-btn-secondary" onClick={handleLogout} disabled={loading}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

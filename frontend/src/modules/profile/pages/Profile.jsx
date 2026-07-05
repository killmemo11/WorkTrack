// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { useAuth } from '../../../shared/context/AuthContext';
import api from '../../../shared/api';
import Layout from '../../../shared/components/Layout/Layout';

export default function Profile() {
  const { employee, setEmployee } = useAuth();
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee?.phone) setPhone(employee.phone);
  }, [employee]);

  const handleUpdatePhone = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await api.put('/auth/profile', { phone });
      setEmployee(res.data);
      setMessage('Phone number updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <Layout>
      <div className="page" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="glass-page-header">
          <div>
            <h1>My Profile</h1>
            <p className="subtitle">Manage your account information</p>
          </div>
        </div>

        {message && <div className="glass-alert glass-alert-success"><Icon icon="lucide:check-circle" style={{ marginRight: 8 }} />{message}</div>}
        {error && <div className="glass-alert glass-alert-danger"><Icon icon="lucide:alert-triangle" style={{ marginRight: 8 }} />{error}</div>}

        <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
          <div className="glass-card-header">
            <h3><Icon icon="lucide:user" style={{ marginRight: 8 }} />Account Info</h3>
          </div>
          <div className="glass-card-body">
            <div className="glass-detail-grid">
              <div className="glass-form-group">
                <label className="glass-label">Name</label>
                <input className="glass-input" value={employee?.name || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Email</label>
                <input className="glass-input" value={employee?.email || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Username</label>
                <input className="glass-input" value={employee?.username || ''} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Role</label>
                <input className="glass-input" value={(employee?.role || '').charAt(0).toUpperCase() + (employee?.role || '').slice(1)} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
          <div className="glass-card-header">
            <h3><Icon icon="lucide:phone" style={{ marginRight: 8 }} />Phone Number</h3>
          </div>
          <div className="glass-card-body">
            <form onSubmit={handleUpdatePhone}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="glass-form-group" style={{ flex: 1, minWidth: 250 }}>
                  <label className="glass-label">Phone Number</label>
                  <input type="tel" className="glass-input" value={phone}
                    onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number" />
                </div>
                <button className="glass-btn glass-btn-primary" disabled={saving}>
                  {saving ? <><span className="spinner-sm" /> Saving...</> : <><Icon icon="lucide:save" style={{ marginRight: 6 }} /> Update</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="glass-card card-hover fade-in-up">
          <div className="glass-card-header">
            <h3><Icon icon="lucide:key-round" style={{ marginRight: 8 }} />Change Password</h3>
          </div>
          <div className="glass-card-body">
            <form onSubmit={handleChangePassword}>
              <div className="glass-detail-grid" style={{ marginBottom: 16 }}>
                <div className="glass-form-group">
                  <label className="glass-label">Current Password</label>
                  <input type="password" className="glass-input" value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="glass-form-group">
                  <label className="glass-label">New Password</label>
                  <input type="password" className="glass-input" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                </div>
              </div>
              <button className="glass-btn glass-btn-primary" disabled={saving}>
                {saving ? <><span className="spinner-sm" /> Saving...</> : <><Icon icon="lucide:key-round" style={{ marginRight: 6 }} /> Change Password</>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}

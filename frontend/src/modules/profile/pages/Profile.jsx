// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
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
      <div className="page" style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1>My Profile</h1>
        <p className="subtitle">Manage your account information</p>

        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Account Info</h3>
          </div>
          <div className="settings-grid">
            <label>Name<div className="form-control" style={{ opacity: 0.7, cursor: 'not-allowed' }}>{employee?.name}</div></label>
            <label>Email<div className="form-control" style={{ opacity: 0.7, cursor: 'not-allowed' }}>{employee?.email}</div></label>
            <label>Username<div className="form-control" style={{ opacity: 0.7, cursor: 'not-allowed' }}>{employee?.username}</div></label>
            <label>Role<div className="form-control" style={{ opacity: 0.7, cursor: 'not-allowed' }}>{(employee?.role || '').charAt(0).toUpperCase() + (employee?.role || '').slice(1)}</div></label>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Phone Number</h3>
          </div>
          <form onSubmit={handleUpdatePhone}>
            <div className="dept-add-form">
              <label style={{ minWidth: 280 }}>
                <input type="tel" className="form-control" value={phone}
                  onChange={(e) => setPhone(e.target.value)} placeholder="Enter your phone number"
                  style={{ width: '100%' }} />
              </label>
              <button className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword}>
            <div className="settings-grid" style={{ marginBottom: 16 }}>
              <label>
                Current Password
                <input type="password" className="form-control" value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)} required style={{ width: '100%' }} />
              </label>
              <label>
                New Password
                <input type="password" className="form-control" value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)} required minLength={6} style={{ width: '100%' }} />
              </label>
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}


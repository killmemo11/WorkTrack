// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';

export default function MissingSignOut() {
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ recordId: null, signOutTime: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const [recRes, reqRes] = await Promise.all([
        api.get('/attendance/missing'),
        api.get('/attendance/my-signout-requests'),
      ]);
      setRecords(recRes.data);
      setRequests(reqRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getRequestStatus = (recordId) => {
    const req = requests.find((r) => r.attendance_record_id === recordId);
    if (!req) return null;
    return req.status === 'pending' ? 'pending'
      : req.status === 'approved' ? 'approved'
      : 'rejected';
  };

  const getRejectionReason = (recordId) => {
    const req = requests.find((r) => r.attendance_record_id === recordId && r.status === 'rejected');
    return req ? req.rejection_reason : null;
  };

  const handleRequest = async () => {
    try {
      await api.post('/attendance/request-signout', form);
      setMessage('Sign-out request submitted for approval');
      setForm({ recordId: null, signOutTime: '', notes: '' });
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    }
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  if (loading) return (
    <div className="page">
      <div className="glass-page-header"><h1>Missing Sign Out</h1></div>
      <div className="glass-loading">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Missing Sign Out</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Days you forgot to sign out. Submit a request with your exit time for approval.</p>
        </div>
      </div>

      {message && <div className="glass-alert glass-alert-success">{message}</div>}

      {records.length === 0 ? (
        <div className="glass-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <h3>No missing sign outs. Great job!</h3>
        </div>
      ) : (
        <div className="glass-card">
          <div className="glass-table-wrapper">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sign In</th>
                  <th>Duration So Far</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const diff = ((Date.now() - new Date(r.sign_in_time)) / (1000 * 60 * 60)).toFixed(1);
                  const status = getRequestStatus(r.id);
                  const rejectionReason = getRejectionReason(r.id);
                  return (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td>{new Date(r.sign_in_time).toLocaleTimeString()}</td>
                      <td>{diff}h</td>
                      <td>
                        {status === 'pending' && <span className="glass-badge glass-badge-warning">Pending Approval</span>}
                        {status === 'approved' && <span className="glass-badge glass-badge-success">Approved</span>}
                        {status === 'rejected' && (
                          <span className="glass-badge glass-badge-danger" title={rejectionReason || ''}>Rejected</span>
                        )}
                        {!status && <span className="glass-badge glass-badge-default">Not Requested</span>}
                      </td>
                      <td>
                        {!status && (
                          <button
                            className="glass-btn glass-btn-sm glass-btn-primary"
                            onClick={() => setForm({
                              recordId: r.id,
                              signOutTime: new Date().toISOString().slice(0, 16),
                              notes: '',
                            })}
                          >
                            Request Sign Out
                          </button>
                        )}
                        {status === 'rejected' && (
                          <button
                            className="glass-btn glass-btn-sm glass-btn-primary"
                            onClick={() => setForm({
                              recordId: r.id,
                              signOutTime: new Date().toISOString().slice(0, 16),
                              notes: '',
                            })}
                          >
                            Resubmit Request
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form.recordId && (
        <div className="glass-modal-overlay" onClick={() => { setForm({ recordId: null, signOutTime: '', notes: '' }); setError(''); setMessage(''); }}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal-header">
              <h2>Submit Sign-Out Request</h2>
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setForm({ recordId: null, signOutTime: '', notes: '' })}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div className="glass-card-body">
              {error && <div className="glass-alert glass-alert-danger" style={{ marginBottom: 12 }}>{error}</div>}
              <div className="glass-form-group">
                <label className="glass-label">Sign Out Time</label>
                <input
                  type="datetime-local"
                  value={form.signOutTime}
                  onChange={(e) => setForm({ ...form, signOutTime: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="glass-textarea"
                  rows={3}
                />
              </div>
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setForm({ recordId: null, signOutTime: '', notes: '' })}>
                Cancel
              </button>
              <button className="glass-btn glass-btn-primary" onClick={handleRequest}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

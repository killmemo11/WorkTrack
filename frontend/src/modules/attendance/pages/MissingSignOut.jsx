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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h1>Missing Sign Out</h1>
      <p className="subtitle">Days you forgot to sign out. Submit a request with your exit time for approval.</p>

      {message && <div className="alert alert-success">{message}</div>}

      {records.length === 0 ? (
        <p className="empty">No missing sign outs. Great job!</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
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
                      {status === 'pending' && <span className="badge badge-warning">Pending Approval</span>}
                      {status === 'approved' && <span className="badge badge-success">Approved</span>}
                      {status === 'rejected' && (
                        <span className="badge badge-error" title={rejectionReason || ''}>Rejected</span>
                      )}
                      {!status && <span className="badge badge-employee">Not Requested</span>}
                    </td>
                    <td>
                      {!status && (
                        <button
                          className="btn btn-primary btn-sm"
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
                          className="btn btn-primary btn-sm"
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
      )}

      {form.recordId && (
        <div className="modal-overlay" onClick={() => { setForm({ recordId: null, signOutTime: '', notes: '' }); setError(''); setMessage(''); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Submit Sign-Out Request</h2>
            {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
            <label>
              Sign Out Time:
              <input
                type="datetime-local"
                value={form.signOutTime}
                onChange={(e) => setForm({ ...form, signOutTime: e.target.value })}
                className="form-control"
              />
            </label>
            <label>
              Notes:
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="form-control"
                rows={3}
              />
            </label>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setForm({ recordId: null, signOutTime: '', notes: '' })}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleRequest}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

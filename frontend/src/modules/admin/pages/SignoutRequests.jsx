// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';

export default function AdminSignoutRequests() {
  const [data, setData] = useState({ requests: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState('');

  const fetchRequests = async (page = 1) => {
    setLoading(true);
    try {
      const res = await hrApi.get(`/signout-requests?page=${page}&limit=50`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load signout requests:', err);
      setMessage('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleApprove = async (id) => {
    try {
      await hrApi.put(`/signout-requests/${id}/approve`);
      setMessage('Sign-out request approved');
      fetchRequests(data.page);
    } catch (err) {
      setMessage('Failed to approve: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReject = async (id) => {
    try {
      await hrApi.put(`/signout-requests/${id}/reject`, { rejection_reason: rejectionReason });
      setMessage('Sign-out request rejected');
      fetchRequests(data.page);
    } catch (err) {
      setMessage('Failed to reject: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setRejectionReason('');
    setTimeout(() => setMessage(''), 3000);
  };

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="loading">Loading...</div>;

  return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Sign-Out Requests</h1>
            <p className="subtitle">Pending manual sign-out requests requiring admin approval</p>
          </div>
        </div>

        {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

        <div className="table-wrapper">
          {data.requests.length === 0 ? (
            <p className="empty-state">No pending sign-out requests.</p>
          ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Sign In</th>
                <th>Requested Sign Out</th>
                <th>Notes</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.requests.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.employee_name}</strong></td>
                  <td>{r.department_name || '—'}</td>
                  <td className="cell-mono">{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td>{formatTime(r.sign_in_time)}</td>
                  <td>{formatTime(r.sign_out_time)}</td>
                  <td className="notes-cell">{r.notes || '—'}</td>
                  <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-primary" onClick={() => { setActionTarget(r); setActionType('approve'); }}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => { setActionTarget(r); setActionType('reject'); }}>Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchRequests} />
        </div>

        {actionTarget && actionType === 'approve' && (
          <ConfirmModal
            title="Approve Sign-Out Request"
            message={`Approve ${actionTarget.employee_name}'s sign-out request for ${actionTarget.date ? new Date(actionTarget.date).toLocaleDateString() : '—'} at ${formatTime(actionTarget.sign_out_time)}?`}
            confirmText="Approve"
            confirmClass="btn btn-primary"
            onConfirm={() => handleApprove(actionTarget.id)}
            onCancel={() => setActionTarget(null)}
          />
        )}

        {actionTarget && actionType === 'reject' && (
          <div className="modal-overlay" onClick={() => setActionTarget(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <h2>Reject Sign-Out Request</h2>
              <p>Reject {actionTarget.employee_name}'s request?</p>
              <label style={{ display: 'block', marginTop: 12 }}>
                Reason (optional)
                <textarea className="form-control" value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)} rows={3}
                  style={{ width: '100%', marginTop: 4 }} placeholder="Enter reason..." />
              </label>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setActionTarget(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleReject(actionTarget.id)}>Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
     );
}

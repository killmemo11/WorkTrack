// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';

export default function AdminResignations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState('');
  const [assetWarning, setAssetWarning] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await hrApi.get(`/resignations${params}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to load resignations:', err);
      setMessage('Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [filter]);

  const handleApprove = async (id, force) => {
    try {
      await hrApi.put(`/resignations/${id}/approve${force ? '?force=true' : ''}`);
      setMessage('Resignation approved');
      setAssetWarning(null);
      fetchAll();
    } catch (err) {
      const data = err.response?.data;
      if (data?.assets) {
        setAssetWarning({ id, assets: data.assets });
        return;
      }
      setMessage('Failed: ' + (data?.error || err.message));
    }
    setActionTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReject = async (id) => {
    try {
      await hrApi.put(`/resignations/${id}/reject`, { rejection_reason: rejectionReason });
      setMessage('Resignation rejected');
      fetchAll();
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setRejectionReason('');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Resignation Requests</h1>
            <p className="subtitle">{data.length} request{data.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

        <div className="filter-bar">
          <div className="filter-group">
            <label>Status</label>
            <select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Resignation Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Reviewed By</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={7} className="empty-state">No resignation requests found.</td></tr>
              )}
              {data.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.employee_name}</strong></td>
                  <td>{r.resignation_date}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reason || <span style={{ color: '#999' }}>—</span>}
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'approved' ? 'badge-active' : r.status === 'rejected' ? 'badge-inactive' : 'badge-warning'}`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td>{r.reviewed_by_name || <span style={{ color: '#999' }}>—</span>}</td>
                  <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {r.status === 'pending' && (
                      <div className="action-btns">
                        <button className="btn btn-sm btn-primary" onClick={() => { setActionTarget(r); setActionType('approve'); }}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => { setActionTarget(r); setActionType('reject'); }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {actionTarget && actionType === 'approve' && (
          <ConfirmModal
            title="Approve Resignation"
            message={`Approve ${actionTarget.employee_name}'s resignation effective ${actionTarget.resignation_date}?`}
            confirmText="Approve"
            confirmClass="btn btn-primary"
            onConfirm={() => handleApprove(actionTarget.id)}
            onCancel={() => setActionTarget(null)}
          />
        )}

        {actionTarget && actionType === 'reject' && (
          <div className="modal-overlay" onClick={() => setActionTarget(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <h2>Reject Resignation</h2>
              <p>Reject {actionTarget.employee_name}'s resignation?</p>
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

        {assetWarning && (
          <div className="modal-overlay" onClick={() => setAssetWarning(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <h2 style={{ color: '#e65100' }}>Unreturned Assets</h2>
              <p style={{ marginBottom: 12 }}>This employee still has the following assets assigned:</p>
              <ul style={{ background: '#fff3e0', borderRadius: 8, padding: '12px 12px 12px 28px', marginBottom: 16 }}>
                {assetWarning.assets.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
              <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: 16 }}>
                Assets must be returned before resignation. You can force approve to bypass this check.
              </p>
              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setAssetWarning(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => handleApprove(assetWarning.id, true)}>Force Approve</button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
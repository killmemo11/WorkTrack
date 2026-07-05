// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';
import { formatDate } from '../../../shared/utils/date';
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
        <div className="glass-page-header">
          <div>
            <h1>Resignation Requests</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{data.length} request{data.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          <div className="glass-form-group" style={{ marginBottom: 0, flex: 1, maxWidth: 240 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Status</label>
            <select className="glass-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
          </div>
        </div>

        <div className="glass-table-wrapper">
          <table className="glass-table">
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
                <tr><td colSpan={7}><div className="glass-empty"><Icon icon="lucide:inbox" style={{fontSize:40,opacity:0.3}} /><h3>No resignation requests found.</h3><p>Nothing to show yet.</p></div></td></tr>
              )}
              {data.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.employee_name}</strong></td>
                  <td>{formatDate(r.resignation_date)}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reason || <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  </td>
                  <td>
                    <span className={`glass-badge ${r.status === 'approved' ? 'glass-badge-success' : r.status === 'rejected' ? 'glass-badge-danger' : 'glass-badge-warning'}`}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                  <td>{r.reviewed_by_name || <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                  <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                    {new Date(r.created_at).toLocaleDateString()
}</td>
                  <td>
                    {r.status === 'pending' && (
                      <div className="action-btns">
                        <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { setActionTarget(r); setActionType('approve'); }}><Icon icon="lucide:check" /> Approve</button>
                        <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => { setActionTarget(r); setActionType('reject'); }}><Icon icon="lucide:x" /> Reject</button>
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
            confirmClass="glass-btn glass-btn-primary"
            onConfirm={() => handleApprove(actionTarget.id)}
            onCancel={() => setActionTarget(null)}
          />
        )}

        {actionTarget && actionType === 'reject' && (
          <div className="glass-modal-overlay" onClick={() => setActionTarget(null)}>
            <div className="glass-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <button className="glass-modal-close" onClick={() => setActionTarget(null)}><Icon icon="lucide:x" /></button>
              <h2>Reject Resignation</h2>
              <p>Reject {actionTarget.employee_name}'s resignation?</p>
              <label style={{ display: 'block', marginTop: 12 }}>
                Reason (optional)
                <textarea className="glass-textarea" value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)} rows={3}
                  style={{ width: '100%', marginTop: 4 }} placeholder="Enter reason..." />
              </label>
              <div className="glass-modal-footer" style={{ marginTop: 16 }}>
                <button className="glass-btn glass-btn-ghost" onClick={() => setActionTarget(null)}>Cancel</button>
                <button className="glass-btn glass-btn-danger" onClick={() => handleReject(actionTarget.id)}><Icon icon="lucide:x" /> Reject</button>
              </div>
            </div>
          </div>
        )}

        {assetWarning && (
          <div className="glass-modal-overlay" onClick={() => setAssetWarning(null)}>
            <div className="glass-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <button className="glass-modal-close" onClick={() => setAssetWarning(null)}><Icon icon="lucide:x" /></button>
              <h2 style={{ color: 'var(--warning)' }}><Icon icon="lucide:alert-triangle" /> Unreturned Assets</h2>
              <p style={{ marginBottom: 12 }}>This employee still has the following assets assigned:</p>
              <ul style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-md)', padding: '12px 12px 12px 28px', marginBottom: 16, border: '1px solid rgba(245,158,11,0.2)' }}>
                {assetWarning.assets.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                Assets must be returned before resignation. You can force approve to bypass this check.
              </p>
              <div className="glass-modal-footer">
                <button className="glass-btn glass-btn-ghost" onClick={() => setAssetWarning(null)}>Cancel</button>
                <button className="glass-btn glass-btn-danger" onClick={() => handleApprove(assetWarning.id, true)}>Force Approve</button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

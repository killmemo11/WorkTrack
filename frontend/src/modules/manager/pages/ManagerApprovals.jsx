// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';
import ConfirmModal from '../../../shared/components/ConfirmModal';

const typeLabels = { annual: 'Annual', sick: 'Sick', casual: 'Casual', personal: 'Personal', unpaid: 'Unpaid' };

const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export default function ManagerApprovals() {
  const [tab, setTab] = useState('leaves');
  const [leaves, setLeaves] = useState([]);
  const [signouts, setSignouts] = useState([]);
  const [resignations, setResignations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionKind, setActionKind] = useState('leave');
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [leaveRes, signoutRes, resignRes] = await Promise.all([
        api.get('/manager/approvals'),
        api.get('/manager/signout-requests'),
        api.get('/manager/resignations'),
      ]);
      setLeaves(leaveRes.data);
      setSignouts(signoutRes.data);
      setResignations(resignRes.data);
    } catch (err) { console.error('Failed to load approvals:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApproveLeave = async (id) => {
    try {
      await api.put(`/manager/approvals/${id}/approve`);
      setMessage('Leave approved successfully');
      fetchAll();
    } catch (err) {
      setMessage('Failed to approve: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRejectLeave = async (id) => {
    try {
      await api.put(`/manager/approvals/${id}/reject`, { rejection_reason: rejectionReason });
      setMessage('Leave rejected');
      fetchAll();
    } catch (err) {
      setMessage('Failed to reject: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setRejectionReason('');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleApproveSignout = async (id) => {
    try {
      await api.put(`/manager/signout-requests/${id}/approve`);
      setMessage('Sign-out request approved');
      fetchAll();
    } catch (err) {
      setMessage('Failed to approve: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRejectSignout = async (id) => {
    try {
      await api.put(`/manager/signout-requests/${id}/reject`, { rejection_reason: rejectionReason });
      setMessage('Sign-out request rejected');
      fetchAll();
    } catch (err) {
      setMessage('Failed to reject: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setRejectionReason('');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleApproveResignation = async (id) => {
    try {
      await api.put(`/manager/resignations/${id}/approve`);
      setMessage('Resignation approved');
      fetchAll();
    } catch (err) {
      setMessage('Failed to approve: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRejectResignation = async (id) => {
    try {
      await api.put(`/manager/resignations/${id}/reject`, { rejection_reason: rejectionReason });
      setMessage('Resignation rejected');
      fetchAll();
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
          <h1>Pending Approvals</h1>
          <p className="subtitle">Review and manage requests from your team</p>
        </div>
      </div>

      {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === 'leaves' ? 'tab-active' : ''}`} onClick={() => setTab('leaves')}>
          Leave Requests {leaves.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{leaves.length}</span>}
        </button>
        <button className={`tab ${tab === 'signouts' ? 'tab-active' : ''}`} onClick={() => setTab('signouts')}>
          Sign-Out Requests {signouts.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{signouts.length}</span>}
        </button>
        <button className={`tab ${tab === 'resignations' ? 'tab-active' : ''}`} onClick={() => setTab('resignations')}>
          Resignations {resignations.length > 0 && <span className="badge badge-warning" style={{ marginLeft: 6 }}>{resignations.length}</span>}
        </button>
      </div>

      {tab === 'leaves' && (
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Details</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 && (
              <tr><td colSpan={7} className="empty-state">No pending leave requests from your team.</td></tr>
            )}
            {leaves.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.employee_name}</strong></td>
                <td><span className="badge badge-employee">{typeLabels[item.type] || item.type}</span></td>
                <td>{formatDate(item.start_date)}</td>
                <td>{formatDate(item.end_date)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong>{item.days_count}</strong> day(s){item.reason ? ` – ${item.reason}` : ''}
                </td>
                <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                  {formatDate(item.created_at)}
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-sm btn-primary" onClick={() => { setActionTarget(item); setActionType('approve'); setActionKind('leave'); }}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => { setActionTarget(item); setActionType('reject'); setActionKind('leave'); }}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {tab === 'signouts' && (
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Sign In</th>
              <th>Requested Sign Out</th>
              <th>Notes</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {signouts.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No pending sign-out requests from your team.</td></tr>
            )}
            {signouts.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.employee_name}</strong></td>
                <td className="cell-mono">{formatTime(item.sign_in_time)}</td>
                <td className="cell-mono">{formatTime(item.sign_out_time)}</td>
                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.notes || <span style={{ color: '#999' }}>—</span>}
                </td>
                <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                  {formatDate(item.date || item.created_at)}
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-sm btn-primary" onClick={() => { setActionTarget(item); setActionType('approve'); setActionKind('signout'); }}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => { setActionTarget(item); setActionType('reject'); setActionKind('signout'); }}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {tab === 'resignations' && (
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Resignation Date</th>
              <th>Reason</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {resignations.length === 0 && (
              <tr><td colSpan={5} className="empty-state">No pending resignation requests.</td></tr>
            )}
            {resignations.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.employee_name}</strong></td>
                <td>{formatDate(r.resignation_date)}</td>
                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.reason || <span style={{ color: '#999' }}>—</span>}
                </td>
                <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                  {formatDate(r.created_at)}
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-sm btn-primary" onClick={() => { setActionTarget(r); setActionType('approve'); setActionKind('resignation'); }}>Approve</button>
                    <button className="btn btn-sm btn-danger" onClick={() => { setActionTarget(r); setActionType('reject'); setActionKind('resignation'); }}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {actionTarget && actionType === 'approve' && actionKind === 'leave' && (
        <ConfirmModal
          title="Approve Leave"
          message={`Approve ${actionTarget.employee_name}'s ${typeLabels[actionTarget.type] || actionTarget.type} leave (${formatDate(actionTarget.start_date)} → ${formatDate(actionTarget.end_date)}, ${actionTarget.days_count} day(s))?`}
          confirmText="Approve"
          confirmClass="btn btn-primary"
          onConfirm={() => handleApproveLeave(actionTarget.id)}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {actionTarget && actionType === 'approve' && actionKind === 'signout' && (
        <ConfirmModal
          title="Approve Sign-Out Request"
          message={`Approve ${actionTarget.employee_name}'s sign-out request for ${formatDate(actionTarget.date)} at ${formatTime(actionTarget.sign_out_time)}?`}
          confirmText="Approve"
          confirmClass="btn btn-primary"
          onConfirm={() => handleApproveSignout(actionTarget.id)}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {actionTarget && actionType === 'approve' && actionKind === 'resignation' && (
        <ConfirmModal
          title="Approve Resignation"
          message={`Approve ${actionTarget.employee_name}'s resignation effective ${formatDate(actionTarget.resignation_date)}?`}
          confirmText="Approve"
          confirmClass="btn btn-primary"
          onConfirm={() => handleApproveResignation(actionTarget.id)}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {actionTarget && actionType === 'reject' && (
        <div className="modal-overlay" onClick={() => setActionTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>{actionKind === 'leave' ? 'Reject Leave' : actionKind === 'signout' ? 'Reject Sign-Out Request' : 'Reject Resignation'}</h2>
            <p>Reject {actionTarget.employee_name}'s request?</p>
            <label style={{ display: 'block', marginTop: 12 }}>
              Reason <span style={{ color: 'red' }}>*</span>
              <textarea className="form-control" value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)} rows={3}
                style={{ width: '100%', marginTop: 4 }} placeholder="Enter reason (required)..." />
            </label>
            {!rejectionReason.trim() && <small style={{ color: 'red' }}>You must provide a reason to reject.</small>}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setActionTarget(null)}>Cancel</button>
              <button className="btn btn-danger" disabled={!rejectionReason.trim()} onClick={() => {
                if (actionKind === 'leave') handleRejectLeave(actionTarget.id);
                else if (actionKind === 'signout') handleRejectSignout(actionTarget.id);
                else handleRejectResignation(actionTarget.id);
              }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

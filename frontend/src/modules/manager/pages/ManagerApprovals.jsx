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
  const [headcountReqs, setHeadcountReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionKind, setActionKind] = useState('leave');
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [leaveRes, signoutRes, resignRes, hcRes] = await Promise.all([
        api.get('/manager/approvals'),
        api.get('/manager/signout-requests'),
        api.get('/manager/resignations'),
        api.get('/manager/headcount-approvals').catch(() => ({ data: [] })),
      ]);
      setLeaves(leaveRes.data);
      setSignouts(signoutRes.data);
      setResignations(resignRes.data);
      setHeadcountReqs(hcRes.data);
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

  const handleApproveHeadcount = async (id) => {
    try {
      await api.put(`/manager/headcount-approvals/${id}/approve`);
      setMessage('Headcount request approved, routed to C-Level');
      fetchAll();
    } catch (err) {
      setMessage('Failed to approve: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleRejectHeadcount = async (id) => {
    try {
      await api.put(`/manager/headcount-approvals/${id}/reject`, { rejection_reason: rejectionReason });
      setMessage('Headcount request rejected');
      fetchAll();
    } catch (err) {
      setMessage('Failed to reject: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setRejectionReason('');
    setTimeout(() => setMessage(''), 3000);
  };

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>;

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1><span className="iconify" data-icon="lucide:clipboard-check" style={{ marginRight: 10, verticalAlign: 'middle' }} />Pending Approvals</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Review and manage requests from your team</p>
        </div>
      </div>

      {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}

      <div className="glass-tabs">
        <button className={`glass-tab ${tab === 'leaves' ? 'glass-tab-active' : ''}`} onClick={() => setTab('leaves')}>
          <span className="iconify" data-icon="lucide:calendar-clock" style={{ marginRight: 6 }} />
          Leave Requests {leaves.length > 0 && <span className="glass-badge glass-badge-warning">{leaves.length}</span>}
        </button>
        <button className={`glass-tab ${tab === 'signouts' ? 'glass-tab-active' : ''}`} onClick={() => setTab('signouts')}>
          <span className="iconify" data-icon="lucide:log-out" style={{ marginRight: 6 }} />
          Sign-Out Requests {signouts.length > 0 && <span className="glass-badge glass-badge-warning">{signouts.length}</span>}
        </button>
        <button className={`glass-tab ${tab === 'resignations' ? 'glass-tab-active' : ''}`} onClick={() => setTab('resignations')}>
          <span className="iconify" data-icon="lucide:user-x" style={{ marginRight: 6 }} />
          Resignations {resignations.length > 0 && <span className="glass-badge glass-badge-warning">{resignations.length}</span>}
        </button>
        <button className={`glass-tab ${tab === 'headcount' ? 'glass-tab-active' : ''}`} onClick={() => setTab('headcount')}>
          <span className="iconify" data-icon="lucide:users-round" style={{ marginRight: 6 }} />
          Headcount {headcountReqs.length > 0 && <span className="glass-badge glass-badge-warning">{headcountReqs.length}</span>}
        </button>
      </div>

      {tab === 'leaves' && (
      <div className="glass-table-wrapper fade-in-up">
        <table className="glass-table">
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
              <tr><td colSpan={7} className="glass-empty">No pending leave requests from your team.</td></tr>
            )}
            {leaves.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.employee_name}</strong></td>
                <td><span className="glass-badge glass-badge-default">{typeLabels[item.type] || item.type}</span></td>
                <td>{formatDate(item.start_date)}</td>
                <td>{formatDate(item.end_date)}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong>{item.days_count}</strong> day(s){item.reason ? ` – ${item.reason}` : ''}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {formatDate(item.created_at)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { setActionTarget(item); setActionType('approve'); setActionKind('leave'); }}>
                      <span className="iconify" data-icon="lucide:check" style={{ marginRight: 4 }} />Approve
                    </button>
                    <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => { setActionTarget(item); setActionType('reject'); setActionKind('leave'); }}>
                      <span className="iconify" data-icon="lucide:x" style={{ marginRight: 4 }} />Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {tab === 'signouts' && (
      <div className="glass-table-wrapper fade-in-up">
        <table className="glass-table">
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
              <tr><td colSpan={6} className="glass-empty">No pending sign-out requests from your team.</td></tr>
            )}
            {signouts.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.employee_name}</strong></td>
                <td>{formatTime(item.sign_in_time)}</td>
                <td>{formatTime(item.sign_out_time)}</td>
                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.notes || <span style={{ color: 'var(--text-faint)' }}>—</span>}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {formatDate(item.date || item.created_at)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { setActionTarget(item); setActionType('approve'); setActionKind('signout'); }}>
                      <span className="iconify" data-icon="lucide:check" style={{ marginRight: 4 }} />Approve
                    </button>
                    <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => { setActionTarget(item); setActionType('reject'); setActionKind('signout'); }}>
                      <span className="iconify" data-icon="lucide:x" style={{ marginRight: 4 }} />Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {tab === 'resignations' && (
      <div className="glass-table-wrapper fade-in-up">
        <table className="glass-table">
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
              <tr><td colSpan={5} className="glass-empty">No pending resignation requests.</td></tr>
            )}
            {resignations.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.employee_name}</strong></td>
                <td>{formatDate(r.resignation_date)}</td>
                <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.reason || <span style={{ color: 'var(--text-faint)' }}>—</span>}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {formatDate(r.created_at)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { setActionTarget(r); setActionType('approve'); setActionKind('resignation'); }}>
                      <span className="iconify" data-icon="lucide:check" style={{ marginRight: 4 }} />Approve
                    </button>
                    <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => { setActionTarget(r); setActionType('reject'); setActionKind('resignation'); }}>
                      <span className="iconify" data-icon="lucide:x" style={{ marginRight: 4 }} />Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {tab === 'headcount' && (
      <div className="glass-table-wrapper fade-in-up">
        <table className="glass-table">
          <thead>
            <tr>
              <th>Requester</th>
              <th>Department</th>
              <th>Title</th>
              <th>Qty</th>
              <th>Type</th>
              <th>Priority</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {headcountReqs.length === 0 && (
              <tr><td colSpan={8} className="glass-empty">No pending headcount requests from your team.</td></tr>
            )}
            {headcountReqs.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.requester_name}</strong></td>
                <td>{r.department_name}</td>
                <td>{r.title_name}</td>
                <td>{r.quantity}</td>
                <td><span className="glass-badge glass-badge-info">{r.job_type}</span></td>
                <td>
                  <span className={`glass-badge ${r.priority === 'urgent' ? 'glass-badge-danger' : 'glass-badge-default'}`}>
                    {r.priority === 'urgent' ? 'Urgent' : 'Normal'}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {formatDate(r.created_at)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { setActionTarget(r); setActionType('approve'); setActionKind('headcount'); }}>
                      <span className="iconify" data-icon="lucide:check" style={{ marginRight: 4 }} />Approve
                    </button>
                    <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => { setActionTarget(r); setActionType('reject'); setActionKind('headcount'); }}>
                      <span className="iconify" data-icon="lucide:x" style={{ marginRight: 4 }} />Reject
                    </button>
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
          confirmClass="glass-btn glass-btn-primary"
          onConfirm={() => handleApproveLeave(actionTarget.id)}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {actionTarget && actionType === 'approve' && actionKind === 'signout' && (
        <ConfirmModal
          title="Approve Sign-Out Request"
          message={`Approve ${actionTarget.employee_name}'s sign-out request for ${formatDate(actionTarget.date)} at ${formatTime(actionTarget.sign_out_time)}?`}
          confirmText="Approve"
          confirmClass="glass-btn glass-btn-primary"
          onConfirm={() => handleApproveSignout(actionTarget.id)}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {actionTarget && actionType === 'approve' && actionKind === 'resignation' && (
        <ConfirmModal
          title="Approve Resignation"
          message={`Approve ${actionTarget.employee_name}'s resignation effective ${formatDate(actionTarget.resignation_date)}?`}
          confirmText="Approve"
          confirmClass="glass-btn glass-btn-primary"
          onConfirm={() => handleApproveResignation(actionTarget.id)}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {actionTarget && actionType === 'approve' && actionKind === 'headcount' && (
        <ConfirmModal
          title="Approve Headcount Request"
          message={`Approve ${actionTarget.requester_name}'s request for ${actionTarget.title_name} (${actionTarget.quantity} position(s))? This will route to C-Level for further approval.`}
          confirmText="Approve"
          confirmClass="glass-btn glass-btn-primary"
          onConfirm={() => handleApproveHeadcount(actionTarget.id)}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {actionTarget && actionType === 'reject' && (
        <div className="glass-modal-overlay" onClick={() => setActionTarget(null)}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="glass-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="glass-modal-title">{actionKind === 'leave' ? 'Reject Leave' : actionKind === 'signout' ? 'Reject Sign-Out Request' : actionKind === 'resignation' ? 'Reject Resignation' : 'Reject Headcount Request'}</h2>
              <button className="glass-modal-close" onClick={() => setActionTarget(null)}><span className="iconify" data-icon="lucide:x" /></button>
            </div>
            <div className="glass-card-body">
              <p>Reject {actionTarget.employee_name || actionTarget.requester_name}'s request?</p>
              <label style={{ display: 'block', marginTop: 12 }}>
                Reason <span style={{ color: 'var(--color-danger)' }}>*</span>
                <textarea className="glass-textarea" value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)} rows={3}
                  placeholder="Enter reason (required)..." />
              </label>
              {!rejectionReason.trim() && <small style={{ color: 'var(--color-danger)' }}>You must provide a reason to reject.</small>}
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setActionTarget(null)}>Cancel</button>
              <button className="glass-btn glass-btn-danger" disabled={!rejectionReason.trim()} onClick={() => {
                if (actionKind === 'leave') handleRejectLeave(actionTarget.id);
                else if (actionKind === 'signout') handleRejectSignout(actionTarget.id);
                else if (actionKind === 'resignation') handleRejectResignation(actionTarget.id);
                else handleRejectHeadcount(actionTarget.id);
              }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

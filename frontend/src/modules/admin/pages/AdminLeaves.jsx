// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import { formatDate } from '../../../shared/utils/date';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';

const typeLabels = { annual: 'Annual', sick: 'Sick', casual: 'Casual', personal: 'Personal', unpaid: 'Unpaid' };

export default function AdminLeaves() {
  const [data, setData] = useState({ leaves: [], total: 0, page: 1, totalPages: 1 });
  const [filter, setFilter] = useState('pending');
  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [message, setMessage] = useState('');

  const fetchLeaves = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter) params.set('status', filter);
      const res = await hrApi.get('/leaves?' + params.toString());
      setData(res.data);
    } catch (err) { console.error('Failed to load leaves:', err); setMessage('Failed to load leaves'); }
  };

  useEffect(() => { fetchLeaves(); }, [filter]);

  const handleApprove = async (id) => {
    try {
      await hrApi.put(`/leaves/${id}/approve`);
      setMessage('Leave approved');
      fetchLeaves();
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setActionTarget(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleReject = async (id) => {
    try {
      await hrApi.put(`/leaves/${id}/reject`, { rejection_reason: rejectionReason });
      setMessage('Leave rejected');
      fetchLeaves();
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
            <h1>Leave Management</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{data.total} request(s)</p>
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
              <option value="cancelled">Cancelled</option>
              <option value="">All</option>
            </select>
          </div>
        </div>

        <div className="glass-summary-bar">
          <span style={{ color: 'var(--text-dim)' }}>Total Requests: <strong>{data.total}</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>Showing Page: <strong>{data.page} / {data.totalPages}</strong></span>
        </div>

        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Type</th>
                <th>From &rarr; To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.leaves || []).length === 0 && (
                <tr><td colSpan={10}><div className="glass-empty"><span className="iconify" data-icon="lucide:inbox" style={{fontSize:40,opacity:0.3}}/><h3>No leave requests found.</h3><p>Nothing to show yet.</p></div></td></tr>
              )}
              {(data.leaves || []).map((l) => (
                <tr key={l.id}>
                  <td className="cell-mono">{l.id}</td>
                  <td><strong>{l.employee_name}</strong><br /><span className="cell-mono" style={{ fontSize: '0.75rem' }}>{l.employee_email}</span>
                    {l.is_self_approval && <span className="glass-badge glass-badge-info" style={{marginLeft:4,fontSize:'0.7rem'}}>Self</span>}
                  </td>
                  <td>{l.department_name || <span style={{ color: 'var(--text-faint)' }}>—</span>}</td>
                  <td><span className="glass-badge glass-badge-default">{typeLabels[l.type] || l.type}</span></td>
                  <td>{formatDate(l.start_date)} &rarr; {formatDate(l.end_date)}</td>
                  <td className="cell-mono">{l.days_count}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.reason || <span style={{ color: 'var(--text-faint)' }}>—</span>}
                  </td>
                  <td>
                    <span className={`glass-badge ${l.status === 'approved' ? 'glass-badge-success' : l.status === 'rejected' ? 'glass-badge-danger' : l.status === 'pending' ? 'glass-badge-warning' : 'glass-badge-default'}`}>
                      {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                    </span>
                  </td>
                  <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {l.status === 'pending' && (
                      <div className="action-btns">
                        <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { setActionTarget(l); setActionType('approve'); }}><span className="iconify" data-icon="lucide:check"/> Approve</button>
                        <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => { setActionTarget(l); setActionType('reject'); }}><span className="iconify" data-icon="lucide:x"/> Reject</button>
                      </div>
                    )}
                    {l.rejection_reason && l.status === 'rejected' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }} title={l.rejection_reason}>
                        {l.rejection_reason?.substring(0, 20)}...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchLeaves} />

        {actionTarget && actionType === 'approve' && (
          <ConfirmModal
            title={actionTarget.is_self_approval ? '<span className="iconify" data-icon="lucide:alert-triangle"/> Self-Approval' : 'Approve Leave'}
            message={
              actionTarget.is_self_approval
                ? `You are approving YOUR OWN leave request.\nSince you are the only admin, this is allowed, but please confirm carefully.\n\nApprove ${actionTarget.employee_name}'s ${typeLabels[actionTarget.type] || actionTarget.type} leave (${formatDate(actionTarget.start_date)} \u2192 ${formatDate(actionTarget.end_date)}, ${actionTarget.days_count} day(s))? Balance will be deducted.`
                : `Approve ${actionTarget.employee_name}'s ${typeLabels[actionTarget.type] || actionTarget.type} leave (${formatDate(actionTarget.start_date)} \u2192 ${formatDate(actionTarget.end_date)}, ${actionTarget.days_count} day(s))? Balance will be deducted.`
            }
            confirmText="Approve"
            confirmClass="glass-btn glass-btn-primary"
            onConfirm={() => handleApprove(actionTarget.id)}
            onCancel={() => setActionTarget(null)}
          />
        )}

        {actionTarget && actionType === 'reject' && (
          <div className="glass-modal-overlay" onClick={() => setActionTarget(null)}>
            <div className="glass-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <button className="glass-modal-close" onClick={() => setActionTarget(null)}><span className="iconify" data-icon="lucide:x"/></button>
              <h2>Reject Leave</h2>
              <p>Reject {actionTarget.employee_name}'s request?</p>
              <label style={{ display: 'block', marginTop: 12 }}>
                Reason (optional)
                <textarea className="glass-textarea" value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)} rows={3}
                  style={{ width: '100%', marginTop: 4 }} placeholder="Enter reason..." />
              </label>
              <div className="glass-modal-footer" style={{ marginTop: 16 }}>
                <button className="glass-btn glass-btn-ghost" onClick={() => setActionTarget(null)}>Cancel</button>
                <button className="glass-btn glass-btn-danger" onClick={() => handleReject(actionTarget.id)}><span className="iconify" data-icon="lucide:x"/> Reject</button>
              </div>
            </div>
          </div>
        )}
      </div>
   
  );
}

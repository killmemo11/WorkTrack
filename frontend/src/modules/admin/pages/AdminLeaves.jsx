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
        <div className="page-header">
          <div>
            <h1>Leave Management</h1>
            <p className="subtitle">{data.total} request(s)</p>
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
              <option value="cancelled">Cancelled</option>
              <option value="">All</option>
            </select>
          </div>
        </div>

        <div className="summary-bar">
          <span className="summary-item">Total Requests: <strong>{data.total}</strong></span>
          <span className="summary-item">Showing Page: <strong>{data.page} / {data.totalPages}</strong></span>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Type</th>
                <th>From → To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.leaves || []).length === 0 && (
                <tr><td colSpan={10} className="empty-state">No leave requests found.</td></tr>
              )}
              {(data.leaves || []).map((l) => (
                <tr key={l.id}>
                  <td className="cell-mono">{l.id}</td>
                  <td><strong>{l.employee_name}</strong><br /><span className="cell-mono" style={{ fontSize: '0.75rem' }}>{l.employee_email}</span>
                    {l.is_self_approval && <span className="badge" style={{background:'#8b5cf620',color:'#8b5cf6',border:'1px solid #8b5cf640',marginLeft:4,fontSize:'0.7rem'}}>Self</span>}
                  </td>
                  <td>{l.department_name || <span style={{ color: '#999' }}>—</span>}</td>
                  <td><span className="badge badge-employee">{typeLabels[l.type] || l.type}</span></td>
                  <td>{formatDate(l.start_date)} → {formatDate(l.end_date)}</td>
                  <td className="cell-mono">{l.days_count}</td>
                  <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.reason || <span style={{ color: '#999' }}>—</span>}
                  </td>
                  <td>
                    <span className={`badge ${l.status === 'approved' ? 'badge-active' : l.status === 'rejected' ? 'badge-inactive' : ''}`}
                      style={l.status === 'pending' ? { background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40' } : l.status === 'cancelled' ? { background: '#6b728020', color: '#6b7280', border: '1px solid #6b728040' } : {}}>
                      {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                    </span>
                  </td>
                  <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {l.status === 'pending' && (
                      <div className="action-btns">
                        <button className="btn btn-sm btn-primary" onClick={() => { setActionTarget(l); setActionType('approve'); }}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => { setActionTarget(l); setActionType('reject'); }}>Reject</button>
                      </div>
                    )}
                    {l.rejection_reason && l.status === 'rejected' && (
                      <span style={{ fontSize: '0.75rem', color: '#999' }} title={l.rejection_reason}>
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
            title={actionTarget.is_self_approval ? '⚠️ Self-Approval' : 'Approve Leave'}
            message={
              actionTarget.is_self_approval
                ? `You are approving YOUR OWN leave request.\nSince you are the only admin, this is allowed, but please confirm carefully.\n\nApprove ${actionTarget.employee_name}'s ${typeLabels[actionTarget.type] || actionTarget.type} leave (${formatDate(actionTarget.start_date)} → ${formatDate(actionTarget.end_date)}, ${actionTarget.days_count} day(s))? Balance will be deducted.`
                : `Approve ${actionTarget.employee_name}'s ${typeLabels[actionTarget.type] || actionTarget.type} leave (${formatDate(actionTarget.start_date)} → ${formatDate(actionTarget.end_date)}, ${actionTarget.days_count} day(s))? Balance will be deducted.`
            }
            confirmText="Approve"
            confirmClass="btn btn-primary"
            onConfirm={() => handleApprove(actionTarget.id)}
            onCancel={() => setActionTarget(null)}
          />
        )}

        {actionTarget && actionType === 'reject' && (
          <div className="modal-overlay" onClick={() => setActionTarget(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <h2>Reject Leave</h2>
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

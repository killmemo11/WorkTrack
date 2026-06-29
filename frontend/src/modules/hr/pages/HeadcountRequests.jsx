// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';


const statusColors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };
const priorityColors = { normal: '#6b7280', urgent: '#ef4444' };

export default function HeadcountRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approveId, setApproveId] = useState(null);
  const [autoCreateJob, setAutoCreateJob] = useState(true);
  const [approving, setApproving] = useState(false);

  const fetchRequests = () => {
    setLoading(true);
    setError('');
    const url = filterStatus ? `/headcount-requests?status=${filterStatus}` : '/headcount-requests';
    hrApi.get(url).then(({ data }) => setRequests(data))
      .catch(e => { console.error(e); setError('Failed to load requests'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, [filterStatus]);

  const handleApprove = async () => {
    if (!approveId) return;
    setApproving(true);
    try {
      await hrApi.put(`/headcount-requests/${approveId}/approve`, { auto_create_job: autoCreateJob });
      setApproveId(null);
      setAutoCreateJob(true);
      fetchRequests();
    } catch (e) { alert(e.response?.data?.error || 'Failed to approve'); }
    finally { setApproving(false); }
  };

  const handleReject = async () => {
    if (!rejectId) return;
    setRejecting(true);
    try {
      await hrApi.put(`/headcount-requests/${rejectId}/reject`, { rejection_reason: rejectReason });
      setRejectId(null);
      setRejectReason('');
      fetchRequests();
    } catch (e) { alert(e.response?.data?.error || 'Failed to reject'); }
    finally { setRejecting(false); }
  };

  const summary = { total: 0, pending: 0, approved: 0, rejected: 0 };
  if (!loading && !error) {
    requests.forEach(r => { summary.total++; summary[r.status]++; });
  }

  return (
    <>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Headcount Requests</h1>
            <p className="subtitle">Review and manage position requests from managers</p>
          </div>
        </div>

        {!loading && !error && (
          <div className="dashboard-stats-row" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total', value: summary.total, color: '#6366f1', icon: '📋' },
              { label: 'Pending', value: summary.pending, color: '#f59e0b', icon: '⏳' },
              { label: 'Approved', value: summary.approved, color: '#22c55e', icon: '✅' },
              { label: 'Rejected', value: summary.rejected, color: '#ef4444', icon: '❌' },
            ].map(s => (
              <div key={s.label} className="mini-stat-card" style={{ borderTop: `3px solid ${s.color}` }}>
                <div className="mini-stat-icon">{s.icon}</div>
                <div className="mini-stat-number" style={{ color: s.color }}>{s.value}</div>
                <div className="mini-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilterStatus(s)}
              style={{ borderRadius: 20, padding: '4px 14px', textTransform: 'capitalize' }}>
              {s}
            </button>
          ))}
        </div>

        {loading ? <div className="loading" />
        : error ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3>Something went wrong</h3>
            <p style={{ color: '#6b7280' }}>{error}</p>
            <button className="btn btn-outline" onClick={() => { setLoading(true); fetchRequests(); }}
              style={{ marginTop: 12, borderRadius: 8 }}>Try Again</button>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h3>No {filterStatus === 'all' ? '' : filterStatus} requests</h3>
            <p className="subtitle">All requests will appear here once managers submit them.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Title</th>
                  <th>Qty</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td><strong>{r.requester_name}</strong></td>
                    <td>{r.department_name}</td>
                    <td>{r.title_name}</td>
                    <td className="cell-mono">{r.quantity}</td>
                    <td><span className="badge badge-secondary">{r.job_type}</span></td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        color: priorityColors[r.priority] || '#6b7280', fontWeight: 600, fontSize: 13
                      }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: priorityColors[r.priority] || '#6b7280', display: 'inline-block'
                        }} />
                        {r.priority === 'urgent' ? 'Urgent' : 'Normal'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: `${statusColors[r.status]}15`,
                        color: statusColors[r.status],
                        border: `1px solid ${statusColors[r.status]}30`,
                        textTransform: 'capitalize'
                      }}>
                        {r.status === 'approved' ? '✓' : r.status === 'rejected' ? '✗' : '○'}
                        {r.status}
                      </span>
                    </td>
                    <td className="cell-mono">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-success"
                            onClick={() => setApproveId(r.id)}
                            style={{ borderRadius: 6, fontSize: 12 }}>Approve</button>
                          <button className="btn btn-sm btn-danger"
                            onClick={() => setRejectId(r.id)}
                            style={{ borderRadius: 6, fontSize: 12 }}>Reject</button>
                        </div>
                      ) : r.status === 'rejected' && r.rejection_reason ? (
                        <span style={{ fontSize: 12, color: '#6b7280', cursor: 'default', borderBottom: '1px dashed #d1d5db' }}
                          title={r.rejection_reason}>
                          {r.rejection_reason.length > 25 ? r.rejection_reason.substring(0, 25) + '…' : r.rejection_reason}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approveId && (
        <div className="modal-overlay" onClick={() => { setApproveId(null); setAutoCreateJob(true); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ padding: '24px 24px 0' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Approve Request</h2>
              <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
                This request will be marked as approved. You can optionally create a job posting.
              </p>
            </div>
            <div style={{ padding: '20px 24px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={autoCreateJob}
                  onChange={e => setAutoCreateJob(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#22c55e' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Auto-create job posting</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>A new job post will be created with the same title and department</div>
                </div>
              </label>
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => { setApproveId(null); setAutoCreateJob(true); }}
                style={{ borderRadius: 8, padding: '8px 20px' }}>Cancel</button>
              <button className="btn btn-success" onClick={handleApprove} disabled={approving}
                style={{ borderRadius: 8, padding: '8px 20px', minWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {approving ? <span className="spinner-sm" /> : 'Confirm Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="modal-overlay" onClick={() => { setRejectId(null); setRejectReason(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ padding: '24px 24px 0' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Reject Request</h2>
              <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
                Provide a reason so the requester understands why.
              </p>
            </div>
            <div style={{ padding: '16px 24px 0' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' }}>Reason</label>
                <textarea className="form-control" rows={3} value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Budget constraints, position not approved yet..."
                  style={{ borderRadius: 8, padding: '8px 12px', width: '100%', resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => { setRejectId(null); setRejectReason(''); }}
                style={{ borderRadius: 8, padding: '8px 20px' }}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject} disabled={rejecting}
                style={{ borderRadius: 8, padding: '8px 20px', minWidth: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {rejecting ? <span className="spinner-sm" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
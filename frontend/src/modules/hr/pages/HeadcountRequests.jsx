import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

function ApprovalStage({ status, label }) {
  const colorMap = { pending: 'glass-badge-warning', approved: 'glass-badge-success', rejected: 'glass-badge-danger' };
  const icon = status === 'approved' ? 'lucide:check-circle-2' : status === 'rejected' ? 'lucide:x-circle' : 'lucide:clock';
  return (
    <span className={`glass-badge ${colorMap[status] || 'glass-badge-secondary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
      <span className="iconify" data-icon={icon} style={{ fontSize: 12 }} />
      {label}: {status}
    </span>
  );
}

function StageProgress({ r }) {
  const stages = [];
  if (r.requester_role !== 'admin' && r.requester_role !== 'hr') {
    stages.push({ key: 'manager_status', label: 'Manager', status: r.manager_status });
  }
  const isManagerOrAbove = r.requester_role === 'manager' || r.requester_email === r.manager_email;
  if (isManagerOrAbove || r.manager_status === 'approved') {
    stages.push({ key: 'ceo_status', label: 'C-Level', status: r.ceo_status });
  }
  stages.push({ key: 'status', label: 'HR', status: r.status });

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      {stages.map((s, i) => (
        <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ApprovalStage status={s.status} label={s.label} />
          {i < stages.length - 1 && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>→</span>}
        </div>
      ))}
    </div>
  );
}

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
      setFilterStatus('all');
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
      setFilterStatus('all');
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
        <div className="glass-page-header">
          <div>
            <h1>Headcount Requests</h1>
            <p className="subtitle">Review and manage position requests from managers</p>
          </div>
        </div>

        {!loading && !error && (
          <div className="glass-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
            {[
              { label: 'Total', value: summary.total, icon: 'lucide:clipboard-list', class: 'gradient-indigo' },
              { label: 'Pending', value: summary.pending, icon: 'lucide:clock', class: 'gradient-amber' },
              { label: 'Approved', value: summary.approved, icon: 'lucide:check-circle', class: 'gradient-green' },
              { label: 'Rejected', value: summary.rejected, icon: 'lucide:x-circle', class: 'gradient-red' },
            ].map(s => (
              <div key={s.label} className="glass-stat-card card-hover fade-in-up">
                <div className="stat-icon"><span className="iconify" data-icon={s.icon} /></div>
                <div className="stat-number">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="glass-tabs" style={{ marginBottom: 16 }}>
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} className={`glass-tab ${filterStatus === s ? 'glass-tab-active' : ''}`}
              onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>
        : error ? (
          <div className="glass-empty">
            <span className="iconify" data-icon="lucide:alert-triangle" style={{ fontSize: 48, color: 'var(--text-dim)' }} />
            <h3>Something went wrong</h3>
            <p style={{ color: 'var(--text-dim)' }}>{error}</p>
            <button className="glass-btn glass-btn-ghost" onClick={() => { setLoading(true); fetchRequests(); }}>
              <span className="iconify" data-icon="lucide:refresh-cw" style={{ marginRight: 6 }} /> Try Again
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-empty">
            <span className="iconify" data-icon="lucide:inbox" style={{ fontSize: 48, color: 'var(--text-dim)' }} />
            <h3>No {filterStatus === 'all' ? '' : filterStatus} requests</h3>
            <p className="subtitle">All requests will appear here once managers submit them.</p>
          </div>
        ) : (
          <div className="glass-table-wrapper">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Department</th>
                  <th>Title</th>
                  <th>Qty</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Approval Stages</th>
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
                    <td><span className="glass-badge glass-badge-secondary">{r.job_type}</span></td>
                    <td>
                      <span className={`glass-badge ${r.priority === 'urgent' ? 'glass-badge-danger' : 'glass-badge-secondary'}`}>
                        <span className="iconify" data-icon={r.priority === 'urgent' ? 'lucide:alert-triangle' : 'lucide:minimize-2'} style={{ marginRight: 4, fontSize: 10 }} />
                        {r.priority === 'urgent' ? 'Urgent' : 'Normal'}
                      </span>
                    </td>
                    <td><StageProgress r={r} /></td>
                    <td className="cell-mono">
                      {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="glass-btn glass-btn-success glass-btn-sm"
                            onClick={() => setApproveId(r.id)}>Approve</button>
                          <button className="glass-btn glass-btn-danger glass-btn-sm"
                            onClick={() => setRejectId(r.id)}>Reject</button>
                        </div>
                      ) : r.status === 'rejected' && r.rejection_reason ? (
                        <span className="glass-badge glass-badge-secondary" title={r.rejection_reason}>
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
        <div className="glass-modal-overlay" onClick={() => { setApproveId(null); setAutoCreateJob(true); }}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="glass-modal-close" onClick={() => { setApproveId(null); setAutoCreateJob(true); }} />
            <div className="glass-card-body">
              <h2 style={{ margin: 0, fontSize: 18 }}>Approve Request</h2>
              <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 14 }}>
                This will be the final approval. Intermediate stages will be auto-approved.
              </p>
            </div>
            <div className="glass-card-body" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
              <label className="glass-checkbox" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={autoCreateJob}
                  onChange={e => setAutoCreateJob(e.target.checked)} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Auto-create job posting</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>A new job post will be created with the same title and department</div>
                </div>
              </label>
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => { setApproveId(null); setAutoCreateJob(true); }}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleApprove} disabled={approving}>
                {approving ? <span className="spinner-sm" /> : <>Confirm Approve <span className="iconify" data-icon="lucide:check" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="glass-modal-overlay" onClick={() => { setRejectId(null); setRejectReason(''); }}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="glass-modal-close" onClick={() => { setRejectId(null); setRejectReason(''); }} />
            <div className="glass-card-body">
              <h2 style={{ margin: 0, fontSize: 18 }}>Reject Request</h2>
              <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: 14 }}>
                Provide a reason so the requester understands why.
              </p>
            </div>
            <div className="glass-card-body" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: 16 }}>
              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Reason</label>
                <textarea className="glass-textarea" rows={3} value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Budget constraints, position not approved yet..." />
              </div>
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => { setRejectId(null); setRejectReason(''); }}>Cancel</button>
              <button className="glass-btn glass-btn-danger" onClick={handleReject} disabled={rejecting}>
                {rejecting ? <span className="spinner-sm" /> : <>Confirm Reject <span className="iconify" data-icon="lucide:x" /></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

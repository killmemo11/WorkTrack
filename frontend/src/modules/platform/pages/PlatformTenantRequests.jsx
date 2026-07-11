// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';
import Pagination from '../../../shared/components/Pagination';

const STATUS_BADGE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

export default function PlatformTenantRequests() {
  const [data, setData] = useState({ requests: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingRequest, setViewingRequest] = useState(null);

  const fetchRequests = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('platformToken');
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      const res = await fetch(`/api/platform/tenant-requests?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(1); }, [statusFilter]);

  const handleApprove = async (id) => {
    const req = data.requests.find(r => r.id === id);
    const planName = req?.requested_plan || 'trial';
    if (!confirm(`Approve this tenant request? Plan: ${planName}. This will create the tenant and send a magic link to the admin.`)) return;
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenant-requests/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchRequests(data.page);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to approve');
      }
    } catch (err) {
      alert('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/tenant-requests/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: reason }),
      });
      if (res.ok) {
        fetchRequests(data.page);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to reject');
      }
    } catch (err) {
      alert('Failed to reject');
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <h1>Tenant Requests</h1>
        <p>Review and approve/reject new tenant signup requests</p>
      </div>

      <div className="glass-card">
        <div className="platform-filters">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-select">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="glass-loading"><div className="spinner" /><span>Loading requests...</span></div>
        ) : data.requests.length === 0 ? (
          <div className="platform-empty-state">
            <Icon icon="lucide:inbox" size={48} />
            <h3>No Requests Found</h3>
            <p>{statusFilter ? `No ${statusFilter} requests` : 'No tenant requests yet'}</p>
          </div>
        ) : (
          <>
            <div className="platform-table-wrapper">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Plan</th>
                    <th>Employees</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.requests.map((req) => (
                    <tr key={req.id}>
                      <td>
                        <div className="platform-table-company">
                          <strong>{req.company_name}</strong>
                          {req.created_tenant_id && <span className="tenant-id-badge">Tenant #{req.created_tenant_id}</span>}
                        </div>
                      </td>
                      <td>
                        <div>{req.contact_email}</div>
                        {req.contact_phone && <div className="text-dim text-sm">{req.contact_phone}</div>}
                      </td>
                      <td>
                        <span className="glass-badge glass-badge-info platform-capitalize">
                          {req.requested_plan || 'trial'}
                        </span>
                      </td>
                      <td>{req.employee_count}</td>
                      <td>
                        <span className={`glass-badge glass-badge-${STATUS_BADGE[req.status] || 'default'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>{formatDate(req.created_at)}</td>
                      <td>
                        <div className="platform-table-actions">
                          <button onClick={() => setViewingRequest(req)} className="glass-btn glass-btn-sm glass-btn-ghost">
                            <Icon icon="lucide:eye" size={14} /> View
                          </button>
                          {req.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(req.id)} className="glass-btn glass-btn-sm glass-btn-success">
                                <Icon icon="lucide:check" size={14} /> Approve
                              </button>
                              <button onClick={() => handleReject(req.id)} className="glass-btn glass-btn-sm glass-btn-error">
                                <Icon icon="lucide:x" size={14} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <Pagination
                currentPage={data.page}
                totalPages={data.totalPages}
                onPageChange={fetchRequests}
              />
            )}
          </>
        )}
      </div>

      {viewingRequest && (
        <div className="platform-modal-overlay" onClick={() => setViewingRequest(null)}>
          <div className="platform-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h3>Request Details</h3>
              <button onClick={() => setViewingRequest(null)} className="glass-btn glass-btn-ghost glass-btn-sm">
                <Icon icon="lucide:x" size={18} />
              </button>
            </div>
            <div className="platform-modal-body">
              <div className="platform-detail-grid">
                <div><label>Company</label><span>{viewingRequest.company_name}</span></div>
                <div><label>Contact Email</label><span>{viewingRequest.contact_email}</span></div>
                <div><label>Contact Phone</label><span>{viewingRequest.contact_phone || '—'}</span></div>
                <div><label>Requested Plan</label><span className="platform-capitalize">{viewingRequest.requested_plan || 'trial'}</span></div>
                <div><label>Employees</label><span>{viewingRequest.employee_count}</span></div>
                <div><label>Status</label><span><span className={`glass-badge glass-badge-${STATUS_BADGE[viewingRequest.status] || 'default'}`}>{viewingRequest.status}</span></span></div>
                <div><label>Requested</label><span>{formatDate(viewingRequest.created_at)}</span></div>
                {viewingRequest.reviewed_at && <div><label>Reviewed</label><span>{formatDate(viewingRequest.reviewed_at)}</span></div>}
                {viewingRequest.rejection_reason && <div><label>Rejection Reason</label><span>{viewingRequest.rejection_reason}</span></div>}
                {viewingRequest.created_tenant_id && <div><label>Created Tenant ID</label><span>#{viewingRequest.created_tenant_id}</span></div>}
              </div>
              <div className="platform-modal-footer">
                {viewingRequest.message && (
                  <div className="platform-message">
                    <label>Message:</label>
                    <p>{viewingRequest.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';
import Pagination from '../../../shared/components/Pagination';
import { isValidHttpUrl } from '../../../shared/utils/sanitize';
import platformApi from '../../../shared/api/platformApi';

const STATUS_BADGE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const PAYMENT_STATUS_BADGE = {
  pending: 'warning',
  verified: 'success',
  rejected: 'error',
};

export default function PlatformTenantRequests() {
  const [data, setData] = useState({ requests: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewingRequest, setViewingRequest] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchRequests = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const res = await platformApi.get('/tenant-requests', { params });
      setData(res.data);
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
      await platformApi.post(`/tenant-requests/${id}/approve`, {});
      fetchRequests(data.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Reason for rejection (optional):');
    if (reason === null) return;
    try {
      await platformApi.post(`/tenant-requests/${id}/reject`, { rejection_reason: reason });
      fetchRequests(data.page);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    }
  };

  const handleVerifyPayment = async (id) => {
    if (!confirm('Mark this payment as verified?')) return;
    try {
      await platformApi.post(`/tenant-requests/${id}/verify-payment`, {});
      fetchRequests(data.page);
      setShowPaymentModal(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to verify payment');
    }
  };

  const handleRejectPayment = async (id) => {
    if (!rejectionReason.trim()) { alert('Please enter a rejection reason'); return; }
    try {
      await platformApi.post(`/tenant-requests/${id}/reject-payment`, { rejection_reason: rejectionReason.trim() });
      fetchRequests(data.page);
      setShowPaymentModal(null);
      setRejectionReason('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject payment');
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
                    <th>Payment</th>
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
                      <td>
                        {req.payment_status ? (
                          <span className={`glass-badge glass-badge-${PAYMENT_STATUS_BADGE[req.payment_status] || 'default'}`}>
                            {req.payment_status}
                          </span>
                        ) : (
                          <span className="text-dim text-sm">—</span>
                        )}
                      </td>
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
                          {req.payment_proof_url && req.payment_status === 'pending' && (
                            <button onClick={() => setShowPaymentModal(req)} className="glass-btn glass-btn-sm glass-btn-success">
                              <Icon icon="lucide:credit-card" size={14} /> Payment
                            </button>
                          )}
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
                <div><label>Contact Person</label><span>{viewingRequest.contact_person_name || '—'} {viewingRequest.contact_person_title ? `(${viewingRequest.contact_person_title})` : ''}</span></div>
                <div><label>Industry</label><span>{viewingRequest.industry || '—'}</span></div>
                <div><label>Website</label><span>{viewingRequest.website || '—'}</span></div>
                <div><label>Requested Plan</label><span className="platform-capitalize">{viewingRequest.requested_plan || 'trial'}</span></div>
                <div><label>Employees</label><span>{viewingRequest.employee_count}</span></div>
                <div><label>Status</label><span><span className={`glass-badge glass-badge-${STATUS_BADGE[viewingRequest.status] || 'default'}`}>{viewingRequest.status}</span></span></div>
                <div><label>Payment Status</label><span><span className={`glass-badge glass-badge-${PAYMENT_STATUS_BADGE[viewingRequest.payment_status] || 'default'}`}>{viewingRequest.payment_status || 'N/A'}</span></span></div>
                {viewingRequest.payment_amount && <div><label>Payment Amount</label><span>{viewingRequest.payment_amount} {viewingRequest.payment_currency || 'EGP'}</span></div>}
                {viewingRequest.payment_method && <div><label>Payment Method</label><span className="platform-capitalize">{viewingRequest.payment_method}</span></div>}
                {viewingRequest.payment_proof_url && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Payment Proof</label>
                    <div style={{ marginTop: 8 }}>
                      <a href={isValidHttpUrl(viewingRequest.payment_proof_url) ? viewingRequest.payment_proof_url : '#'} target="_blank" rel="noopener noreferrer" className="glass-btn glass-btn-sm glass-btn-ghost">
                        <Icon icon="lucide:external-link" size={14} /> View Proof
                      </a>
                    </div>
                  </div>
                )}
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
                {viewingRequest.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setViewingRequest(null); handleApprove(viewingRequest.id); }} className="glass-btn glass-btn-success">
                      <Icon icon="lucide:check" size={14} /> Approve Request
                    </button>
                    <button onClick={() => { setViewingRequest(null); handleReject(viewingRequest.id); }} className="glass-btn glass-btn-error">
                      <Icon icon="lucide:x" size={14} /> Reject Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="platform-modal-overlay" onClick={() => { setShowPaymentModal(null); setRejectionReason(''); }}>
          <div className="platform-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h3>Verify Payment</h3>
              <button onClick={() => { setShowPaymentModal(null); setRejectionReason(''); }} className="glass-btn glass-btn-ghost glass-btn-sm">
                <Icon icon="lucide:x" size={18} />
              </button>
            </div>
            <div className="platform-modal-body">
              <div className="platform-detail-grid">
                <div><label>Company</label><span>{showPaymentModal.company_name}</span></div>
                <div><label>Plan</label><span className="platform-capitalize">{showPaymentModal.requested_plan}</span></div>
                <div><label>Payment Amount</label><span>{showPaymentModal.payment_amount || '—'} {showPaymentModal.payment_currency || 'EGP'}</span></div>
                <div><label>Payment Method</label><span className="platform-capitalize">{showPaymentModal.payment_method || '—'}</span></div>
                <div><label>Status</label><span><span className={`glass-badge glass-badge-${PAYMENT_STATUS_BADGE[showPaymentModal.payment_status] || 'default'}`}>{showPaymentModal.payment_status}</span></span></div>
              </div>
              {showPaymentModal.payment_proof_url && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem', color: '#a1a1aa' }}>Payment Proof Screenshot</label>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 8, display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={showPaymentModal.payment_proof_url}
                      alt="Payment Proof"
                      style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, objectFit: 'contain' }}
                    />
                  </div>
                </div>
              )}
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem', color: '#a1a1aa' }}>Rejection Reason</label>
                <input
                  type="text"
                  placeholder="Optional rejection reason"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                    color: '#f4f4f5', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div className="platform-modal-footer" style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => handleVerifyPayment(showPaymentModal.id)} className="glass-btn glass-btn-success">
                <Icon icon="lucide:check" size={14} /> Verify Payment
              </button>
              <button onClick={() => handleRejectPayment(showPaymentModal.id)} className="glass-btn glass-btn-error">
                <Icon icon="lucide:x" size={14} /> Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import Pagination from '../../../shared/components/Pagination';

const STATUS_BADGE = {
  pending: 'warning',
  verified: 'success',
  rejected: 'error',
};

export default function PlatformPayments() {
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [viewingTx, setViewingTx] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchPayments = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('platformToken');
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.append('status', statusFilter);
      if (methodFilter) params.append('method', methodFilter);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      const res = await fetch(`/api/platform/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(1); }, [statusFilter, methodFilter, dateFrom, dateTo]);

  const handleVerify = async (id) => {
    if (!confirm('Mark this payment as verified?')) return;
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/payments/${id}/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) { fetchPayments(data.page); setViewingTx(null); }
      else { const err = await res.json(); alert(err.error || 'Failed'); }
    } catch { alert('Failed'); }
  };

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) { alert('Enter a rejection reason'); return; }
    try {
      const token = localStorage.getItem('platformToken');
      const res = await fetch(`/api/platform/payments/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason.trim() }),
      });
      if (res.ok) { fetchPayments(data.page); setViewingTx(null); setRejectionReason(''); }
      else { const err = await res.json(); alert(err.error || 'Failed'); }
    } catch { alert('Failed'); }
  };

  const formatAmount = (amt, cur) => {
    if (!amt) return '—';
    return `${Number(amt).toLocaleString()} ${cur || 'EGP'}`;
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Payment Transactions</h1>
          <p>Track and verify all payment operations across tenants</p>
        </div>
      </div>

      <div className="glass-card">
        <div className="platform-filters" style={{ flexWrap: 'wrap', gap: 8 }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-select">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="glass-select">
            <option value="">All Methods</option>
            <option value="instapay">InstaPay</option>
            <option value="vodafone_cash">Vodafone Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="glass-input" style={{ width: 150 }} />
          <span style={{ color: '#71717a', alignSelf: 'center' }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="glass-input" style={{ width: 150 }} />
        </div>

        {loading ? (
          <div className="glass-loading"><div className="spinner" /><span>Loading payments...</span></div>
        ) : data.transactions.length === 0 ? (
          <div className="platform-empty-state">
            <Icon icon="lucide:banknote" size={48} />
            <h3>No Payments Found</h3>
            <p>{statusFilter || methodFilter || dateFrom || dateTo ? 'Try adjusting your filters' : 'No payment transactions yet'}</p>
          </div>
        ) : (
          <>
            <div className="platform-table-wrapper">
              <table className="platform-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Verified By</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        <div>
                          <strong>{tx.company_name || '—'}</strong>
                          <div className="text-dim text-sm">{tx.contact_email}</div>
                        </div>
                      </td>
                      <td>
                        <span className="glass-badge glass-badge-info platform-capitalize">{tx.requested_plan || '—'}</span>
                      </td>
                      <td>
                        <strong style={{ color: '#22c55e' }}>{formatAmount(tx.amount, tx.currency)}</strong>
                      </td>
                      <td className="platform-capitalize">{tx.payment_method || '—'}</td>
                      <td>
                        <span className={`glass-badge glass-badge-${STATUS_BADGE[tx.status] || 'default'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td>{tx.verified_by_name || '—'}</td>
                      <td>{formatDate(tx.created_at)}</td>
                      <td>
                        <div className="platform-table-actions">
                          <button onClick={() => setViewingTx(tx)} className="glass-btn glass-btn-sm glass-btn-ghost">
                            <Icon icon="lucide:eye" size={14} /> View
                          </button>
                          {tx.status === 'pending' && (
                            <>
                              <button onClick={() => handleVerify(tx.id)} className="glass-btn glass-btn-sm glass-btn-success">
                                <Icon icon="lucide:check" size={14} />
                              </button>
                              <button onClick={() => { setViewingTx(tx); setRejectionReason(''); }} className="glass-btn glass-btn-sm glass-btn-error">
                                <Icon icon="lucide:x" size={14} />
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
              <Pagination currentPage={data.page} totalPages={data.totalPages} onPageChange={fetchPayments} />
            )}
          </>
        )}
      </div>

      {viewingTx && (
        <div className="platform-modal-overlay" onClick={() => { setViewingTx(null); setRejectionReason(''); }}>
          <div className="platform-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="platform-modal-header">
              <h3>Payment Details</h3>
              <button onClick={() => { setViewingTx(null); setRejectionReason(''); }} className="glass-btn glass-btn-ghost glass-btn-sm">
                <Icon icon="lucide:x" size={18} />
              </button>
            </div>
            <div className="platform-modal-body">
              <div className="platform-detail-grid">
                <div><label>Company</label><span>{viewingTx.company_name || '—'}</span></div>
                <div><label>Email</label><span>{viewingTx.contact_email}</span></div>
                <div><label>Plan</label><span className="platform-capitalize">{viewingTx.requested_plan}</span></div>
                <div><label>Amount</label><span style={{ color: '#22c55e', fontWeight: 700 }}>{formatAmount(viewingTx.amount, viewingTx.currency)}</span></div>
                <div><label>Method</label><span className="platform-capitalize">{viewingTx.payment_method}</span></div>
                <div><label>Status</label><span><span className={`glass-badge glass-badge-${STATUS_BADGE[viewingTx.status] || 'default'}`}>{viewingTx.status}</span></span></div>
                <div><label>Submitted</label><span>{formatDate(viewingTx.created_at)}</span></div>
                {viewingTx.verified_at && <div><label>Verified At</label><span>{formatDate(viewingTx.verified_at)}</span></div>}
                {viewingTx.verified_by_name && <div><label>Verified By</label><span>{viewingTx.verified_by_name}</span></div>}
                {viewingTx.rejection_reason && <div style={{ gridColumn: '1 / -1' }}><label>Rejection Reason</label><span>{viewingTx.rejection_reason}</span></div>}
              </div>
              {viewingTx.payment_proof_url && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem', color: '#a1a1aa' }}>Payment Proof</label>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 8, display: 'flex', justifyContent: 'center' }}>
                    <img src={viewingTx.payment_proof_url} alt="Payment Proof" style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, objectFit: 'contain' }} />
                  </div>
                </div>
              )}
              {viewingTx.status === 'pending' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: '0.82rem', color: '#a1a1aa' }}>Rejection Reason (optional)</label>
                  <input
                    type="text"
                    placeholder="Enter reason for rejection"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                      color: '#f4f4f5', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>
            {viewingTx.status === 'pending' && (
              <div className="platform-modal-footer" style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleVerify(viewingTx.id)} className="glass-btn glass-btn-success">
                  <Icon icon="lucide:check" size={14} /> Verify Payment
                </button>
                <button onClick={() => handleReject(viewingTx.id)} className="glass-btn glass-btn-error">
                  <Icon icon="lucide:x" size={14} /> Reject Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

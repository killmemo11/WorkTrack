// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/api';
import LeaveFormModal from '../../../shared/components/LeaveFormModal';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import ResignationModal from '../../../shared/components/ResignationModal';

const typeLabels = { annual: 'Annual', sick: 'Sick', casual: 'Casual', personal: 'Personal', unpaid: 'Unpaid' };
const statusBadgeMap = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'default' };

const formatDate = (d) => {
  if (!d) return '\u2014';
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};

export default function Requests() {
  const [tab, setTab] = useState('missing-signout');

  // Missing Sign Out state
  const [records, setRecords] = useState([]);
  const [signoutRequests, setSignoutRequests] = useState([]);
  const [form, setForm] = useState({ recordId: null, signOutTime: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Leaves state
  const [leaveData, setLeaveData] = useState({ leaves: [], balances: [] });
  const [showForm, setShowForm] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [showResignation, setShowResignation] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLeaves = useMemo(() => {
    return leaveData.leaves.filter((l) => {
      if (statusFilter && l.status !== statusFilter) return false;
      if (typeFilter && l.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchReason = l.reason && l.reason.toLowerCase().includes(q);
        const matchType = typeLabels[l.type] && typeLabels[l.type].toLowerCase().includes(q);
        const matchStatus = l.status.toLowerCase().includes(q);
        if (!matchReason && !matchType && !matchStatus) return false;
      }
      return true;
    });
  }, [leaveData.leaves, statusFilter, typeFilter, searchQuery]);

  const fetchSignoutData = async () => {
    try {
      const [recRes, reqRes] = await Promise.all([
        api.get('/attendance/missing'),
        api.get('/attendance/my-signout-requests'),
      ]);
      setRecords(recRes.data);
      setSignoutRequests(reqRes.data);
    } catch (err) { console.error(err); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/auth/leaves');
      setLeaveData(res.data);
    } catch (err) { console.error('Failed to load leaves:', err); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSignoutData(), fetchLeaves()]).finally(() => setLoading(false));
  }, []);

  const getRequestStatus = (recordId) => {
    const req = signoutRequests.find((r) => r.attendance_record_id === recordId);
    if (!req) return null;
    return req.status === 'pending' ? 'pending' : req.status === 'approved' ? 'approved' : 'rejected';
  };

  const getRejectionReason = (recordId) => {
    const req = signoutRequests.find((r) => r.attendance_record_id === recordId && r.status === 'rejected');
    return req ? req.rejection_reason : null;
  };

  const handleRequest = async () => {
    try {
      await api.post('/attendance/request-signout', form);
      setMessage('Sign-out request submitted for approval');
      setForm({ recordId: null, signOutTime: '', notes: '' });
      await fetchSignoutData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    }
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  const handleCancelLeave = async (id) => {
    try {
      await api.delete(`/auth/leaves/${id}`);
      fetchLeaves();
    } catch (err) { console.error('Failed to cancel leave:', err); }
    setConfirmId(null);
  };

  const getBalance = (type) => {
    const b = leaveData.balances.find((b) => b.leave_type === type);
    return b ? b.balance : 0;
  };

  const getBalanceTotal = (type) => {
    const b = leaveData.balances.find((b) => b.leave_type === type);
    return b && b.total != null ? b.total : null;
  };

  const getPendingDays = (type) => {
    return leaveData.leaves
      .filter((l) => l.type === type && l.status === 'pending')
      .reduce((sum, l) => sum + parseFloat(l.days_count), 0);
  };

  const leaveCounts = useMemo(() => {
    const all = filteredLeaves;
    return {
      total: all.length,
      pending: all.filter((l) => l.status === 'pending').length,
      approved: all.filter((l) => l.status === 'approved').length,
      rejected: all.filter((l) => l.status === 'rejected').length,
      cancelled: all.filter((l) => l.status === 'cancelled').length,
    };
  }, [filteredLeaves]);

  if (loading) return (
    <div className="page">
      <div className="glass-page-header"><h1>Requests</h1></div>
      <div className="glass-tabs" style={{ marginBottom: 16 }}>
        <div className="glass-skeleton" style={{ height: 36, width: 140, borderRadius: 8, flexShrink: 0 }} />
        <div className="glass-skeleton" style={{ height: 36, width: 140, borderRadius: 8, flexShrink: 0 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        {[1, 2, 3].map(i => <div key={i} className="glass-skeleton" style={{ height: 110, flex: 1, borderRadius: 12 }} />)}
      </div>
      <div className="glass-skeleton" style={{ height: 300, borderRadius: 12 }} />
    </div>
  );

  return (
    <div className="page">
      <div className="glass-page-header">
        <h1>Requests</h1>
        <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => setShowResignation(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
          Resign
        </button>
      </div>

      <div className="glass-tabs" style={{ marginBottom: 16 }}>
        <button className={`glass-tab ${tab === 'missing-signout' ? 'glass-tab-active' : ''}`} onClick={() => setTab('missing-signout')}>
          Missing Sign Out
        </button>
        <button className={`glass-tab ${tab === 'leaves' ? 'glass-tab-active' : ''}`} onClick={() => setTab('leaves')}>
          Leave Requests
        </button>
      </div>

      {tab === 'missing-signout' && (
        <>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: 16 }}>Days you forgot to sign out. Submit a request with your exit time for approval.</p>

          {message && <div className="glass-alert glass-alert-success">{message}</div>}

          {records.length === 0 ? (
            <div className="glass-empty">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <h3>No missing sign outs. Great job!</h3>
            </div>
          ) : (
            <div className="glass-card">
              <div className="glass-table-wrapper">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sign In</th>
                      <th>Duration So Far</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => {
                      const diff = ((Date.now() - new Date(r.sign_in_time)) / (1000 * 60 * 60)).toFixed(1);
                      const status = getRequestStatus(r.id);
                      const rejectionReason = getRejectionReason(r.id);
                      return (
                        <tr key={r.id}>
                          <td>{r.date}</td>
                          <td>{new Date(r.sign_in_time).toLocaleTimeString()}</td>
                          <td>{diff}h</td>
                          <td>
                            {status === 'pending' && <span className="glass-badge glass-badge-warning">Pending Approval</span>}
                            {status === 'approved' && <span className="glass-badge glass-badge-success">Approved</span>}
                            {status === 'rejected' && (
                              <span className="glass-badge glass-badge-danger" title={rejectionReason || ''}>Rejected</span>
                            )}
                            {!status && <span className="glass-badge glass-badge-default">Not Requested</span>}
                          </td>
                          <td>
                            {!status && (
                              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => setForm({ recordId: r.id, signOutTime: new Date().toISOString().slice(0, 16), notes: '' })}>
                                Request Sign Out
                              </button>
                            )}
                            {status === 'rejected' && (
                              <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => setForm({ recordId: r.id, signOutTime: new Date().toISOString().slice(0, 16), notes: '' })}>
                                Resubmit Request
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {form.recordId && (
            <div className="glass-modal-overlay" onClick={() => { setForm({ recordId: null, signOutTime: '', notes: '' }); setError(''); setMessage(''); }}>
              <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
                <div className="glass-modal-header">
                  <h2>Submit Sign-Out Request</h2>
                  <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setForm({ recordId: null, signOutTime: '', notes: '' })}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
                <div className="glass-card-body">
                  {error && <div className="glass-alert glass-alert-danger" style={{ marginBottom: 12 }}>{error}</div>}
                  <div className="glass-form-group">
                    <label className="glass-label">Sign Out Time</label>
                    <input type="datetime-local" value={form.signOutTime} onChange={(e) => setForm({ ...form, signOutTime: e.target.value })} className="glass-input" />
                  </div>
                  <div className="glass-form-group">
                    <label className="glass-label">Notes</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="glass-textarea" rows={3} />
                  </div>
                </div>
                <div className="glass-modal-footer">
                  <button className="glass-btn glass-btn-ghost" onClick={() => setForm({ recordId: null, signOutTime: '', notes: '' })}>Cancel</button>
                  <button className="glass-btn glass-btn-primary" onClick={handleRequest}>Submit Request</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'leaves' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="glass-btn glass-btn-primary" onClick={() => setShowForm(true)}>+ New Leave Request</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
            {['annual', 'sick', 'casual'].map((type) => {
              const gradients = { annual: 'linear-gradient(135deg, #8b5cf6, #6366f1)', sick: 'linear-gradient(135deg, #ef4444, #dc2626)', casual: 'linear-gradient(135deg, #f59e0b, #d97706)' };
              const balance = getBalance(type);
              const total = getBalanceTotal(type);
              const pending = getPendingDays(type);
              const used = total != null ? Math.max(0, total - balance) : null;
              const pct = total != null && total > 0 ? Math.min(100, Math.round(((total - balance) / total) * 100)) : 0;
              return (
                <div key={type} className="stat-card" style={{ background: gradients[type], borderRadius: 12, padding: '16px', position: 'relative', color: '#fff' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{balance}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: 2 }}>
                    {total != null ? `${typeLabels[type]} \u2014 ${used} of ${total} used` : `${typeLabels[type]} Days Left`}
                  </div>
                  {total != null && (
                    <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: 'rgba(255,255,255,0.7)', height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  )}
                  {pending > 0 && (
                    <div style={{ fontSize: '0.7rem', opacity: 0.9, marginTop: 6, fontWeight: 600 }}>
                      +{pending} day{pending > 1 ? 's' : ''} pending
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {(leaveData.leaves.length > 0 || statusFilter || typeFilter) && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 0', marginBottom: 8 }}>
              <div className="glass-form-group" style={{ marginBottom: 0, flex: 1, minWidth: 150 }}>
                <label className="glass-label" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Status</label>
                <select className="glass-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="glass-form-group" style={{ marginBottom: 0, flex: 1, minWidth: 150 }}>
                <label className="glass-label" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Type</label>
                <select className="glass-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="">All</option>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="glass-form-group" style={{ marginBottom: 0, flex: 2, minWidth: 200 }}>
                <label className="glass-label" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Search</label>
                <input className="glass-input" type="text" placeholder="Reason, type, status\u2026" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              {(statusFilter || typeFilter || searchQuery) && (
                <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => { setStatusFilter(''); setTypeFilter(''); setSearchQuery(''); }}>Clear</button>
              )}
            </div>
          )}

          <div className="glass-summary-bar">
            <span className="summary-item">Total: <strong>{leaveCounts.total}</strong></span>
            <span className="summary-item" style={{ color: 'var(--badge-warning)' }}>Pending: <strong>{leaveCounts.pending}</strong></span>
            <span className="summary-item" style={{ color: 'var(--badge-success)' }}>Approved: <strong>{leaveCounts.approved}</strong></span>
            <span className="summary-item" style={{ color: 'var(--badge-danger)' }}>Rejected: <strong>{leaveCounts.rejected}</strong></span>
            <span className="summary-item" style={{ color: 'var(--text-dim)' }}>Cancelled: <strong>{leaveCounts.cancelled}</strong></span>
          </div>

          <div className="glass-card">
            <div className="glass-table-wrapper">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From \u2192 To</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaves.length === 0 && leaveData.leaves.length > 0 && (
                    <tr><td colSpan={7}><div className="glass-empty" style={{ padding: '32px 16px' }}><p style={{ margin: 0, color: 'var(--text-dim)' }}>No matching requests.</p></div></td></tr>
                  )}
                  {filteredLeaves.length === 0 && leaveData.leaves.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 0, border: 0 }}>
                      <div className="glass-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                        <h3>No leave requests yet</h3>
                        <p style={{ color: 'var(--text-dim)' }}>Submit your first leave request to get started</p>
                        <button className="glass-btn glass-btn-primary" onClick={() => setShowForm(true)}>+ New Leave Request</button>
                      </div>
                    </td></tr>
                  )}
                  {filteredLeaves.map((l) => (
                    <tr key={l.id}>
                      <td><span className="glass-badge glass-badge-default">{typeLabels[l.type] || l.type}</span></td>
                      <td>{formatDate(l.start_date)} \u2192 {formatDate(l.end_date)}</td>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)' }}>{l.days_count}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.reason || <span style={{ color: 'var(--text-dim)' }}>\u2014</span>}
                      </td>
                      <td>
                        <span className={`glass-badge glass-badge-${statusBadgeMap[l.status] || 'default'}`}>
                          {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.8rem' }}>{formatDate(l.created_at)}</td>
                      <td>
                        {l.status === 'pending' && (
                          <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => setConfirmId(l.id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showForm && (
            <LeaveFormModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); fetchLeaves(); }} balances={leaveData.balances} pendingDays={leaveData.leaves.filter(l => l.status === 'pending')} />
          )}

          {confirmId && (
            <ConfirmModal title="Cancel Leave Request" message="Cancel this leave request?" confirmText="Cancel Leave" onConfirm={() => handleCancelLeave(confirmId)} onCancel={() => setConfirmId(null)} />
          )}

        </>
      )}

      {showResignation && (
        <ResignationModal onClose={() => setShowResignation(false)} onSubmitted={() => { setShowResignation(false); alert('Resignation request submitted. Your manager will review it.'); }} />
      )}
    </div>
  );
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect, useMemo } from 'react';
import api from '../../../shared/api';
import LeaveFormModal from '../../../shared/components/LeaveFormModal';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import ResignationModal from '../../../shared/components/ResignationModal';

const typeLabels = { annual: 'Annual', sick: 'Sick', casual: 'Casual', personal: 'Personal', unpaid: 'Unpaid' };
const statusColors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', cancelled: '#6b7280' };

const formatDate = (d) => {
  if (!d) return '—';
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

  if (loading) return (
    <div className="page">
      <div className="page-header"><h1>Requests</h1></div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className="skeleton-tab" />
        <div className="skeleton-tab" />
      </div>
      <div className="leave-balance-row">
        {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
      </div>
      <div className="leave-card-grid">
        {[1, 2, 3].map(i => <div key={i} className="skeleton-card" style={{ height: 140 }} />)}
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Requests</h1>
        <button className="btn btn-outline" onClick={() => setShowResignation(true)} style={{ borderColor: '#ef4444', color: '#ef4444' }}>Resign</button>
      </div>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === 'missing-signout' ? 'tab-active' : ''}`} onClick={() => setTab('missing-signout')}>
          Missing Sign Out
        </button>
        <button className={`tab ${tab === 'leaves' ? 'tab-active' : ''}`} onClick={() => setTab('leaves')}>
          Leave Requests
        </button>
      </div>

      {tab === 'missing-signout' && (
        <>
          <p className="subtitle">Days you forgot to sign out. Submit a request with your exit time for approval.</p>

          {message && <div className="alert alert-success">{message}</div>}

          {records.length === 0 ? (
            <p className="empty-state">No missing sign outs. Great job!</p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
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
                          {status === 'pending' && <span className="badge badge-warning">Pending Approval</span>}
                          {status === 'approved' && <span className="badge badge-success">Approved</span>}
                          {status === 'rejected' && (
                            <span className="badge badge-error" title={rejectionReason || ''}>Rejected</span>
                          )}
                          {!status && <span className="badge badge-employee">Not Requested</span>}
                        </td>
                        <td>
                          {!status && (
                            <button className="btn btn-primary btn-sm" onClick={() => setForm({ recordId: r.id, signOutTime: new Date().toISOString().slice(0, 16), notes: '' })}>
                              Request Sign Out
                            </button>
                          )}
                          {status === 'rejected' && (
                            <button className="btn btn-primary btn-sm" onClick={() => setForm({ recordId: r.id, signOutTime: new Date().toISOString().slice(0, 16), notes: '' })}>
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
          )}

          {form.recordId && (
            <div className="modal-overlay" onClick={() => { setForm({ recordId: null, signOutTime: '', notes: '' }); setError(''); setMessage(''); }}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Submit Sign-Out Request</h2>
                {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
                <label>
                  Sign Out Time:
                  <input type="datetime-local" value={form.signOutTime} onChange={(e) => setForm({ ...form, signOutTime: e.target.value })} className="form-control" />
                </label>
                <label>
                  Notes:
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="form-control" rows={3} />
                </label>
                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={() => setForm({ recordId: null, signOutTime: '', notes: '' })}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleRequest}>Submit Request</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'leaves' && (
        <>
          <div className="page-header" style={{ border: 'none', padding: 0, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Leave Request</button>
            </div>
          </div>

          <div className="leave-balance-row">
            {['annual', 'sick', 'casual', 'personal', 'unpaid'].filter(t => getBalance(t) > 0 || ['annual', 'sick', 'casual'].includes(t)).map((type) => {
              const colors = { annual: '#4f46e5', sick: '#ef4444', casual: '#f59e0b', personal: '#3b82f6', unpaid: '#6b7280' };
              const icons = { annual: '☀️', sick: '💊', casual: '🎯', personal: '📋', unpaid: '📦' };
              return (
                <div key={type} className="leave-balance-card" data-type={type} style={{ '--card-accent': colors[type] }}>
                  <div className="leave-balance-icon">{icons[type]}</div>
                  <div className="leave-balance-info">
                    <div className="leave-balance-number">{getBalance(type)}</div>
                    <div className="leave-balance-label">{typeLabels[type]} Days Left</div>
                  </div>
                </div>
              );
            })}
          </div>

          {(leaveData.leaves.length > 0 || statusFilter || typeFilter || searchQuery) && (
            <div className="leave-filter-bar">
              <div className="leave-filter-group">
                <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select className="form-control" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="">All Types</option>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <input className="form-control leave-filter-search" type="text" placeholder="Search by reason, type, status…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {(statusFilter || typeFilter || searchQuery) && (
                <button className="btn btn-sm btn-ghost" onClick={() => { setStatusFilter(''); setTypeFilter(''); setSearchQuery(''); }}>Clear</button>
              )}
            </div>
          )}

          {filteredLeaves.length === 0 ? (
            <div className="leave-empty">
              <div className="leave-empty-icon">📋</div>
              <h3>{leaveData.leaves.length === 0 ? 'No leave requests yet' : 'No matching requests'}</h3>
              <p>{leaveData.leaves.length === 0 ? 'Start by submitting your first leave request' : 'Try adjusting your filters'}</p>
              {leaveData.leaves.length === 0 && <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 8 }}>+ New Leave Request</button>}
            </div>
          ) : (
            <div className="leave-card-grid">
              {filteredLeaves.map((l) => {
                const typeColor = { annual: '#4f46e5', sick: '#ef4444', casual: '#f59e0b', personal: '#3b82f6', unpaid: '#6b7280' };
                const now = new Date();
                const end = new Date(l.end_date);
                const isPast = end < now && l.status === 'pending';
                return (
                  <div key={l.id} className={`leave-card ${l.status} ${isPast ? 'overdue' : ''}`} style={{ '--card-accent': statusColors[l.status] }}>
                    <div className="leave-card-top">
                      <span className="leave-card-type" style={{ background: typeColor[l.type] + '18', color: typeColor[l.type] }}>
                        {typeLabels[l.type] || l.type}
                      </span>
                      <span className="leave-card-status" style={{
                        background: statusColors[l.status] + '18',
                        color: statusColors[l.status],
                      }}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </div>
                    <div className="leave-card-dates">
                      <div className="leave-card-date-block">
                        <span className="leave-card-date-label">From</span>
                        <span className="leave-card-date-value">{formatDate(l.start_date)}</span>
                      </div>
                      <span className="leave-card-arrow">→</span>
                      <div className="leave-card-date-block">
                        <span className="leave-card-date-label">To</span>
                        <span className="leave-card-date-value">{formatDate(l.end_date)}</span>
                      </div>
                      <div className="leave-card-days">
                        <span className="leave-card-days-count">{l.days_count}</span>
                        <span className="leave-card-days-label">{l.days_count === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>
                    {l.reason && (
                      <div className="leave-card-reason">
                        <span className="leave-card-reason-label">Reason:</span>
                        <span>{l.reason}</span>
                      </div>
                    )}
                    <div className="leave-card-footer">
                      <span className="leave-card-submitted">Submitted {formatDate(l.created_at)}</span>
                      <div className="leave-card-actions">
                        {l.status === 'pending' && (
                          <button className="btn btn-sm btn-danger" onClick={() => setConfirmId(l.id)}>Cancel</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (
            <LeaveFormModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); fetchLeaves(); }} balances={leaveData.balances} />
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

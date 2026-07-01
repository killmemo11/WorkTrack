// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';
import { formatDate } from '../../../shared/utils/date';
import LeaveFormModal from '../../../shared/components/LeaveFormModal';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import ResignationModal from '../../../shared/components/ResignationModal';

const typeLabels = { annual: 'Annual', sick: 'Sick', casual: 'Casual', personal: 'Personal', unpaid: 'Unpaid' };
const statusColors = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444', cancelled: '#6b7280' };

export default function Leaves() {
  const [data, setData] = useState({ leaves: [], balances: [] });
  const [showForm, setShowForm] = useState(false);
  const [showResignation, setShowResignation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/auth/leaves');
      setData(res.data);
    } catch (err) { console.error('Failed to load leaves:', err); }
    setLoading(false);
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleCancel = async (id) => {
    try {
      await api.delete(`/auth/leaves/${id}`);
      fetchLeaves();
    } catch (err) { console.error('Failed to cancel leave:', err); }
    setConfirmId(null);
  };

  const getBalance = (type) => {
    const b = data.balances.find((b) => b.leave_type === type);
    return b ? b.balance : 0;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Leave Requests</h1>
          <p className="subtitle">Manage your time off</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ New Leave Request</button>
          <button className="btn btn-outline" onClick={() => setShowResignation(true)} style={{ borderColor: '#ef4444', color: '#ef4444' }}>Resign</button>
        </div>
      </div>

      <div className="dashboard-stats-row" style={{ marginBottom: 24 }}>
        {['annual', 'sick', 'casual'].map((type) => (
          <div key={type} className="mini-stat-card" style={{ borderLeft: `4px solid ${type === 'annual' ? '#4f46e5' : type === 'sick' ? '#ef4444' : '#f59e0b'}` }}>
            <div className="mini-stat-number">{getBalance(type)}</div>
            <div className="mini-stat-label">{typeLabels[type]} Days Left</div>
          </div>
        ))}
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.leaves.length === 0 && (
              <tr><td colSpan={8} className="empty-state">No leave requests yet.</td></tr>
            )}
            {data.leaves.map((l) => (
              <tr key={l.id}>
                <td><span className="badge badge-employee">{typeLabels[l.type] || l.type}</span></td>
                <td>{formatDate(l.start_date)}</td>
                <td>{formatDate(l.end_date)}</td>
                <td className="cell-mono">{l.days_count}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.reason || <span style={{ color: '#999' }}>—</span>}
                </td>
                <td>
                  <span className="badge" style={{
                    background: statusColors[l.status] + '20',
                    color: statusColors[l.status],
                    border: `1px solid ${statusColors[l.status]}40`,
                  }}>
                    {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                  </span>
                </td>
                <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                  {new Date(l.created_at).toLocaleDateString()}
                </td>
                <td>
                  {l.status === 'pending' && (
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmId(l.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <LeaveFormModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); fetchLeaves(); }}
          balances={data.balances}
        />
      )}

      {confirmId && (
        <ConfirmModal
          title="Cancel Leave Request"
          message="Cancel this leave request?"
          confirmText="Cancel Leave"
          onConfirm={() => handleCancel(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}

      {showResignation && (
        <ResignationModal
          onClose={() => setShowResignation(false)}
          onSubmitted={() => { setShowResignation(false); alert('Resignation request submitted. Your manager will review it.'); }}
        />
      )}
    </div>
  );
}


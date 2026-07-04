// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import api from '../../../shared/api';
import { formatDate } from '../../../shared/utils/date';
import LeaveFormModal from '../../../shared/components/LeaveFormModal';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import ResignationModal from '../../../shared/components/ResignationModal';

const typeLabels = { annual: 'Annual', sick: 'Sick', casual: 'Casual', personal: 'Personal', unpaid: 'Unpaid' };
const statusBadgeClass = { pending: 'glass-badge-warning', approved: 'glass-badge-success', rejected: 'glass-badge-danger', cancelled: 'glass-badge-secondary' };
const balanceGradient = { annual: 'gradient-purple', sick: 'gradient-red', casual: 'gradient-green', personal: 'gradient-blue', unpaid: 'gradient-gray' };

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

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>;

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>Leave Requests</h1>
          <p className="subtitle">Manage your time off</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="glass-btn glass-btn-primary" onClick={() => setShowForm(true)}>
            <span className="iconify" data-icon="lucide:plus" style={{ marginRight: 6 }} /> New Leave Request
          </button>
          <button className="glass-btn glass-btn-danger glass-btn-ghost" onClick={() => setShowResignation(true)}>
            <span className="iconify" data-icon="lucide:log-out" style={{ marginRight: 6 }} /> Resign
          </button>
        </div>
      </div>

      <div className="glass-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        {['annual', 'sick', 'casual'].map((type) => (
          <div key={type} className={`glass-stat-card ${balanceGradient[type]} card-hover fade-in-up`}>
            <div className="stat-icon"><span className="iconify" data-icon={type === 'annual' ? 'lucide:sun' : type === 'sick' ? 'lucide:thermometer-snowflake' : 'lucide:coffee'} /></div>
            <div className="stat-number">{getBalance(type)}</div>
            <div className="stat-label">{typeLabels[type]} Days Left</div>
          </div>
        ))}
      </div>

      <div className="glass-table-wrapper">
        <table className="glass-table">
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
              <tr><td colSpan={8}><div className="glass-empty" style={{ padding: 40 }}>No leave requests yet.</div></td></tr>
            )}
            {data.leaves.map((l) => (
              <tr key={l.id}>
                <td><span className="glass-badge glass-badge-info">{typeLabels[l.type] || l.type}</span></td>
                <td>{formatDate(l.start_date)}</td>
                <td>{formatDate(l.end_date)}</td>
                <td className="cell-mono">{l.days_count}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.reason || <span style={{ color: 'var(--text-dim)' }}>—</span>}
                </td>
                <td>
                  <span className={`glass-badge ${statusBadgeClass[l.status] || 'glass-badge-secondary'}`}>
                    {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                  </span>
                </td>
                <td className="cell-mono" style={{ fontSize: '0.8rem' }}>
                  {new Date(l.created_at).toLocaleDateString()}
                </td>
                <td>
                  {l.status === 'pending' && (
                    <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => setConfirmId(l.id)}>Cancel</button>
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

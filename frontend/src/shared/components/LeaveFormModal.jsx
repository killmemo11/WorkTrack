// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useMemo } from 'react';
import api from '../api';

const typeLabels = { annual: 'Annual', sick: 'Sick', casual: 'Casual', personal: 'Personal', unpaid: 'Unpaid' };
const typeColors = { annual: '#4f46e5', sick: '#ef4444', casual: '#f59e0b', personal: '#3b82f6', unpaid: '#6b7280' };

function calcBusinessDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (s > e) return 0;
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 5 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count || 1;
}

export default function LeaveFormModal({ onClose, onCreated, balances }) {
  const [type, setType] = useState('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getBalance = (t) => {
    const b = balances.find((b) => b.leave_type === t);
    return b ? b.balance : 0;
  };

  const needsApproval = type === 'annual' || type === 'casual';
  const needsBalance = ['annual', 'sick', 'casual'].includes(type);
  const daysCount = useMemo(() => calcBusinessDays(startDate, endDate), [startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/leaves', { type, start_date: startDate, end_date: endDate, reason });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h2>New Leave Request</h2>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="modal-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label>
              Leave Type
              <select className="form-control" value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%' }}>
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}{needsBalance ? ` (${getBalance(k)} days left)` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 4 }}>
            <label>
              Start Date
              <input type="date" className="form-control" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} required style={{ width: '100%' }} />
            </label>
            <label>
              End Date
              <input type="date" className="form-control" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} required style={{ width: '100%' }} />
            </label>
          </div>

          {daysCount > 0 && (
            <div style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: '0.85rem', color: '#666' }}>
              <strong style={{ color: typeColors[type], fontSize: '1rem' }}>{daysCount}</strong> {daysCount === 1 ? 'day' : 'days'} total (
              {needsApproval ? 'requires manager approval' : 'requires HR approval'})
            </div>
          )}

          <label style={{ display: 'block', marginTop: 8 }}>
            Reason
            <textarea className="form-control" value={reason}
              onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional reason…"
              style={{ width: '100%', resize: 'vertical', marginTop: 4 }} />
          </label>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
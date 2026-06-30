// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useMemo } from 'react';
import api from '../api';

const leaveTypes = [
  { key: 'annual', label: 'Annual', icon: '☀️', color: '#4f46e5' },
  { key: 'sick', label: 'Sick', icon: '💊', color: '#ef4444' },
  { key: 'casual', label: 'Casual', icon: '🎯', color: '#f59e0b' },
  { key: 'personal', label: 'Personal', icon: '📋', color: '#3b82f6' },
  { key: 'unpaid', label: 'Unpaid', icon: '📦', color: '#6b7280' },
];

function calcBusinessDays(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start), e = new Date(end);
  if (s > e) return 0;
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const day = d.getDay();
    if (day !== 5 && day !== 6) count++; // skip Fri/Sat
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

  const selectedType = leaveTypes.find(t => t.key === type);
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <h2>New Leave Request</h2>
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="lf-type-grid">
            {leaveTypes.map((t) => {
              const isSelected = type === t.key;
              const bal = getBalance(t.key);
              const hasBalance = ['annual', 'sick', 'casual'].includes(t.key);
              return (
                <button key={t.key} type="button" className={`lf-type-btn ${isSelected ? 'active' : ''}`}
                  style={isSelected ? { borderColor: t.color, background: t.color + '10' } : {}}
                  onClick={() => setType(t.key)}>
                  <span className="lf-type-icon">{t.icon}</span>
                  <span className="lf-type-name" style={{ color: t.color }}>{t.label}</span>
                  {hasBalance && <span className="lf-type-balance">{bal} left</span>}
                </button>
              );
            })}
          </div>

          <div className="lf-dates-row">
            <label className="lf-date-field">
              <span className="lf-field-label">From</span>
              <input type="date" className="form-control" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} required />
            </label>
            <span className="lf-dates-arrow">→</span>
            <label className="lf-date-field">
              <span className="lf-field-label">To</span>
              <input type="date" className="form-control" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} required />
            </label>
            {daysCount > 0 && (
              <div className="lf-days-badge">
                <span className="lf-days-count">{daysCount}</span>
                <span className="lf-days-label">{daysCount === 1 ? 'day' : 'days'}</span>
              </div>
            )}
          </div>

          <label className="lf-field-label" style={{ marginTop: 8, display: 'block' }}>Reason</label>
          <textarea className="form-control" value={reason}
            onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional reason…"
            style={{ width: '100%', resize: 'vertical', marginTop: 4 }} />

          <div className="lf-info-box" style={{ background: selectedType?.color + '0c', borderColor: selectedType?.color + '30' }}>
            <span className="lf-info-icon">{needsApproval ? '👤' : '🏢'}</span>
            <span>{needsApproval
              ? 'This request will be sent to your department manager for approval.'
              : 'This request will be sent to HR/Admin for approval.'}</span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}
              style={selectedType ? { background: selectedType.color } : {}}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
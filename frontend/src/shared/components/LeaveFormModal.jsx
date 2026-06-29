// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import api from '../api';

const types = ['annual', 'sick', 'casual', 'personal', 'unpaid'];

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

  const needsApproval = type === 'annual' || type === 'casual';
  const needsBalance = ['annual', 'sick', 'casual'].includes(type);

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
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    {needsBalance && ` (${getBalance(t)} days left)`}
                  </option>
                ))}
              </select>
            </label>
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
            <label>
              Reason
              <textarea className="form-control" value={reason}
                onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional reason..."
                style={{ width: '100%', resize: 'vertical' }} />
            </label>
          </div>

          <div style={{ background: '#f9f9f9', padding: 12, borderRadius: 6, margin: '12px 0', fontSize: '0.85rem', color: '#666' }}>
            {needsApproval
              ? <span>🔵 This request will be sent to your department manager for approval.</span>
              : <span>🔵 This request will be sent to HR/Admin for approval.</span>}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
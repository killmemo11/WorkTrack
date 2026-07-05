import { useState, useMemo } from 'react';
import Icon from './Icon';
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

export default function LeaveFormModal({ onClose, onCreated, balances, pendingDays = [] }) {
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

  const getBalanceTotal = (t) => {
    const b = balances.find((b) => b.leave_type === t);
    return b && b.total != null ? b.total : null;
  };

  const getPendingForType = (t) => {
    return pendingDays.filter((l) => l.type === t).reduce((sum, l) => sum + parseFloat(l.days_count), 0);
  };

  const needsApproval = type === 'annual' || type === 'casual';
  const needsBalance = ['annual', 'sick', 'casual'].includes(type);
  const daysCount = useMemo(() => calcBusinessDays(startDate, endDate), [startDate, endDate]);

  const balance = getBalance(type);
  const total = getBalanceTotal(type);
  const pending = getPendingForType(type);
  const lowBalance = needsBalance && balance <= 3 && balance > 0;

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
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="glass-modal-header">
          <h3 className="glass-modal-title">New Leave Request</h3>
          <button className="glass-modal-close" onClick={onClose}>
            <Icon icon="lucide:x" />
          </button>
        </div>
        {error && <div className="glass-alert glass-alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="glass-form-group">
            <label className="glass-label">Leave Type</label>
            <select className="glass-select" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}{needsBalance ? ` (${getBalance(k)} days left)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="glass-form-group" style={{ flex: 1 }}>
              <label className="glass-label">Start Date</label>
              <input type="date" className="glass-input" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="glass-form-group" style={{ flex: 1 }}>
              <label className="glass-label">End Date</label>
              <input type="date" className="glass-input" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>

          {daysCount > 0 && (
            <div style={{ textAlign: 'center', padding: '4px 0 8px', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              <strong style={{ color: typeColors[type], fontSize: '1.1rem' }}>{daysCount}</strong> {daysCount === 1 ? 'day' : 'days'} total
            </div>
          )}

          {needsBalance && pending > 0 && (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600, padding: '2px 0 4px' }}>
              You have {pending} pending {type} day{pending > 1 ? 's' : ''}
            </div>
          )}

          {lowBalance && (
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--error)', fontWeight: 600, padding: '2px 0 4px' }}>
              Low balance: only {balance} {type} day{balance > 1 ? 's' : ''} remaining
            </div>
          )}

          <div className="glass-form-group">
            <label className="glass-label">Reason</label>
            <textarea className="glass-textarea" value={reason}
              onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Optional reason…" />
          </div>

          <div className="glass-form-hint" style={{ marginBottom: 16 }}>
            {needsApproval
              ? 'This request will be sent to your department manager for approval.'
              : 'This request will be sent to HR for approval.'}
            {needsBalance && total != null && ` Your current ${typeLabels[type]} balance: ${balance} of ${total} days.`}
          </div>

          <div className="glass-modal-footer" style={{ marginTop: 0 }}>
            <button type="button" className="glass-btn glass-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="glass-btn glass-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

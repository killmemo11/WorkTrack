// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import api from '../api';

export default function ResignationModal({ onClose, onSubmitted }) {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ resignation_date: '', reason: '' });
  const [error, setError] = useState('');

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.resignation_date) return setError('Resignation date is required');
    if (step === 'form') { setStep('confirm'); return; }
    setError('');
    try {
      await api.post('/personnel/resignation', form);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setStep('form');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        {step === 'form' ? (
          <>
            <div className="resign-header">
              <span className="resign-icon">⚠️</span>
              <h2>Submit Resignation</h2>
            </div>
            <p className="resign-intro">Please provide your last working day and reason for leaving. Your manager will review your request.</p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <label className="resign-field">
                <span className="resign-field-label">Last Working Day *</span>
                <input type="date" className="form-control" value={form.resignation_date}
                  onChange={e => setForm({ ...form, resignation_date: e.target.value })} required />
              </label>
              <label className="resign-field">
                <span className="resign-field-label">Reason for Leaving</span>
                <textarea className="form-control" rows={4} value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Share your reason (optional)…" />
              </label>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-danger">Continue →</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="resign-header">
              <span className="resign-icon resign-icon-warn">🔔</span>
              <h2>Confirm Resignation</h2>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="resign-summary">
              <div className="resign-summary-row">
                <span className="resign-summary-label">Last Working Day</span>
                <span className="resign-summary-value">{formatDate(form.resignation_date)}</span>
              </div>
              {form.reason && (
                <div className="resign-summary-row">
                  <span className="resign-summary-label">Reason</span>
                  <span className="resign-summary-value">{form.reason}</span>
                </div>
              )}
            </div>
            <div className="resign-notice">
              <strong>Please note:</strong> This action cannot be undone. Your account will be deactivated after the resignation date.
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep('form')}>← Back</button>
                <button type="submit" className="btn btn-danger">Confirm Resignation</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
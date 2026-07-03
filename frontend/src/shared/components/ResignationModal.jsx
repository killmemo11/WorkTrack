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
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="glass-modal-header">
          <h3 className="glass-modal-title">
            {step === 'form' ? 'Submit Resignation' : 'Confirm Resignation'}
          </h3>
          <button className="glass-modal-close" onClick={onClose}>
            <span className="iconify" data-icon="lucide:x" />
          </button>
        </div>

        {step === 'form' ? (
          <>
            <p className="glass-form-hint" style={{ marginBottom: 16 }}>
              Please provide your last working day and reason for leaving. Your manager will review your request.
            </p>
            {error && <div className="glass-alert glass-alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="glass-form-group">
                <label className="glass-label">Last Working Day *</label>
                <input type="date" className="glass-input" value={form.resignation_date}
                  onChange={e => setForm({ ...form, resignation_date: e.target.value })} required />
              </div>
              <div className="glass-form-group">
                <label className="glass-label">Reason for Leaving</label>
                <textarea className="glass-textarea" rows={4} value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Share your reason (optional)…" />
              </div>
              <div className="glass-modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="glass-btn glass-btn-ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="glass-btn glass-btn-primary">Continue →</button>
              </div>
            </form>
          </>
        ) : (
          <>
            {error && <div className="glass-alert glass-alert-danger">{error}</div>}
            <div className="glass-form-preview" style={{ marginBottom: 16 }}>
              <div className="glass-detail-row">
                <span className="glass-detail-label">Last Working Day</span>
                <span className="glass-detail-value">{formatDate(form.resignation_date)}</span>
              </div>
              {form.reason && (
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Reason</span>
                  <span className="glass-detail-value">{form.reason}</span>
                </div>
              )}
            </div>
            <div className="glass-alert glass-alert-warning" style={{ marginBottom: 16 }}>
              <strong>Please note:</strong> This action cannot be undone. Your account will be deactivated after the resignation date.
            </div>
            <form onSubmit={handleSubmit}>
              <div className="glass-modal-footer" style={{ marginTop: 0 }}>
                <button type="button" className="glass-btn glass-btn-ghost" onClick={() => setStep('form')}>← Back</button>
                <button type="submit" className="glass-btn glass-btn-danger">Confirm Resignation</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

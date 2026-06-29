// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import api from '../api';

export default function ResignationModal({ onClose, onSubmitted }) {
  const [form, setForm] = useState({ resignation_date: '', reason: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.resignation_date) return setError('Resignation date is required');
    try {
      await api.post('/personnel/resignation', form);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h2>Submit Resignation</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Resignation Date
            <input type="date" className="form-control" value={form.resignation_date}
              onChange={e => setForm({ ...form, resignation_date: e.target.value })} required />
          </label>
          <label>Reason (optional)
            <textarea className="form-control" rows={4} value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Enter reason..." />
          </label>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger">Submit Resignation</button>
          </div>
        </form>
      </div>
    </div>
  );
}
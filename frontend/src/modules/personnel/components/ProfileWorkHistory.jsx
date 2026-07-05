// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileWorkHistory({ profile, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ company: '', position: '', from_date: '', to_date: '', reason_leaving: '' });

  function fmtDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function resetForm() { setForm({ company: '', position: '', from_date: '', to_date: '', reason_leaving: '' }); }

  function openCreate() { setEditing(null); resetForm(); setShowForm(true); }

  function openEdit(item) {
    setEditing(item);
    setForm({ company: item.company, position: item.position, from_date: fmtDate(item.from_date), to_date: fmtDate(item.to_date), reason_leaving: item.reason_leaving || '' });
    setShowForm(true);
  }

  async function handleSave() {
    if (editing) {
      await hrApi.put(`/employees/${profile.id}/work-history/${editing.id}`, form);
    } else {
      await hrApi.post(`/employees/${profile.id}/work-history`, form);
    }
    setShowForm(false);
    onUpdate();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this work history entry?')) return;
    await hrApi.delete(`/employees/${profile.id}/work-history/${id}`);
    onUpdate();
  }

  return (
    <div className="glass-card">
      <div className="glass-card-header"><h3>Work History</h3><button className="glass-btn glass-btn-sm glass-btn-primary" onClick={openCreate}>+ Add</button></div>
      <div className="glass-card-body">
        {profile.workHistory.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No work history records.</p>}
        {profile.workHistory.map(w => (
          <div key={w.id} className="glass-detail-row">
            <div><strong>{w.position}</strong> at {w.company}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{fmtDate(w.from_date) || '—'} → {fmtDate(w.to_date) || 'Present'}</div>
            {w.reason_leaving && <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Reason: {w.reason_leaving}</div>}
            <div className="">
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => openEdit(w)}>Edit</button>
              <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => handleDelete(w.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Work History' : 'Add Work History'}</h2>
            <label>Company<input className="glass-form-control" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></label>
            <label>Position<input className="glass-form-control" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} /></label>
            <label>From Date<input className="glass-form-control" type="date" value={form.from_date} onChange={e => setForm({ ...form, from_date: e.target.value })} /></label>
            <label>To Date<input className="glass-form-control" type="date" value={form.to_date} onChange={e => setForm({ ...form, to_date: e.target.value })} /></label>
            <label>Reason for Leaving<textarea className="glass-form-control" rows={3} value={form.reason_leaving} onChange={e => setForm({ ...form, reason_leaving: e.target.value })} /></label>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileEducation({ profile, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ degree: '', institution: '', field_of_study: '', graduation_year: '', grade: '' });

  function resetForm() { setForm({ degree: '', institution: '', field_of_study: '', graduation_year: '', grade: '' }); }

  function openCreate() { setEditing(null); resetForm(); setShowForm(true); }

  function openEdit(item) {
    setEditing(item);
    setForm({ degree: item.degree, institution: item.institution, field_of_study: item.field_of_study || '', graduation_year: item.graduation_year || '', grade: item.grade || '' });
    setShowForm(true);
  }

  async function handleSave() {
    if (editing) {
      await hrApi.put(`/employees/${profile.id}/education/${editing.id}`, form);
    } else {
      await hrApi.post(`/employees/${profile.id}/education`, form);
    }
    setShowForm(false);
    onUpdate();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this education entry?')) return;
    await hrApi.delete(`/employees/${profile.id}/education/${id}`);
    onUpdate();
  }

  return (
    <div className="glass-card">
      <div className="glass-card-header"><h3>Education</h3><button className="glass-btn glass-btn-sm glass-btn-primary" onClick={openCreate}>+ Add</button></div>
      <div className="glass-card-body">
        {profile.education.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No education records.</p>}
        {profile.education.map(e => (
          <div key={e.id} className="glass-detail-row">
            <div><strong>{e.degree}</strong> in {e.field_of_study || '—'} <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>({e.graduation_year || '—'})</span></div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{e.institution}{e.grade ? ` | Grade: ${e.grade}` : ''}</div>
            <div className="">
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => openEdit(e)}>Edit</button>
              <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Education' : 'Add Education'}</h2>
            <label>Degree<input className="glass-form-control" value={form.degree} onChange={e => setForm({ ...form, degree: e.target.value })} /></label>
            <label>Institution<input className="glass-form-control" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} /></label>
            <label>Field of Study<input className="glass-form-control" value={form.field_of_study} onChange={e => setForm({ ...form, field_of_study: e.target.value })} /></label>
            <label>Graduation Year<input className="glass-form-control" type="number" value={form.graduation_year} onChange={e => setForm({ ...form, graduation_year: e.target.value })} /></label>
            <label>Grade<input className="glass-form-control" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} /></label>
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

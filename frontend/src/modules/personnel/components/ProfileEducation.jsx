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
    <div className="card">
      <div className="card-header"><h3>Education</h3><button className="btn btn-sm btn-primary" onClick={openCreate}>+ Add</button></div>
      <div className="card-body">
        {profile.education.length === 0 && <p className="text-muted">No education records.</p>}
        {profile.education.map(e => (
          <div key={e.id} className="list-item">
            <div><strong>{e.degree}</strong> in {e.field_of_study || '—'} <span className="text-muted">({e.graduation_year || '—'})</span></div>
            <div className="text-muted">{e.institution}{e.grade ? ` | Grade: ${e.grade}` : ''}</div>
            <div className="list-actions">
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(e)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Education' : 'Add Education'}</h2>
            <label>Degree<input className="form-control" value={form.degree} onChange={e => setForm({ ...form, degree: e.target.value })} /></label>
            <label>Institution<input className="form-control" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} /></label>
            <label>Field of Study<input className="form-control" value={form.field_of_study} onChange={e => setForm({ ...form, field_of_study: e.target.value })} /></label>
            <label>Graduation Year<input className="form-control" type="number" value={form.graduation_year} onChange={e => setForm({ ...form, graduation_year: e.target.value })} /></label>
            <label>Grade<input className="form-control" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} /></label>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

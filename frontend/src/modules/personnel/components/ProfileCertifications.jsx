// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileCertifications({ profile, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', issuing_authority: '', issue_date: '', expiry_date: '', credential_url: '' });

  function fmtDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function resetForm() { setForm({ name: '', issuing_authority: '', issue_date: '', expiry_date: '', credential_url: '' }); }

  async function handleSave() {
    await hrApi.post(`/employees/${profile.id}/certifications`, form);
    setShowForm(false);
    onUpdate();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this certification?')) return;
    await hrApi.delete(`/employees/${profile.id}/certifications/${id}`);
    onUpdate();
  }

  return (
    <div className="card">
      <div className="card-header"><h3>Certifications</h3><button className="btn btn-sm btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Add</button></div>
      <div className="card-body">
        {profile.certifications.length === 0 && <p className="text-muted">No certifications.</p>}
        {profile.certifications.map(c => (
          <div key={c.id} className="list-item">
            <div><strong>{c.name}</strong></div>
            <div className="text-muted">{c.issuing_authority || ''}{c.issue_date ? ` | Issued: ${fmtDate(c.issue_date)}` : ''}{c.expiry_date ? ` | Expires: ${fmtDate(c.expiry_date)}` : ''}</div>
            {c.credential_url && <div><a href={c.credential_url} target="_blank" rel="noopener noreferrer">View Credential</a></div>}
            <div className="list-actions">
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Certification</h2>
            <label>Name *<input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Issuing Authority<input className="form-control" value={form.issuing_authority} onChange={e => setForm({ ...form, issuing_authority: e.target.value })} /></label>
            <label>Issue Date<input className="form-control" type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></label>
            <label>Expiry Date<input className="form-control" type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></label>
            <label>Credential URL<input className="form-control" type="url" value={form.credential_url} onChange={e => setForm({ ...form, credential_url: e.target.value })} /></label>
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

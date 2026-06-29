// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileMedicalFamily({ profile, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', relation: '', medical_insurance_number: '', card_file: null });

  function resetForm() { setForm({ name: '', relation: '', medical_insurance_number: '', card_file: null }); }
  function openCreate() { setEditing(null); resetForm(); setShowForm(true); }

  function openEdit(item) {
    setEditing(item);
    setForm({ name: item.name, relation: item.relation || '', medical_insurance_number: item.medical_insurance_number || '', card_file: null });
    setShowForm(true);
  }

  async function handleSave() {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('relation', form.relation);
    fd.append('medical_insurance_number', form.medical_insurance_number);
    if (form.card_file) fd.append('card_image', form.card_file);
    if (editing) {
      await hrApi.put(`/employees/${profile.id}/medical-family/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    } else {
      await hrApi.post(`/employees/${profile.id}/medical-family`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    setShowForm(false);
    onUpdate();
  }

  async function handleDelete(id) {
    if (!confirm('Remove this family member?')) return;
    await hrApi.delete(`/employees/${profile.id}/medical-family/${id}`);
    onUpdate();
  }

  async function handleUploadCard(famId, e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await hrApi.post(`/employees/${profile.id}/medical-family/${famId}/upload-card`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    onUpdate();
  }

  const members = profile.medicalFamily || [];

  return (
    <div className="card">
      <div className="card-header"><h3>Medical Insurance — Family Members</h3><button className="btn btn-sm btn-primary" onClick={openCreate}>+ Add Member</button></div>
      <div className="card-body">
        {members.length === 0 && <p className="text-muted">No family members added.</p>}
        {members.map(m => (
          <div key={m.id} className="list-item" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div><strong>{m.name}</strong> {m.relation && <span className="badge badge-info">{m.relation}</span>}</div>
              <div className="text-muted">{m.medical_insurance_number || 'No card number'}</div>
              {m.insurance_card_image && <img src={`/${m.insurance_card_image}`} alt="Card" style={{ maxWidth: 200, maxHeight: 100, objectFit: 'contain', border: '1px solid #ddd', borderRadius: 4, marginTop: 4 }} />}
            </div>
            <div className="list-actions" style={{ flexShrink: 0 }}>
              <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer' }}>
                Upload Card
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUploadCard(m.id, e)} />
              </label>
              <button className="btn btn-sm btn-outline" onClick={() => openEdit(m)}>Edit</button>
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete(m.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editing ? 'Edit Family Member' : 'Add Family Member'}</h2>
            <label>Name<input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label>Relation
              <select className="form-control" value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })}>
                <option value="">— Select —</option>
                <option value="Spouse">Spouse</option>
                <option value="Wife">Wife</option>
                <option value="Husband">Husband</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Mother-in-law">Mother-in-law</option>
                <option value="Father-in-law">Father-in-law</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>Medical Insurance Number<input className="form-control" value={form.medical_insurance_number} onChange={e => setForm({ ...form, medical_insurance_number: e.target.value })} /></label>
            <label>Insurance Card Image<input type="file" accept="image/*" className="form-control" onChange={e => setForm({ ...form, card_file: e.target.files[0] })} /></label>
            {editing?.insurance_card_image && <p style={{fontSize:'0.85rem',color:'#666'}}>Current image will be replaced if you upload a new one.</p>}
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
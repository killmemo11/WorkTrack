import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import ProfileField from './ProfileField';
import '../styles/profile.css';

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
    <ProfileSection
      title="Medical Insurance — Family Members"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>}
      actions={<button className="profile-btn profile-btn-primary profile-btn-sm" onClick={openCreate}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Member
      </button>}
    >
      {members.length === 0 ? (
        <div className="doc-empty" style={{ padding: '30px 20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 40 }}>👨‍👩‍👧‍👦</span>
          <h4>No family members added</h4>
        </div>
      ) : (
        <div className="documents-list">
          {members.map((m, i) => (
            <div key={m.id} className="doc-list-item doc-stagger-enter" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="doc-list-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>👤</div>
              <div className="doc-list-info">
                <div className="doc-list-name"><strong>{m.name}</strong> {m.relation && <span className="doc-card-badge doc-card-badge-id_card">{m.relation}</span>}</div>
                <div className="doc-list-meta">
                  {m.medical_insurance_number && <span>Card: {m.medical_insurance_number}</span>}
                </div>
                {m.insurance_card_image && (
                  <img src={`/${m.insurance_card_image}`} alt="Card" style={{ maxWidth: 160, maxHeight: 80, objectFit: 'contain', borderRadius: 6, marginTop: 6, border: '1px solid rgba(255,255,255,0.06)' }} />
                )}
              </div>
              <div className="doc-list-actions" style={{ flexDirection: 'column', gap: 4 }}>
                <label className="profile-btn profile-btn-xs profile-btn-ghost" style={{ cursor: 'pointer', display: 'flex' }}>
                  Upload Card
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleUploadCard(m.id, e)} />
                </label>
                <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={() => openEdit(m)}>Edit</button>
                <button className="profile-btn profile-btn-xs profile-btn-danger" onClick={() => handleDelete(m.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="doc-preview-overlay" onClick={() => setShowForm(false)}>
          <div className="doc-preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="doc-preview-header">
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Family Member' : 'Add Family Member'}</h3>
              <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={() => setShowForm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="doc-preview-body" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch', background: 'var(--bg-glass)' }}>
              <ProfileField label="Name" value={form.name} editing onChange={val => setForm(f => ({ ...f, name: val }))} />
              <ProfileField label="Relation" value={form.relation} type="select" editing
                options={[{ value: 'Spouse', label: 'Spouse' }, { value: 'Wife', label: 'Wife' }, { value: 'Husband', label: 'Husband' }, { value: 'Son', label: 'Son' }, { value: 'Daughter', label: 'Daughter' }, { value: 'Father', label: 'Father' }, { value: 'Mother', label: 'Mother' }, { value: 'Brother', label: 'Brother' }, { value: 'Sister', label: 'Sister' }, { value: 'Mother-in-law', label: 'Mother-in-law' }, { value: 'Father-in-law', label: 'Father-in-law' }, { value: 'Other', label: 'Other' }]}
                onChange={val => setForm(f => ({ ...f, relation: val }))} />
              <ProfileField label="Medical Insurance Number" value={form.medical_insurance_number} editing onChange={val => setForm(f => ({ ...f, medical_insurance_number: val }))} />
              <ProfileField label="Insurance Card Image" value={form.card_file?.name || ''} editing onChange={() => {}} hint="Select a new image to upload" />
              {editing?.insurance_card_image && <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)' }}>Current image will be replaced if you upload a new one.</p>}
              <input type="file" accept="image/*" onChange={e => setForm(f => ({ ...f, card_file: e.target.files[0] }))} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }} />
            </div>
            <div className="doc-preview-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="profile-btn profile-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="profile-btn profile-btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}

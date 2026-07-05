import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import ProfileField from './ProfileField';
import '../styles/profile.css';

export default function ProfileCertifications({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false);
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

  function openCreate() { resetForm(); setEditing(true); }

  function cancel() { setEditing(false); resetForm(); }

  async function handleSave() {
    await hrApi.post(`/employees/${profile.id}/certifications`, form);
    setEditing(false);
    onUpdate();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this certification?')) return;
    await hrApi.delete(`/employees/${profile.id}/certifications/${id}`);
    onUpdate();
  }

  const items = profile.certifications || [];

  return (
    <ProfileSection
      title="Certifications"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>}
      editing={editing}
      onEdit={items.length > 0 ? undefined : openCreate}
      onSave={handleSave}
      onCancel={cancel}
      actions={!editing && <button className="profile-btn profile-btn-primary profile-btn-sm" onClick={openCreate}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add
      </button>}
    >
      {editing ? (
        <div className="profile-fields-grid">
          <ProfileField label="Name *" value={form.name} editing required onChange={val => setForm(f => ({ ...f, name: val }))} />
          <ProfileField label="Issuing Authority" value={form.issuing_authority} editing onChange={val => setForm(f => ({ ...f, issuing_authority: val }))} />
          <ProfileField label="Issue Date" value={form.issue_date} type="date" editing onChange={val => setForm(f => ({ ...f, issue_date: val }))} />
          <ProfileField label="Expiry Date" value={form.expiry_date} type="date" editing onChange={val => setForm(f => ({ ...f, expiry_date: val }))} />
          <ProfileField label="Credential URL" value={form.credential_url} editing onChange={val => setForm(f => ({ ...f, credential_url: val }))} />
        </div>
      ) : items.length === 0 ? (
        <div className="doc-empty" style={{ padding: '30px 20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 40 }}>📜</span>
          <h4>No certifications</h4>
        </div>
      ) : (
        <div className="documents-list">
          {items.map((c, i) => (
            <div key={c.id} className="doc-list-item doc-stagger-enter" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="doc-list-icon" style={{ background: 'rgba(59,130,246,0.12)' }}>📜</div>
              <div className="doc-list-info">
                <div className="doc-list-name"><strong>{c.name}</strong></div>
                <div className="doc-list-meta">
                  {c.issuing_authority && <span>{c.issuing_authority}</span>}
                  {c.issue_date && <span>Issued: {fmtDate(c.issue_date)}</span>}
                  {c.expiry_date && <span>Expires: {fmtDate(c.expiry_date)}</span>}
                  {c.credential_url && <a href={c.credential_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)' }}>View</a>}
                </div>
              </div>
              <div className="doc-list-actions">
                <button className="profile-btn profile-btn-xs profile-btn-danger" onClick={() => handleDelete(c.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

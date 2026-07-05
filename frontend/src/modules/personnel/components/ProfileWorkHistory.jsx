import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import ProfileField from './ProfileField';
import '../styles/profile.css';

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
    <ProfileSection
      title="Work History"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
      actions={<button className="profile-btn profile-btn-primary profile-btn-sm" onClick={openCreate}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add
      </button>}
    >
      {(!profile.workHistory || profile.workHistory.length === 0) ? (
        <div className="doc-empty" style={{ padding: '30px 20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 40 }}>💼</span>
          <h4>No work history records</h4>
        </div>
      ) : (
        <div className="documents-list">
          {profile.workHistory.map((w, i) => (
            <div key={w.id} className="doc-list-item doc-stagger-enter" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="doc-list-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>💼</div>
              <div className="doc-list-info">
                <div className="doc-list-name"><strong>{w.position}</strong> at {w.company}</div>
                <div className="doc-list-meta">
                  <span>{fmtDate(w.from_date) || '—'} → {fmtDate(w.to_date) || 'Present'}</span>
                  {w.reason_leaving && <span>Reason: {w.reason_leaving}</span>}
                </div>
              </div>
              <div className="doc-list-actions">
                <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={() => openEdit(w)}>Edit</button>
                <button className="profile-btn profile-btn-xs profile-btn-danger" onClick={() => handleDelete(w.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="doc-preview-overlay" onClick={() => setShowForm(false)}>
          <div className="doc-preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="doc-preview-header">
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Work History' : 'Add Work History'}</h3>
              <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={() => setShowForm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="doc-preview-body" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch', background: 'var(--bg-glass)' }}>
              <ProfileField label="Company" value={form.company} editing onChange={val => setForm(f => ({ ...f, company: val }))} />
              <ProfileField label="Position" value={form.position} editing onChange={val => setForm(f => ({ ...f, position: val }))} />
              <ProfileField label="From Date" value={form.from_date} type="date" editing onChange={val => setForm(f => ({ ...f, from_date: val }))} />
              <ProfileField label="To Date" value={form.to_date} type="date" editing onChange={val => setForm(f => ({ ...f, to_date: val }))} />
              <ProfileField label="Reason for Leaving" value={form.reason_leaving} type="textarea" editing onChange={val => setForm(f => ({ ...f, reason_leaving: val }))} />
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

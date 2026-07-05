import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import ProfileField from './ProfileField';
import '../styles/profile.css';

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
    <ProfileSection
      title="Education"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
      actions={<button className="profile-btn profile-btn-primary profile-btn-sm" onClick={openCreate}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add
      </button>}
    >
      {(!profile.education || profile.education.length === 0) ? (
        <div className="doc-empty" style={{ padding: '30px 20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 40 }}>🎓</span>
          <h4>No education records</h4>
        </div>
      ) : (
        <div className="documents-list">
          {profile.education.map((e, i) => (
            <div key={e.id} className="doc-list-item doc-stagger-enter" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="doc-list-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>🎓</div>
              <div className="doc-list-info">
                <div className="doc-list-name"><strong>{e.degree}</strong> in {e.field_of_study || '—'}</div>
                <div className="doc-list-meta">
                  <span>{e.institution}</span>
                  {e.graduation_year && <span>{e.graduation_year}</span>}
                  {e.grade && <span>Grade: {e.grade}</span>}
                </div>
              </div>
              <div className="doc-list-actions">
                <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={() => openEdit(e)}>Edit</button>
                <button className="profile-btn profile-btn-xs profile-btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="doc-preview-overlay" onClick={() => setShowForm(false)}>
          <div className="doc-preview-modal profile-form-modal" onClick={e => e.stopPropagation()}>
            <div className="doc-preview-header">
              <h3 style={{ margin: 0 }}>{editing ? 'Edit Education' : 'Add Education'}</h3>
              <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={() => setShowForm(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="doc-preview-body profile-form-body">
              <ProfileField label="Degree" value={form.degree} editing onChange={val => setForm(f => ({ ...f, degree: val }))} />
              <ProfileField label="Institution" value={form.institution} editing onChange={val => setForm(f => ({ ...f, institution: val }))} />
              <ProfileField label="Field of Study" value={form.field_of_study} editing onChange={val => setForm(f => ({ ...f, field_of_study: val }))} />
              <ProfileField label="Graduation Year" value={form.graduation_year} type="number" editing onChange={val => setForm(f => ({ ...f, graduation_year: val }))} />
              <ProfileField label="Grade" value={form.grade} editing onChange={val => setForm(f => ({ ...f, grade: val }))} />
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

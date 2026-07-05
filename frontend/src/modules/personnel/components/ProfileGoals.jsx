import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import ProfileField from './ProfileField';
import '../styles/profile.css';

const ICON_OPTIONS = [
  { value: 'lucide:target', label: 'Target' }, { value: 'lucide:book-open', label: 'Book' },
  { value: 'lucide:users', label: 'Users' }, { value: 'lucide:trending-up', label: 'Trend Up' },
  { value: 'lucide:award', label: 'Award' }, { value: 'lucide:star', label: 'Star' },
  { value: 'lucide:zap', label: 'Zap' }, { value: 'lucide:heart', label: 'Heart' },
  { value: 'lucide:flag', label: 'Flag' }, { value: 'lucide:compass', label: 'Compass' },
];

const COLOR_OPTIONS = [
  { value: '#818cf8', label: 'Purple' }, { value: '#f97316', label: 'Orange' },
  { value: '#22c55e', label: 'Green' }, { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' }, { value: '#ec4899', label: 'Pink' },
  { value: '#f59e0b', label: 'Yellow' }, { value: '#14b8a6', label: 'Teal' },
];

export default function ProfileGoals({ profile, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', progress_percentage: 0, icon: 'lucide:target', color: '#818cf8', sort_order: 0 });

  function resetForm() { setForm({ title: '', description: '', progress_percentage: 0, icon: 'lucide:target', color: '#818cf8', sort_order: 0 }); setEditingGoal(null); }

  function openEdit(goal) {
    setForm({ title: goal.title, description: goal.description || '', progress_percentage: parseFloat(goal.progress_percentage) || 0, icon: goal.icon || 'lucide:target', color: goal.color || '#818cf8', sort_order: goal.sort_order || 0 });
    setEditingGoal(goal);
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    if (editingGoal) {
      await hrApi.put(`/employees/${profile.id}/goals/${editingGoal.id}`, form);
    } else {
      await hrApi.post(`/employees/${profile.id}/goals`, form);
    }
    setShowForm(false);
    resetForm();
    onUpdate();
  }

  async function handleDelete(goalId) {
    if (!confirm('Delete this goal?')) return;
    await hrApi.delete(`/employees/${profile.id}/goals/${goalId}`);
    onUpdate();
  }

  return (
    <ProfileSection
      title="Personal Goals"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>}
      actions={<button className="profile-btn profile-btn-primary profile-btn-sm" onClick={() => { resetForm(); setShowForm(true); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Goal
      </button>}
    >
      {(!profile.goals || profile.goals.length === 0) ? (
        <div className="doc-empty" style={{ padding: '30px 20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 40 }}>🎯</span>
          <h4>No goals set</h4>
        </div>
      ) : (
        <div className="documents-list">
          {profile.goals?.map((g, i) => (
            <div key={g.id} className="doc-list-item doc-stagger-enter" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="doc-list-icon" style={{ background: `${g.color || '#818cf8'}15`, fontSize: 20 }}>
                <span className="iconify" data-icon={g.icon || 'lucide:target'} style={{ color: g.color || '#818cf8' }}></span>
              </div>
              <div className="doc-list-info">
                <div className="doc-list-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{g.title}</strong>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: g.color || '#818cf8' }}>{Math.round(g.progress_percentage)}%</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, margin: '4px 0' }}>
                  <div style={{ width: `${Math.round(g.progress_percentage)}%`, height: '100%', background: g.color || '#818cf8', borderRadius: 3, transition: 'width 0.6s ease' }}></div>
                </div>
                {g.description && <div className="doc-list-meta">{g.description}</div>}
              </div>
              <div className="doc-list-actions">
                <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={() => openEdit(g)}>Edit</button>
                <button className="profile-btn profile-btn-xs profile-btn-danger" onClick={() => handleDelete(g.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="doc-preview-overlay" onClick={() => setShowForm(false)}>
          <div className="doc-preview-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="doc-preview-header">
              <h3 style={{ margin: 0 }}>{editingGoal ? 'Edit Goal' : 'Add Goal'}</h3>
              <button className="profile-btn profile-btn-ghost profile-btn-sm" onClick={() => { setShowForm(false); resetForm(); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="doc-preview-body" style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch', background: 'var(--bg-glass)' }}>
              <ProfileField label="Title *" value={form.title} editing onChange={val => setForm(f => ({ ...f, title: val }))} />
              <ProfileField label="Description" value={form.description} type="textarea" editing onChange={val => setForm(f => ({ ...f, description: val }))} />
              <ProfileField label="Progress %" value={form.progress_percentage} type="number" editing onChange={val => setForm(f => ({ ...f, progress_percentage: Math.min(100, Math.max(0, parseInt(val) || 0)) }))} />
              <ProfileField label="Icon" value={form.icon} type="select" editing
                options={ICON_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
                onChange={val => setForm(f => ({ ...f, icon: val }))} />
              <ProfileField label="Sort Order" value={form.sort_order} type="number" editing onChange={val => setForm(f => ({ ...f, sort_order: parseInt(val) || 0 }))} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Color</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {COLOR_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, color: opt.value }))} title={opt.label}
                      style={{ width: 30, height: 30, borderRadius: '50%', border: form.color === opt.value ? '3px solid white' : '2px solid transparent', background: opt.value, cursor: 'pointer', outline: form.color === opt.value ? `2px solid ${opt.value}` : 'none', transition: 'all 200ms ease' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="doc-preview-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="profile-btn profile-btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button className="profile-btn profile-btn-primary" onClick={handleSave}>{editingGoal ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </ProfileSection>
  );
}

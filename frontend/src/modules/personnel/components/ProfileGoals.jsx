import { useState } from 'react';
import hrApi from '../../../shared/api/hrApi';

const ICON_OPTIONS = [
  { value: 'lucide:target', label: 'Target' },
  { value: 'lucide:book-open', label: 'Book' },
  { value: 'lucide:users', label: 'Users' },
  { value: 'lucide:trending-up', label: 'Trend Up' },
  { value: 'lucide:award', label: 'Award' },
  { value: 'lucide:star', label: 'Star' },
  { value: 'lucide:zap', label: 'Zap' },
  { value: 'lucide:heart', label: 'Heart' },
  { value: 'lucide:flag', label: 'Flag' },
  { value: 'lucide:compass', label: 'Compass' },
];

const COLOR_OPTIONS = [
  { value: '#818cf8', label: 'Purple' },
  { value: '#f97316', label: 'Orange' },
  { value: '#22c55e', label: 'Green' },
  { value: '#ef4444', label: 'Red' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f59e0b', label: 'Yellow' },
  { value: '#14b8a6', label: 'Teal' },
];

export default function ProfileGoals({ profile, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    progress_percentage: 0,
    icon: 'lucide:target',
    color: '#818cf8',
    sort_order: 0,
  });

  function resetForm() {
    setForm({ title: '', description: '', progress_percentage: 0, icon: 'lucide:target', color: '#818cf8', sort_order: 0 });
    setEditingGoal(null);
  }

  function openEdit(goal) {
    setForm({
      title: goal.title,
      description: goal.description || '',
      progress_percentage: parseFloat(goal.progress_percentage) || 0,
      icon: goal.icon || 'lucide:target',
      color: goal.color || '#818cf8',
      sort_order: goal.sort_order || 0,
    });
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
    <div className="glass-card">
      <div className="glass-card-header">
        <h3>Personal Goals</h3>
        <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>+ Add Goal</button>
      </div>
      <div className="glass-card-body">
        {(!profile.goals || profile.goals.length === 0) && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No goals set.</p>}
        {profile.goals?.map(g => (
          <div key={g.id} className="glass-detail-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className="iconify" data-icon={g.icon || 'lucide:target'} style={{ fontSize: 24, color: g.color || '#818cf8', flexShrink: 0 }}></span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{g.title}</strong>
                <span>{Math.round(g.progress_percentage)}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, margin: '4px 0' }}>
                <div style={{ width: `${Math.round(g.progress_percentage)}%`, height: '100%', background: g.color || '#818cf8', borderRadius: 3 }}></div>
              </div>
              {g.description && <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{g.description}</p>}
            </div>
            <div className="" style={{ display: 'flex', gap: 4 }}>
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => openEdit(g)} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Edit</button>
              <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => handleDelete(g.id)} style={{ padding: '2px 8px', fontSize: '0.8rem' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="glass-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>{editingGoal ? 'Edit Goal' : 'Add Goal'}</h2>
            <label>Title *<input className="glass-form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
            <label>Description<textarea className="glass-form-control" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
            <label>
              Progress %
              <input className="glass-form-control" type="number" min={0} max={100} value={form.progress_percentage} onChange={e => setForm({ ...form, progress_percentage: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })} />
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <label style={{ flex: 1 }}>
                Icon
                <select className="glass-form-control" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>
                  {ICON_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Color
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: opt.value })}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', border: form.color === opt.value ? '3px solid white' : '2px solid transparent',
                        background: opt.value, cursor: 'pointer', outline: form.color === opt.value ? `2px solid ${opt.value}` : 'none',
                      }}
                      title={opt.label}
                    />
                  ))}
                </div>
              </label>
            </div>
            <label>
              Sort Order
              <input className="glass-form-control" type="number" min={0} value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
            </label>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleSave}>{editingGoal ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';

export default function PlatformAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [resetPwId, setResetPwId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('platformToken');
  const currentAdmin = JSON.parse(localStorage.getItem('platformAdmin') || '{}');

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/platform/admins', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAdmins(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const openCreate = () => {
    setEditAdmin(null);
    setForm({ username: '', email: '', password: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (admin) => {
    setEditAdmin(admin);
    setForm({ username: admin.username, email: admin.email, password: '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editAdmin) {
        const res = await fetch(`/api/platform/admins/${editAdmin.id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      } else {
        const res = await fetch('/api/platform/admins', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      }
      setShowModal(false);
      fetchAdmins();
    } catch { setError('Failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (admin) => {
    if (!confirm(`Delete admin "${admin.username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/platform/admins/${admin.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchAdmins();
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('Failed'); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/platform/admins/${resetPwId}/reset-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) { setResetPwId(null); setNewPassword(''); alert('Password reset successfully'); }
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('Failed'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (admin) => {
    try {
      const res = await fetch(`/api/platform/admins/${admin.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !admin.is_active }),
      });
      if (res.ok) fetchAdmins();
    } catch {}
  };

  if (loading) return <div className="glass-loading"><div className="spinner" /></div>;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <div>
          <h1>Platform Admins</h1>
          <p>Manage super admin accounts for the WorkTrack platform</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={openCreate}>
          <Icon icon="lucide:plus" size={16} /> Add Admin
        </button>
      </div>

      <div className="glass-card">
        <div className="platform-admins-grid">
          {admins.map(admin => (
            <div key={admin.id} className="platform-admin-card">
              <div className="admin-details">
                <strong>{admin.username}</strong>
                <span>{admin.email}</span>
                <div className="platform-badges-row">
                  <span className={`glass-badge glass-badge-${admin.is_active ? 'success' : 'error'}`}>
                    {admin.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {admin.id === currentAdmin.id && (
                    <span className="glass-badge glass-badge-info">You</span>
                  )}
                </div>
              </div>
              <div className="admin-controls">
                <button onClick={() => openEdit(admin)} className="glass-btn glass-btn-sm glass-btn-ghost" title="Edit">
                  <Icon icon="lucide:pencil" size={14} />
                </button>
                <button onClick={() => { setResetPwId(admin.id); setNewPassword(''); }} className="glass-btn glass-btn-sm glass-btn-ghost" title="Reset Password">
                  <Icon icon="lucide:key" size={14} />
                </button>
                {admin.id !== currentAdmin.id && (
                  <>
                    <button onClick={() => handleToggleActive(admin)} className="glass-btn glass-btn-sm glass-btn-ghost" title={admin.is_active ? 'Deactivate' : 'Activate'}>
                      <Icon icon={admin.is_active ? 'lucide:pause' : 'lucide:check'} size={14} />
                    </button>
                    <button onClick={() => handleDelete(admin)} className="glass-btn glass-btn-sm glass-btn-danger" title="Delete">
                      <Icon icon="lucide:trash-2" size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="platform-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <h2>{editAdmin ? 'Edit Admin' : 'Create New Admin'}</h2>
            {error && <div className="glass-alert glass-alert-error">{error}</div>}
            <div className="platform-modal-form">
              {!editAdmin && (
                <div className="glass-input-group">
                  <label>Username</label>
                  <input className="glass-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                </div>
              )}
              <div className="glass-input-group">
                <label>Email</label>
                <input className="glass-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              {!editAdmin && (
                <div className="glass-input-group">
                  <label>Password</label>
                  <input className="glass-input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
                </div>
              )}
            </div>
            <div className="platform-modal-actions">
              <button className="glass-btn glass-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editAdmin ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPwId && (
        <div className="platform-modal-overlay" onClick={() => setResetPwId(null)}>
          <div className="platform-modal" onClick={e => e.stopPropagation()}>
            <h2>Reset Password</h2>
            <div className="glass-input-group">
              <label>New Password</label>
              <input className="glass-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" autoFocus />
            </div>
            <div className="platform-modal-actions">
              <button className="glass-btn glass-btn-ghost" onClick={() => setResetPwId(null)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleResetPassword} disabled={saving || newPassword.length < 8}>
                {saving ? 'Saving...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

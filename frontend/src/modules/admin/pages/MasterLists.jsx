import { useState, useEffect } from 'react';
import adminApi from '../../../shared/api/adminApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';

export default function MasterLists() {
  const [activeTab, setActiveTab] = useState('skills');
  const [skills, setSkills] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');

  const fetchSkills = async () => {
    try {
      const res = await adminApi.get('/master-skills');
      setSkills(res.data);
    } catch { setMessage('Failed to load skills'); }
  };

  const fetchCerts = async () => {
    try {
      const res = await adminApi.get('/master-certifications');
      setCerts(res.data);
    } catch { setMessage('Failed to load certifications'); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSkills(), fetchCerts()]).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      if (activeTab === 'skills') {
        await adminApi.post('/master-skills', { name });
        await fetchSkills();
      } else {
        await adminApi.post('/master-certifications', { name });
        await fetchCerts();
      }
      setNewName('');
      setMessage(`"${name}" added`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to add');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUpdate = async () => {
    const name = editName.trim();
    if (!name || !editing) return;
    try {
      if (activeTab === 'skills') {
        await adminApi.put(`/master-skills/${editing.id}`, { name });
        await fetchSkills();
      } else {
        await adminApi.put(`/master-certifications/${editing.id}`, { name });
        await fetchCerts();
      }
      setEditing(null);
      setEditName('');
      setMessage(`Updated to "${name}"`);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Failed to update');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (id) => {
    try {
      if (activeTab === 'skills') {
        await adminApi.delete(`/master-skills/${id}`);
        await fetchSkills();
      } else {
        await adminApi.delete(`/master-certifications/${id}`);
        await fetchCerts();
      }
      setMessage('Deleted');
    } catch (err) {
      setMessage('Failed to delete');
    }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const list = activeTab === 'skills' ? skills : certs;

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner"></div>
      <span>Loading master lists...</span>
    </div>
  );

  return (
    <div className="page fade-in-up">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="iconify" data-icon="lucide:list" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></span>
          Master Lists
        </h1>
      </div>

      {message && (
        <div className="glass-alert glass-alert-info">
          <span className="iconify" data-icon="lucide:info"></span>
          {message}
        </div>
      )}

      <div className="glass-tabs" style={{ marginBottom: 20 }}>
        <button className={`glass-tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>
          <span className="iconify" data-icon="lucide:wrench" style={{ marginRight: 4 }}></span> Skills
        </button>
        <button className={`glass-tab ${activeTab === 'certs' ? 'active' : ''}`} onClick={() => setActiveTab('certs')}>
          <span className="iconify" data-icon="lucide:award" style={{ marginRight: 4 }}></span> Certifications
        </button>
      </div>

      <div className="glass-card fade-in-up">
        <div className="glass-card-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input className="glass-input" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder={`Add new ${activeTab === 'skills' ? 'skill' : 'certification'}...`}
              style={{ maxWidth: 400 }} />
            <button className="glass-btn glass-btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
              <span className="iconify" data-icon="lucide:plus"></span> Add
            </button>
          </div>

          <div className="glass-table-wrapper">
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Name</th>
                  <th style={{ width: 200 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={3}>
                    <div className="glass-empty" style={{ minHeight: 120 }}>
                      <span className="iconify" data-icon="lucide:inbox"></span>
                      <h3>No {activeTab === 'skills' ? 'skills' : 'certifications'} yet.</h3>
                      <p>Add one above.</p>
                    </div>
                  </td></tr>
                ) : list.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: 'var(--text-dim)' }}>{item.id}</td>
                    <td>
                      {editing?.id === item.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input className="glass-input" value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditing(null); }}
                            style={{ maxWidth: 300 }} />
                          <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={handleUpdate}>Save</button>
                          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      ) : <strong>{item.name}</strong>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => { setEditing(item); setEditName(item.name); }}>
                          <span className="iconify" data-icon="lucide:pencil"></span> Edit
                        </button>
                        <button className="glass-btn glass-btn-xs glass-btn-danger" onClick={() => setConfirm(item)}>
                          <span className="iconify" data-icon="lucide:trash-2"></span> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          message={`Delete "${confirm.name}"?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

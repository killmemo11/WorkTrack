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

  if (loading) return <div className="loading">Loading master lists...</div>;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2>Master Lists</h2>
      </div>

      {message && <div className="alert alert-info">{message}</div>}

      <div className="tabs" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button className={`btn btn-sm ${activeTab === 'skills' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('skills')}>Skills</button>
        <button className={`btn btn-sm ${activeTab === 'certs' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('certs')}>Certifications</button>
      </div>

      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input className="form-control" value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              placeholder={`Add new ${activeTab === 'skills' ? 'skill' : 'certification'}...`}
              style={{ maxWidth: 400 }} />
            <button className="btn btn-primary" onClick={handleAdd} disabled={!newName.trim()}>+ Add</button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>#</th>
                <th>Name</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={3} className="text-center">No {activeTab === 'skills' ? 'skills' : 'certifications'} yet. Add one above.</td></tr>
              ) : list.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>
                    {editing?.id === item.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input className="form-control form-control-sm" value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditing(null); }}
                          style={{ maxWidth: 300 }} />
                        <button className="btn btn-sm btn-primary" onClick={handleUpdate}>Save</button>
                        <button className="btn btn-sm btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                      </div>
                    ) : item.name}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditing(item); setEditName(item.name); }}>Edit</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirm(item)} style={{ marginLeft: 4 }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import '../styles/profile.css';

export default function ProfileSalary({ employeeId }) {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ component_name: '', amount: '' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ component_name: '', amount: '' });

  useEffect(() => { fetchSalary(); }, [employeeId]);

  const fetchSalary = async () => {
    try {
      const res = await hrApi.get(`/employees/${employeeId}/salary`);
      setComponents(res.data);
    } catch {} finally { setLoading(false); }
  };

  const add = async () => {
    if (!addForm.component_name.trim() || !addForm.amount) return;
    try {
      await hrApi.post(`/employees/${employeeId}/salary`, addForm);
      setAddForm({ component_name: '', amount: '' });
      setShowAdd(false);
      setMessage('Component added');
      fetchSalary();
    } catch (err) { setMessage('Failed: ' + (err.response?.data?.error || err.message)); }
    setTimeout(() => setMessage(''), 3000);
  };

  const saveEdit = async (compId) => {
    try {
      await hrApi.put(`/employees/${employeeId}/salary/${compId}`, editForm);
      setEditingId(null);
      setMessage('Component updated');
      fetchSalary();
    } catch (err) { setMessage('Failed: ' + (err.response?.data?.error || err.message)); }
    setTimeout(() => setMessage(''), 3000);
  };

  const remove = async (compId) => {
    try {
      await hrApi.delete(`/employees/${employeeId}/salary/${compId}`);
      setMessage('Component deleted');
      fetchSalary();
    } catch (err) { setMessage('Failed: ' + (err.response?.data?.error || err.message)); }
    setTimeout(() => setMessage(''), 3000);
  };

  const total = components.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);

  if (loading) return (
    <ProfileSection title="Salary" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}>
      <div className="doc-skeleton"><div className="doc-skeleton-card" style={{ height: 60 }} /></div>
    </ProfileSection>
  );

  return (
    <ProfileSection
      title="Salary Components"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
      actions={<button className="profile-btn profile-btn-primary profile-btn-sm" onClick={() => setShowAdd(!showAdd)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Component
      </button>}
    >
      {message && <div className={`profile-message profile-message-${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

      {showAdd && (
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16, border: '1px solid rgba(255,255,255,0.04)', animation: 'slideDown 300ms ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Component Name</label>
              <input className="profile-field-input" value={addForm.component_name} onChange={e => setAddForm({...addForm, component_name: e.target.value})} placeholder="e.g. الراتب الأساسي" />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Amount</label>
              <input type="number" className="profile-field-input" value={addForm.amount} onChange={e => setAddForm({...addForm, amount: e.target.value})} placeholder="5000" step="0.01" min="0" />
            </div>
          </div>
          <button className="profile-btn profile-btn-primary" style={{ marginTop: 12 }} onClick={add}>Add Component</button>
        </div>
      )}

      {components.length === 0 ? (
        <div className="doc-empty" style={{ padding: '20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 36 }}>💰</span>
          <h4>No salary components yet</h4>
          <p>Add the basic salary and allowances.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Component</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Amount</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--text-dim)', fontWeight: 500 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {components.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  {editingId === c.id ? (
                    <>
                      <td style={{ padding: '6px 12px' }}><input className="profile-field-input" value={editForm.component_name}
                        onChange={e => setEditForm({...editForm, component_name: e.target.value})} /></td>
                      <td style={{ padding: '6px 12px' }}><input type="number" className="profile-field-input" style={{ textAlign: 'right' }} value={editForm.amount}
                        onChange={e => setEditForm({...editForm, amount: e.target.value})} step="0.01" min="0" /></td>
                      <td style={{ padding: '6px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="profile-btn profile-btn-xs profile-btn-primary" onClick={() => saveEdit(c.id)}>Save</button>
                          <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '10px 12px' }}><strong>{c.component_name}</strong></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{parseFloat(c.amount).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="profile-btn profile-btn-xs profile-btn-ghost" onClick={() => { setEditingId(c.id); setEditForm({ component_name: c.component_name, amount: c.amount }); }}>Edit</button>
                          <button className="profile-btn profile-btn-xs profile-btn-danger" onClick={() => remove(c.id)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600, borderTop: '2px solid rgba(99,102,241,0.3)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--brand-primary)' }}>Total</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--brand-primary)', fontVariantNumeric: 'tabular-nums' }}>{total.toFixed(2)}</td>
                <td style={{ padding: '10px 12px' }}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ProfileSection>
  );
}

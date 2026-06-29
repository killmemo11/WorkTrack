// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

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

  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div>
      {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Salary Components</h3>
        <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add Component</button>
      </div>

      {showAdd && (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group">
              <label>Component Name</label>
              <input className="form-control" value={addForm.component_name}
                onChange={e => setAddForm({...addForm, component_name: e.target.value})}
                placeholder="e.g. الراتب الأساسي" />
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input type="number" className="form-control" value={addForm.amount}
                onChange={e => setAddForm({...addForm, amount: e.target.value})}
                placeholder="5000" step="0.01" min="0" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={add}>Add</button>
        </div>
      )}

      <div className="table-wrapper">
        {components.length === 0 ? (
          <p className="empty-state">No salary components yet. Add the basic salary and allowances.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Component</th>
                <th style={{width: 200}}>Amount</th>
                <th style={{width: 160}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {components.map(c => (
                <tr key={c.id}>
                  {editingId === c.id ? (
                    <>
                      <td>
                        <input className="form-control" style={{width:'100%'}} value={editForm.component_name}
                          onChange={e => setEditForm({...editForm, component_name: e.target.value})} />
                      </td>
                      <td>
                        <input type="number" className="form-control" style={{width:'100%'}} value={editForm.amount}
                          onChange={e => setEditForm({...editForm, amount: e.target.value})} step="0.01" min="0" />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-primary" onClick={() => saveEdit(c.id)}>Save</button>
                          <button className="btn btn-sm btn-outline" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><strong>{c.component_name}</strong></td>
                      <td>{parseFloat(c.amount).toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-sm btn-outline" onClick={() => { setEditingId(c.id); setEditForm({ component_name: c.component_name, amount: c.amount }); }}>Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', background: '#e8f4e8' }}>
                <td>Total</td>
                <td>{total.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

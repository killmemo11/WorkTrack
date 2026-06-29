// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import HRLayout from '../../../shared/components/Layout/HRLayout';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';

const CATEGORIES = ['laptop', 'phone', 'badge', 'accessory', 'other'];
const STATUSES = ['available', 'assigned', 'damaged', 'disposed'];

export default function AssetCatalog() {
  const [data, setData] = useState({ assets: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'other', serial_number: '', brand: '', model: '', purchase_date: '', purchase_price: '', notes: '' });

  const [assignModal, setAssignModal] = useState(null);
  const [assignForm, setAssignForm] = useState({ employee_id: '', expected_return_date: '', condition_at_assign: '', notes: '' });
  const [employees, setEmployees] = useState([]);

  const [returnModal, setReturnModal] = useState(null);
  const [returnForm, setReturnForm] = useState({ condition_on_return: '', return_notes: '' });

  const [historyAsset, setHistoryAsset] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const [confirm, setConfirm] = useState(null);

  const fetchAssets = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (catFilter) params.set('category', catFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('q', search);
      const res = await hrApi.get('/assets?' + params.toString());
      setData(res.data);
      setPage(p);
    } catch (err) {
      setMessage('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssets(1); }, [catFilter, statusFilter]);

  const openCreate = () => {
    setEditId(null);
    setForm({ name: '', category: 'other', serial_number: '', brand: '', model: '', purchase_date: '', purchase_price: '', notes: '' });
    setShowForm(true);
  };

  const openEdit = async (asset) => {
    setEditId(asset.id);
    setForm({
      name: asset.name, category: asset.category, serial_number: asset.serial_number || '',
      brand: asset.brand || '', model: asset.model || '',
      purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : '',
      purchase_price: asset.purchase_price || '', notes: asset.notes || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setMessage('Asset name is required'); setTimeout(() => setMessage(''), 3000); return; }
    try {
      if (editId) {
        await hrApi.put(`/assets/${editId}`, form);
        setMessage('Asset updated');
      } else {
        await hrApi.post('/assets', form);
        setMessage('Asset created');
      }
      setShowForm(false);
      fetchAssets(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = async (asset) => {
    try {
      await hrApi.delete(`/assets/${asset.id}`);
      setMessage('Asset deleted');
      fetchAssets(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const openAssign = async (asset) => {
    try {
      const res = await hrApi.get('/employees?limit=500');
      setEmployees(res.data.employees || []);
    } catch (err) { console.error(err); }
    setAssignModal(asset);
    setAssignForm({ employee_id: '', expected_return_date: '', condition_at_assign: '', notes: '' });
  };

  const handleAssign = async () => {
    if (!assignForm.employee_id) { setMessage('Select an employee'); setTimeout(() => setMessage(''), 3000); return; }
    try {
      await hrApi.post(`/assets/${assignModal.id}/assign`, assignForm);
      setMessage('Asset assigned');
      setAssignModal(null);
      fetchAssets(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const openReturn = (asset) => {
    setReturnModal(asset);
    setReturnForm({ condition_on_return: '', return_notes: '' });
  };

  const handleReturn = async () => {
    try {
      await hrApi.post(`/assets/${returnModal.id}/return`, returnForm);
      setMessage('Asset returned');
      setReturnModal(null);
      fetchAssets(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleMarkDamaged = async (asset) => {
    try {
      await hrApi.post(`/assets/${asset.id}/damaged`);
      setMessage('Asset marked as damaged');
      fetchAssets(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDispose = async (asset) => {
    try {
      await hrApi.post(`/assets/${asset.id}/dispose`);
      setMessage('Asset disposed');
      fetchAssets(page);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const openHistory = async (asset) => {
    try {
      const res = await hrApi.get(`/assets/${asset.id}/history`);
      setHistoryData(res.data);
      setHistoryAsset(asset);
    } catch (err) {
      setMessage('Failed to load history');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const statusBadge = (s) => {
    const colors = { available: 'tag-green', assigned: 'tag-blue', damaged: 'tag-red', disposed: 'tag-gray' };
    return <span className={`tag ${colors[s] || 'tag-gray'}`}>{s}</span>;
  };

  if (loading && data.assets.length === 0) return <HRLayout><div className="loading">Loading...</div></HRLayout>;

  return (
    <HRLayout>
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Asset Catalog</h1>
            <p className="subtitle">Track and manage company assets (laptops, phones, badges, etc.)</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Asset</button>
        </div>

        {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

        <div className="filters" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <select className="form-control" style={{ width: 140 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-control" style={{ width: 130 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="form-control" style={{ width: 200 }} placeholder="Search name, serial, brand..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAssets(1)} />
          {search && <button className="btn btn-sm btn-outline" onClick={() => { setSearch(''); fetchAssets(1); }}>Clear</button>}
        </div>

        <div className="table-wrapper">
          {data.assets.length === 0 ? (
            <p className="empty-state">No assets found. Click "+ Add Asset" to get started.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Serial #</th>
                  <th>Brand / Model</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.assets.map(asset => (
                  <tr key={asset.id}>
                    <td><strong>{asset.name}</strong></td>
                    <td><span className="tag tag-blue">{asset.category}</span></td>
                    <td>{asset.serial_number || '—'}</td>
                    <td>{[asset.brand, asset.model].filter(Boolean).join(' / ') || '—'}</td>
                    <td>{statusBadge(asset.status)}</td>
                    <td>{asset.assigned_to_name ? (
                      <a href={`/hr/employees/${asset.assigned_to_id}/profile`} className="link">{asset.assigned_to_name}</a>
                    ) : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-outline" onClick={() => openEdit(asset)}>Edit</button>
                        {asset.status === 'available' && <button className="btn btn-sm btn-primary" onClick={() => openAssign(asset)}>Assign</button>}
                        {asset.status === 'assigned' && <button className="btn btn-sm btn-outline" onClick={() => openReturn(asset)}>Return</button>}
                        {asset.status === 'assigned' && <button className="btn btn-sm btn-outline" onClick={() => handleMarkDamaged(asset)}>Damaged</button>}
                        {(asset.status === 'available' || asset.status === 'damaged') && !asset.assigned_to_id &&
                          <button className="btn btn-sm btn-outline" onClick={() => {
                            if (asset.status === 'damaged') handleDispose(asset);
                            else setConfirm({ action: () => handleDelete(asset), label: `Delete "${asset.name}"?` });
                          }}>{asset.status === 'damaged' ? 'Dispose' : 'Delete'}</button>}
                        <button className="btn btn-sm btn-outline" onClick={() => openHistory(asset)}>History</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchAssets} />
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editId ? 'Edit Asset' : 'Add Asset'}</h3>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Serial Number</label>
                  <input className="form-control" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Brand</label>
                  <input className="form-control" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input className="form-control" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Purchase Date</label>
                  <input type="date" className="form-control" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Purchase Price</label>
                  <input type="number" step="0.01" className="form-control" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" rows="3" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>{editId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {assignModal && (
          <div className="modal-overlay" onClick={() => setAssignModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Assign Asset: {assignModal.name}</h3>
              <div className="form-group">
                <label>Employee *</label>
                <select className="form-control" value={assignForm.employee_id} onChange={e => setAssignForm({...assignForm, employee_id: e.target.value})}>
                  <option value="">Select employee...</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Expected Return Date</label>
                <input type="date" className="form-control" value={assignForm.expected_return_date} onChange={e => setAssignForm({...assignForm, expected_return_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Condition at Assign</label>
                <textarea className="form-control" rows="2" value={assignForm.condition_at_assign} onChange={e => setAssignForm({...assignForm, condition_at_assign: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" rows="2" value={assignForm.notes} onChange={e => setAssignForm({...assignForm, notes: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setAssignModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAssign}>Assign</button>
              </div>
            </div>
          </div>
        )}

        {returnModal && (
          <div className="modal-overlay" onClick={() => setReturnModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>Return Asset: {returnModal.name}</h3>
              <div className="form-group">
                <label>Condition on Return</label>
                <textarea className="form-control" rows="2" value={returnForm.condition_on_return} onChange={e => setReturnForm({...returnForm, condition_on_return: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" rows="2" value={returnForm.return_notes} onChange={e => setReturnForm({...returnForm, return_notes: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setReturnModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleReturn}>Confirm Return</button>
              </div>
            </div>
          </div>
        )}

        {historyAsset && (
          <div className="modal-overlay" onClick={() => setHistoryAsset(null)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
              <h3>Asset History: {historyAsset.name}</h3>
              {historyData.length === 0 ? (
                <p className="empty-state">No history records.</p>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Action</th>
                        <th>Employee</th>
                        <th>By</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.map(h => (
                        <tr key={h.id}>
                          <td>{new Date(h.created_at).toLocaleDateString()}</td>
                          <td><span className={`tag ${h.action === 'assigned' ? 'tag-blue' : h.action === 'returned' ? 'tag-green' : h.action === 'damaged' ? 'tag-red' : 'tag-gray'}`}>{h.action}</span></td>
                          <td>{h.employee_name || '—'}</td>
                          <td>{h.performed_by_name || '—'}</td>
                          <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setHistoryAsset(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {confirm && <ConfirmModal message={confirm.label} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      </div>
    </HRLayout>
  );
}

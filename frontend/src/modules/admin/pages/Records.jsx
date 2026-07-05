// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';
import { formatDate } from '../../../shared/utils/date';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';

export default function AdminRecords() {
  const [data, setData] = useState({ records: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', employee_id: '' });
  const [employees, setEmployees] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [message, setMessage] = useState('');
  const [editSignOut, setEditSignOut] = useState(null);
  const [editForm, setEditForm] = useState({ sign_out_time: '', notes: '' });

  useEffect(() => {
    hrApi.get('/employees?limit=9999').then((res) => setEmployees(res.data.employees || res.data)).catch((err) => console.error(err));
  }, []);

  const fetchRecords = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ...filters, page, limit: 20 });
      const res = await hrApi.get(`/records?${params}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, []);

  const handleExport = async () => {
    try {
      const res = await hrApi.get('/export', { params: filters, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMessage('Failed to export');
    }
  };

  const handleDelete = async (record) => {
    try {
      await hrApi.delete(`/records/${record.id}`);
      setData((prev) => ({
        ...prev,
        records: prev.records.filter((r) => r.id !== record.id),
        total: prev.total - 1,
      }));
      setMessage(`Record deleted (${record.employee_name}, ${record.date})`);
    } catch {
      setMessage('Failed to delete record');
    }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEditSignOut = async () => {
    try {
      await hrApi.put(`/records/${editSignOut.id}/signout`, editForm);
      setMessage(`Sign-out time updated for ${editSignOut.employee_name}`);
      setEditSignOut(null);
      setEditForm({ sign_out_time: '', notes: '' });
      fetchRecords(data.page);
    } catch (err) {
      console.error('Failed to update sign-out time:', err.response?.data || err.message);
      setMessage('Failed to update sign-out time: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  const calcDuration = (r) => {
    if (!r.sign_out_time) return '—';
    const h = (new Date(r.sign_out_time) - new Date(r.sign_in_time)) / (1000 * 60 * 60);
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <>
      <div className="page fade-in-up">
        <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border-glass)', marginBottom: 24 }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon icon="lucide:clipboard-list" style={{ fontSize: '1.4rem', color: 'var(--brand-primary)' }}></Icon>
              Attendance Records
            </h1>
            <p className="subtitle" style={{ color: 'var(--text-dim)' }}>View and manage all attendance records</p>
          </div>
          <button className="glass-btn glass-btn-ghost" onClick={handleExport}>
            <Icon icon="lucide:download"></Icon> Export Excel
          </button>
        </div>

        {message && (
          <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>
            <Icon icon={message.includes('Failed') ? 'lucide:alert-circle' : 'lucide:check-circle'}></Icon>
            {message}
          </div>
        )}

        <div className="glass-card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="glass-form-group" style={{ marginBottom: 0, minWidth: 180 }}>
              <label className="glass-label">Employee</label>
              <select className="glass-select" value={filters.employee_id} onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}>
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="glass-form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="glass-label">From Date</label>
              <input type="date" className="glass-input" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
            </div>
            <div className="glass-form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <label className="glass-label">To Date</label>
              <input type="date" className="glass-input" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="glass-btn glass-btn-primary" onClick={() => fetchRecords(1)}>
                <Icon icon="lucide:filter"></Icon> Filter
              </button>
              <button className="glass-btn glass-btn-ghost" onClick={() => { setFilters({ date_from: '', date_to: '', employee_id: '' }); fetchRecords(1); }}>
                <Icon icon="lucide:x"></Icon> Clear
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="glass-loading">
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        )}
        {!loading && <>
        <div className="glass-card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Records: <strong style={{ color: 'var(--text-primary)' }}>{data.total}</strong></span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Showing Page: <strong style={{ color: 'var(--text-primary)' }}>{data.page} / {data.totalPages}</strong></span>
        </div>

        <div className="glass-table-wrapper">
          {data.records.length === 0 ? (
            <div className="glass-empty">
              <Icon icon="lucide:inbox"></Icon>
              <h3>No records found</h3>
            </div>
          ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Employee</th>
                <th>Emp ID</th>
                <th>Sign In</th>
                <th>Sign Out</th>
                <th>Duration</th>
                <th>Notes</th>
                <th>Manual</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((r) => (
                <tr key={r.id}>
                  <td className="cell-mono">{formatDate(r.date)}</td>
                  <td>
                    <span className={`glass-badge ${r.type === 'office' ? 'glass-badge-success' : 'glass-badge-info'}`}>
                      {(r.type || 'wfh').toUpperCase()}
                    </span>
                  </td>
                  <td><strong>{r.employee_name}</strong></td>
                  <td className="cell-mono">{r.emp_number || '—'}</td>
                  <td>{formatTime(r.sign_in_time)}</td>
                  <td>{formatTime(r.sign_out_time)}</td>
                  <td className="cell-mono">{calcDuration(r)}</td>
                  <td className="notes-cell">{r.notes || '—'}</td>
                  <td>{r.is_manual_sign_out ? <span className="glass-badge glass-badge-warning">Yes</span> : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="glass-btn glass-btn-xs glass-btn-ghost" onClick={() => { setEditSignOut(r); setEditForm({ sign_out_time: r.sign_out_time ? new Date(r.sign_out_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16), notes: r.notes || '' }); }} title="Edit sign-out time">
                        <Icon icon="lucide:pencil"></Icon> Edit Sign-Out
                      </button>
                      <button className="glass-btn glass-btn-xs glass-btn-danger" onClick={() => setConfirm(r)} title="Delete record">
                        <Icon icon="lucide:trash-2"></Icon> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchRecords} />
        </div>
        </>}
      </div>

      {confirm && (
        <ConfirmModal
          title="Delete Record"
          message={`Delete attendance record for "${confirm.employee_name}" on ${confirm.date}?`}
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}

      {editSignOut && (
        <div className="glass-modal-overlay" onClick={() => setEditSignOut(null)}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:pencil"></Icon> Edit Sign-Out Time
              </h3>
              <button className="glass-modal-close" onClick={() => setEditSignOut(null)}><Icon icon="lucide:x" /></button>
            </div>
            <p style={{ marginBottom: 16, color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              {editSignOut.employee_name} — {editSignOut.date}
            </p>
            <div className="glass-form-group">
              <label className="glass-label">Sign Out Time</label>
              <input
                type="datetime-local"
                value={editForm.sign_out_time}
                onChange={(e) => setEditForm({ ...editForm, sign_out_time: e.target.value })}
                className="glass-input"
              />
            </div>
            <div className="glass-form-group">
              <label className="glass-label">Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="glass-textarea"
                rows={3}
              />
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setEditSignOut(null)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleEditSignOut}>
                <Icon icon="lucide:check"></Icon> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

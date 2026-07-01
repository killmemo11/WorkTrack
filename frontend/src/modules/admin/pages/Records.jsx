// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
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
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Attendance Records</h1>
            <p className="subtitle">View and manage all attendance records</p>
          </div>
          <button className="btn btn-outline" onClick={handleExport}>Export Excel</button>
        </div>

        {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

        <div className="filter-bar">
          <div className="filter-group">
            <label>Employee</label>
            <select className="form-control" value={filters.employee_id} onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}>
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>From Date</label>
            <input type="date" className="form-control" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input type="date" className="form-control" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
          </div>
          <div className="filter-actions">
            <button className="btn btn-primary" onClick={() => fetchRecords(1)}>Filter</button>
            <button className="btn btn-outline" onClick={() => { setFilters({ date_from: '', date_to: '', employee_id: '' }); fetchRecords(1); }}>Clear</button>
          </div>
        </div>

        {loading && <div className="loading" />}
        {!loading && <>
        <div className="summary-bar">
          <span className="summary-item">Total Records: <strong>{data.total}</strong></span>
          <span className="summary-item">Showing Page: <strong>{data.page} / {data.totalPages}</strong></span>
        </div>

        <div className="table-wrapper">
          {data.records.length === 0 ? (
            <p className="empty-state">No records found</p>
          ) : (
          <table className="table">
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
                  <td><span className={`badge ${r.type === 'office' ? 'badge-office' : 'badge-wfh'}`}>{(r.type || 'wfh').toUpperCase()}</span></td>
                  <td><strong>{r.employee_name}</strong></td>
                  <td className="cell-mono">{r.emp_number || '—'}</td>
                  <td>{formatTime(r.sign_in_time)}</td>
                  <td>{formatTime(r.sign_out_time)}</td>
                  <td className="cell-mono">{calcDuration(r)}</td>
                  <td className="notes-cell">{r.notes || '—'}</td>
                  <td>{r.is_manual_sign_out ? <span className="badge badge-warning">Yes</span> : '—'}</td>
                  <td>
                    <div className="action-btns" style={{ gap: 4 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => { setEditSignOut(r); setEditForm({ sign_out_time: r.sign_out_time ? new Date(r.sign_out_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16), notes: r.notes || '' }); }} title="Edit sign-out time">
                        Edit Sign-Out
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => setConfirm(r)} title="Delete record">
                        Delete
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
        <div className="modal-overlay" onClick={() => setEditSignOut(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Sign-Out Time</h2>
            <p style={{ marginBottom: 12, color: '#666' }}>
              {editSignOut.employee_name} — {editSignOut.date}
            </p>
            <label>
              Sign Out Time:
              <input
                type="datetime-local"
                value={editForm.sign_out_time}
                onChange={(e) => setEditForm({ ...editForm, sign_out_time: e.target.value })}
                className="form-control"
              />
            </label>
            <label>
              Notes:
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="form-control"
                rows={3}
              />
            </label>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setEditSignOut(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSignOut}>Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

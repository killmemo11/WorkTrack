// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import hrApi from '../../../shared/api/hrApi';

import ConfirmModal from '../../../shared/components/ConfirmModal';
import Pagination from '../../../shared/components/Pagination';
import IDCardModal from '../../../shared/components/IDCardModal';

export default function AdminEmployees() {
  const navigate = useNavigate();
  const [data, setData] = useState({ employees: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [grades, setGrades] = useState([]);
  const [deptTitles, setDeptTitles] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [idCardEmployeeId, setIdCardEmployeeId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState('');
  const [page, setPage] = useState(1);
  const [deptFilter, setDeptFilter] = useState('');

  const fetchEmployees = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 50 });
      if (deptFilter) params.set('department_id', deptFilter);
      const res = await hrApi.get('/employees?' + params.toString());
      setData(res.data);
      setPage(p);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees(1);
    hrApi.get('/departments').then((res) => setDepartments(res.data)).catch((err) => console.error('Failed to load departments:', err));
    hrApi.get('/leave-types').then((res) => setLeaveTypes(res.data.types || res.data)).catch((err) => console.error('Failed to load leave types:', err));
    hrApi.get('/grades').then((res) => setGrades(res.data)).catch((err) => console.error('Failed to load grades:', err));
    hrApi.get('/department-titles').then((res) => setDeptTitles(res.data)).catch((err) => console.error('Failed to load titles:', err));
  }, [deptFilter]);

  const updateRole = async (id, role) => {
    try {
      await hrApi.put(`/employees/${id}`, { role });
      fetchEmployees(page);
    } catch (err) {
      console.error(err);
      setMessage('Failed to update role');
    }
  };

  const toggleActive = async (id, is_active) => {
    try {
      const val = is_active ? 0 : 1;
      await hrApi.put(`/employees/${id}`, { is_active: val });
      fetchEmployees(page);
    } catch (err) {
      console.error(err);
      setMessage('Failed to update status');
    }
  };

  const toggleCanWfh = async (id, can_wfh) => {
    try {
      const val = can_wfh ? 0 : 1;
      await hrApi.put(`/employees/${id}`, { can_wfh: val });
      fetchEmployees(page);
    } catch (err) {
      console.error(err);
      setMessage('Failed to update WFH status');
    }
  };

  const handleDelete = async (emp) => {
    try {
      await hrApi.delete(`/employees/${emp.id}`);
      fetchEmployees(page);
      setMessage(`Employee "${emp.name}" and all records deleted`);
    } catch (err) {
      console.error(err);
      setMessage('Failed to delete employee');
    }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const openEdit = async (emp) => {
    try {
      const res = await hrApi.get(`/employees/${emp.id}`);
      const full = res.data;
      const form = {
        name: full.name || '', email: full.email || '', username: full.username || '',
        employee_id: full.employee_id || '', department_id: full.department_id || '', grade_id: full.grade_id || '', title_id: full.title_id || '',
        role: full.role || 'employee', can_wfh: full.can_wfh ?? 1,
        employment_status: full.employment_status || 'active', resignation_date: full.resignation_date || '',
        balances: {},
      };
      if (full.balances) {
        for (const key of Object.keys(full.balances)) {
          form.balances[key] = full.balances[key] || 0;
        }
      } else {
        form.balances = {
          annual: full.annual_balance || 0,
          sick: full.sick_balance || 0,
          casual: full.casual_balance || 0,
        };
      }
      setEditForm(form);
    } catch {
      setEditForm({
        name: emp.name || '', email: emp.email || '', username: emp.username || '',
        employee_id: emp.employee_id || '', department_id: emp.department_id || '', grade_id: emp.grade_id || '', title_id: emp.title_id || '',
        can_wfh: emp.can_wfh ?? 1,
        employment_status: emp.employment_status || 'active', resignation_date: emp.resignation_date || '',
        balances: { annual: 0, sick: 0, casual: 0 },
      });
    }
    setEditing(emp);
  };

  const handleEdit = async () => {
    try {
      const res = await hrApi.put(`/employees/${editing.id}`, editForm);
      setData((prev) => ({ ...prev, employees: prev.employees.map((e) => (e.id === editing.id ? { ...e, ...res.data } : e)) }));
      await hrApi.put(`/employees/${editing.id}/balance`, { balances: editForm.balances });
      setMessage('Employee updated');
      setEditing(null);
    } catch {
      setMessage('Failed to update employee');
    }
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <>
      <div className="page">
        <div className="glass-page-header">
          <div>
            <h1>Manage Employees</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{data.total} employee{data.total !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          <div className="glass-form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Department</label>
            <select className="glass-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            {deptFilter && (
              <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setDeptFilter('')}>Clear</button>
            )}
          </div>
        </div>

        <div className="glass-summary-bar">
          <span style={{ color: 'var(--text-dim)' }}>Total Employees: <strong>{data.total}</strong></span>
          <span style={{ color: 'var(--text-dim)' }}>Showing Page: <strong>{data.page} / {data.totalPages}</strong></span>
        </div>

        {loading && <div className="glass-loading"><div className="spinner"/><span>Loading...</span></div>}
        {!loading && (
        <div className="glass-table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Emp ID</th>
                <th>Dept</th>
                <th>Grade</th>
                <th>Title</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Status</th>
                <th>Employment</th>
                <th>Can WFH</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data.employees || []).map((emp) => (
                <tr key={emp.id} className={!emp.is_active ? 'row-inactive' : ''}>
                  <td className="cell-mono">{emp.id}</td>
                  <td><strong>{emp.name}</strong>
                    {emp.avatar_path && <img src={`/${emp.avatar_path}`} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', marginLeft: 6, verticalAlign: 'middle' }} />}
                  </td>
                  <td className="cell-mono">{emp.username || '—'}</td>
                  <td className="cell-mono" style={{fontSize:'0.8rem'}}>{emp.email}</td>
                  <td className="cell-mono">{emp.employee_id || '—'}</td>
                  <td>{emp.department_name || emp.department || <span style={{color:'var(--text-faint)'}}>—</span>}</td>
                  <td>{emp.grade_name ? <span className="glass-badge glass-badge-info">Lv.{emp.grade_level} {emp.grade_name}</span> : <span style={{color:'var(--text-faint)'}}>—</span>}</td>
                  <td>{emp.position_title || <span style={{color:'var(--text-faint)'}}>—</span>}</td>
                  <td>
                    <span className={`glass-badge ${emp.role === 'admin' ? 'glass-badge-primary' : emp.role === 'manager' ? 'glass-badge-success' : emp.role === 'ceo' ? 'glass-badge-info' : 'glass-badge-default'}`}>
                      {emp.role === 'ceo' ? 'C-Level' : emp.role}
                    </span>
                  </td>
                  <td>
                    <span className={`glass-badge ${emp.is_verified ? 'glass-badge-success' : 'glass-badge-default'}`}>
                      {emp.is_verified ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>
                    <span className={`glass-badge ${emp.is_active ? 'glass-badge-success' : 'glass-badge-default'}`}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => toggleActive(emp.id, emp.is_active)} style={{ marginLeft: 4 }} title="Toggle active">
                      <span className="iconify" data-icon={emp.is_active ? 'lucide:circle-dot' : 'lucide:circle'} />
                    </button>
                  </td>
                  <td>
                    <span className={`glass-badge ${emp.employment_status === 'active' || !emp.employment_status ? 'glass-badge-success' : 'glass-badge-default'}`}>
                      {emp.employment_status === 'resigned' ? 'Resigned' : 'Active'}
                    </span>
                    {emp.employment_status === 'resigned' && emp.resignation_date && (
                      <span className="cell-mono" style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-faint)' }}>
                        since {new Date(emp.resignation_date).toLocaleDateString()}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`glass-badge ${emp.can_wfh ? 'glass-badge-success' : 'glass-badge-default'}`}>
                      {emp.can_wfh ? 'Yes' : 'No'}
                    </span>
                    <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => toggleCanWfh(emp.id, emp.can_wfh)} style={{ marginLeft: 4 }} title="Toggle WFH">
                      <span className="iconify" data-icon={emp.can_wfh ? 'lucide:circle-dot' : 'lucide:circle'} />
                    </button>
                  </td>
                  <td className="cell-mono">{emp.created_at ? new Date(emp.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => navigate(`/hr/employees/${emp.id}/profile`)}><span className="iconify" data-icon="lucide:user"/> Profile</button>
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => openEdit(emp)}><span className="iconify" data-icon="lucide:pencil"/> Edit</button>
                      <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setIdCardEmployeeId(emp.id)}><span className="iconify" data-icon="lucide:id-card"/> ID Card</button>
                      {emp.role !== 'admin' && (
                        <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => updateRole(emp.id, 'admin')}><span className="iconify" data-icon="lucide:shield-up"/> Promote</button>
                      )}
                      {emp.role === 'admin' && (
                        <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => updateRole(emp.id, 'employee')}><span className="iconify" data-icon="lucide:shield-down"/> Demote</button>
                      )}
                      <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => setConfirm(emp)}><span className="iconify" data-icon="lucide:trash-2"/> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data.employees || []).length === 0 && <div className="glass-empty"><span className="iconify" data-icon="lucide:inbox" style={{fontSize:40,opacity:0.3}}/><h3>No employees found</h3><p>No employees match your current filters.</p></div>}
          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={fetchEmployees} />
        </div>
        )}
      </div>

      {editing && (
        <div className="glass-modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal glass-modal" onClick={(e) => e.stopPropagation()} style={{maxWidth:520}}>
            <button className="glass-modal-close" onClick={() => setEditing(null)}><span className="iconify" data-icon="lucide:x"/></button>
            <h2>Edit Employee</h2>
            <div className="modal-grid">
              <label>Name<input type="text" className="glass-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></label>
              <label>Email<input type="email" className="glass-input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></label>
              <label>Username<input type="text" className="glass-input" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} /></label>
              <label>Employee ID<input type="number" className="glass-input" value={editForm.employee_id} onChange={(e) => setEditForm({ ...editForm, employee_id: e.target.value })} /></label>
              <label className="settings-full">Department
                <select className="glass-select" value={editForm.department_id} onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}>
                  <option value="">None</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label className="settings-full">Grade
                <select className="glass-select" value={editForm.grade_id} onChange={(e) => setEditForm({ ...editForm, grade_id: e.target.value })}>
                  <option value="">None</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>Lv.{g.grade_level} — {g.name}</option>
                  ))}
                </select>
              </label>
              <label className="settings-full">Title
                <select className="glass-select" value={editForm.title_id} onChange={(e) => setEditForm({ ...editForm, title_id: e.target.value })}>
                  <option value="">None</option>
                  {deptTitles
                    .filter((t) => !editForm.department_id || String(t.department_id) === String(editForm.department_id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                </select>
              </label>
              <label className="settings-full">Role
                <select className="glass-select" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="ceo">C-Level</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }} className="settings-full">
                <input type="checkbox" checked={!!editForm.can_wfh} onChange={(e) => setEditForm({ ...editForm, can_wfh: e.target.checked ? 1 : 0 })} />
                <span>Can work from home (WFH)</span>
              </label>
              <label className="settings-full">Employment Status
                <select className="glass-select" value={editForm.employment_status} onChange={(e) => setEditForm({ ...editForm, employment_status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="resigned">Resigned</option>
                </select>
              </label>
              {editForm.employment_status === 'resigned' && (
                <label className="settings-full">Resignation Date
                  <input type="date" className="glass-input" value={editForm.resignation_date} onChange={(e) => setEditForm({ ...editForm, resignation_date: e.target.value })} />
                </label>
              )}
              <div className="settings-section-title" style={{ fontSize:'0.85rem', borderBottom:'none', margin: '8px 0', gridColumn: '1 / -1' }}>Leave Balances</div>
              {leaveTypes.filter((lt) => lt.default_balance !== null).length > 0
                ? leaveTypes.filter((lt) => lt.default_balance !== null).map((lt) => (
                    <label key={lt.name}>{lt.label || lt.name} ({lt.name})
                      <input type="number" className="glass-input" value={editForm.balances?.[lt.name] ?? 0}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          balances: { ...editForm.balances, [lt.name]: e.target.value }
                        })}
                        step="0.5" min="0" style={{width:'100%'}} />
                    </label>
                  ))
                : ['annual', 'sick', 'casual'].map((t) => (
                    <label key={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Days
                      <input type="number" className="glass-input" value={editForm.balances?.[t] ?? 0}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          balances: { ...editForm.balances, [t]: e.target.value }
                        })}
                        step="0.5" min="0" style={{width:'100%'}} />
                    </label>
                  ))
              }
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="glass-btn glass-btn-primary" onClick={handleEdit}><span className="iconify" data-icon="lucide:save"/> Save</button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmModal
          title="Delete Employee"
          message={`Delete "${confirm.name}" and all their attendance records? This cannot be undone.`}
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {idCardEmployeeId && (
        <IDCardModal employeeId={idCardEmployeeId} onClose={() => setIdCardEmployeeId(null)} />
      )}
    </>
  );
}

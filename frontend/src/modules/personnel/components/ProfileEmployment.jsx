// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileEmployment({ profile, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [grades, setGrades] = useState([]);
  const [form, setForm] = useState(profileToForm(profile));
  const [renewMsg, setRenewMsg] = useState('');
  const [gradeWarning, setGradeWarning] = useState('');

  function fmtDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  useEffect(() => {
    if (editing) setForm(profileToForm(profile));
  }, [editing, profile]);

  function profileToForm(p) {
    return {
      title_id: p.title_id || '',
      department_id: p.department_id || '',
      grade_id: p.grade_id || '',
      hire_date: fmtDate(p.profile?.hire_date),
      contract_type: p.profile?.contract_type || 'permanent',
      contract_end_date: fmtDate(p.profile?.contract_end_date),
      work_type: p.profile?.work_type || 'full_time',
      supervisor_id: p.profile?.supervisor_id || '',
      bank_name: p.profile?.bank_name || '',
      bank_account: p.profile?.bank_account || '',
      emergency_contact_name: p.profile?.emergency_contact_name || '',
      emergency_contact_phone: p.profile?.emergency_contact_phone || '',
      emergency_contact_relation: p.profile?.emergency_contact_relation || '',
    };
  }

  useEffect(() => {
    hrApi.get('/department-titles').then(r => setPositions(r.data)).catch(() => {});
    hrApi.get('/departments').then(r => setDepartments(r.data)).catch(() => {});
    hrApi.get('/grades').then(r => setGrades(r.data)).catch(() => {});
    hrApi.get('/employees').then(r => setEmployees(r.data?.employees || r.data || [])).catch(() => {});
  }, []);

  async function handleSave() {
    await hrApi.put(`/employees/${profile.id}/profile`, form);
    setEditing(false);
    onUpdate();
  }

  async function handleRenew() {
    if (!confirm('Renew contract for 1 more year?')) return;
    try {
      const res = await hrApi.post(`/employees/${profile.id}/renew-contract`);
      onUpdate();
    } catch (err) {
      alert('Failed to renew: ' + (err.response?.data?.error || err.message));
    }
  }

  const view = (
    <div className="card">
      <div className="card-header"><h3>Employment Details</h3><button className="btn btn-sm btn-outline" onClick={() => { setForm(profileToForm(profile)); setEditing(true); }}>Edit</button></div>
      <div className="card-body">
        <table className="table-details">
          <tbody>
            <tr><td>Position</td><td>{profile.position_title || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Department</td><td>{profile.department_name || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Grade</td><td>{profile.grade_name ? `${profile.grade_name} (Lv.${profile.grade_level})` : <span className="text-muted">—</span>}</td></tr>
            <tr><td>Hire Date</td><td>{fmtDate(profile.profile?.hire_date) || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Contract Type</td><td>{profile.profile?.contract_type === 'annual' ? 'Annual' : profile.profile?.contract_type || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Contract End</td><td>{fmtDate(profile.profile?.contract_end_date) || <span className="text-muted">—</span>}
              {profile.profile?.contract_end_date && profile.profile?.contract_type === 'annual' && (
                <button className="btn btn-xs btn-outline" style={{ marginLeft: 8 }} onClick={handleRenew}>Renew</button>
              )}
            </td></tr>
            <tr><td>Work Type</td><td>{profile.profile?.work_type || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Supervisor</td><td>{profile.profile?.supervisor_id ? `#${profile.profile.supervisor_id}` : <span className="text-muted">—</span>}</td></tr>
            <tr><td>Bank Name</td><td>{profile.profile?.bank_name || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Bank Account</td><td>{profile.profile?.bank_account || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Emergency Contact</td><td>{profile.profile?.emergency_contact_name || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Emergency Phone</td><td>{profile.profile?.emergency_contact_phone || <span className="text-muted">—</span>}</td></tr>
            <tr><td>Emergency Relation</td><td>{profile.profile?.emergency_contact_relation || <span className="text-muted">—</span>}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!editing) return view;

  const filteredTitles = form.department_id
    ? positions.filter(t => String(t.department_id) === String(form.department_id))
    : [];

  const fields = [
    { key: 'title_id', label: 'Position (Title)', type: 'select', options: filteredTitles, valueKey: 'id', displayKey: 'title', emptyLabel: '— Select Department First —' },
    { key: 'department_id', label: 'Department', type: 'select', options: departments, valueKey: 'id', displayKey: 'name', emptyLabel: '— None —' },
    { key: 'grade_id', label: 'Grade', type: 'select', options: grades, valueKey: 'id', displayKey: r => `Grade ${r.grade_level} — ${r.name}`, emptyLabel: '— Auto from Title —' },
    { key: 'gradeWarning', label: '', type: 'warning' },
    { key: 'supervisor_id', label: 'Supervisor', type: 'select', options: employees.filter(e => e.id !== profile.id), valueKey: 'id', displayKey: 'name', emptyLabel: '— None —' },
    { key: 'hire_date', label: 'Hire Date', type: 'date' },
    { key: 'contract_type', label: 'Contract Type', type: 'select', options: [['permanent','Permanent'],['annual','Annual'],['probation','Probation'],['contractor','Contractor']], inline: true },
    { key: 'contract_end_date', label: 'Contract End Date', type: 'date' },
    { key: 'work_type', label: 'Work Type', type: 'select', options: [['full_time','Full Time'],['part_time','Part Time'],['remote','Remote']], inline: true },
    { key: 'bank_name', label: 'Bank Name' },
    { key: 'bank_account', label: 'Bank Account' },
    { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
    { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
    { key: 'emergency_contact_relation', label: 'Emergency Contact Relation' },
  ];

  return (
    <div className="card">
      <div className="card-header"><h3>Edit Employment Details</h3></div>
      <div className="card-body">
        <div className="form-row">
          {fields.map(f => (
            <label key={f.key}>
              {f.label}
              {f.type === 'warning' ? (
                gradeWarning && <div style={{ gridColumn: '1 / -1', fontSize: 13, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px' }}>{gradeWarning}</div>
              ) : f.type === 'select' ? (
                <select className="form-control" value={form[f.key]} onChange={e => {
                  const val = e.target.value;
                  const extra = {};
                  if (f.key === 'department_id') { extra.title_id = ''; setGradeWarning(''); }
                  if (f.key === 'title_id') {
                    const t = positions.find(x => String(x.id) === val);
                    if (t) extra.grade_id = t.grade_id || '';
                    setGradeWarning('');
                  }
                  if (f.key === 'grade_id') {
                    const t = positions.find(x => String(x.id) === form.title_id);
                    if (t && val) {
                      const titleGrade = grades.find(g => String(g.id) === String(t.grade_id));
                      const selectedGrade = grades.find(g => String(g.id) === String(val));
                      if (titleGrade && selectedGrade && selectedGrade.grade_level > titleGrade.grade_level) {
                        setGradeWarning(`Selected grade (${selectedGrade.name}, Lv.${selectedGrade.grade_level}) is higher than the title's grade (${titleGrade.name}, Lv.${titleGrade.grade_level})`);
                      } else {
                        setGradeWarning('');
                      }
                    } else {
                      setGradeWarning('');
                    }
                  }
                  setForm({ ...form, [f.key]: val, ...extra });
                }}>
                  <option value="">{f.emptyLabel || '—'}</option>
                  {f.options.map(o => {
                    const val = f.inline ? o[0] : o[f.valueKey];
                    const display = f.inline ? o[1] : typeof f.displayKey === 'function' ? f.displayKey(o) : o[f.displayKey];
                    return <option key={val} value={val}>{display}</option>;
                  })}
                </select>
              ) : (
                <input className="form-control" type={f.type} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </label>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

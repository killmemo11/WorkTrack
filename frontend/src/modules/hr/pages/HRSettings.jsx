// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';
import { formatDate } from '../../../shared/utils/date';
import HRLayout from '../../../shared/components/Layout/HRLayout';
import ConfirmModal from '../../../shared/components/ConfirmModal';

export default function HRSettings() {
  const [activeTab, setActiveTab] = useState('master-lists');

  const [settings, setSettings] = useState({
    work_week_start: 'Sunday', work_week_end: 'Thursday',
    period_start_day: '15', period_end_day: '16',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [departments, setDepartments] = useState([]);
  const [deptForm, setDeptForm] = useState({ name: '', manager_email: '', c_level_email: '', parent_department_id: '' });
  const [editingDept, setEditingDept] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [holidays, setHolidays] = useState([]);
  const [holidayForm, setHolidayForm] = useState({ date: '', name: '' });
  const [holidayDeleteConfirm, setHolidayDeleteConfirm] = useState(null);

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [lastReset, setLastReset] = useState(null);
  const [editingLt, setEditingLt] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  const [grades, setGrades] = useState([]);
  const [gradeForm, setGradeForm] = useState({ grade_level: '', name: '', description: '', min_salary: '', max_salary: '' });
  const [editingGrade, setEditingGrade] = useState(null);
  const [gradeDeleteConfirm, setGradeDeleteConfirm] = useState(null);

  const [mlSkills, setMlSkills] = useState([]);
  const [mlCerts, setMlCerts] = useState([]);
  const [mlActiveSubtab, setMlActiveSubtab] = useState('skills');
  const [mlNewName, setMlNewName] = useState('');
  const [mlEditing, setMlEditing] = useState(null);
  const [mlEditName, setMlEditName] = useState('');
  const [mlConfirm, setMlConfirm] = useState(null);


  const [ceoEmail, setCeoEmail] = useState('');

  const [company, setCompany] = useState({
    company_name: '', company_address: '', company_representative: '', company_representative_title: '',
    company_phone: '', company_fax: '', company_commercial_register: '', company_tax_card: '', company_location_url: '',
  });
  const [companySaving, setCompanySaving] = useState(false);

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    hrApi.get('/settings/work-week').then((res) => {
      setSettings((prev) => ({ ...prev, ...res.data }));
      setCeoEmail(res.data.ceo_email || '');
    }).catch(() => {});
    hrApi.get('/settings/company').then((res) => {
      setCompany((prev) => ({ ...prev, ...res.data }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'departments') fetchDepartments();
    if (activeTab === 'holidays') fetchHolidays();
    if (activeTab === 'leave-types') fetchLeaveTypes();
    if (activeTab === 'grades') fetchGrades();
    if (activeTab === 'master-lists') { fetchMlSkills(); fetchMlCerts(); }
  }, [activeTab]);

  const fetchDepartments = async () => {
    try {
      const res = await hrApi.get('/departments');
      setDepartments(res.data);
    } catch (err) { console.error('Failed to load departments:', err); }
  };

  const handleAddDept = async () => {
    if (!deptForm.name.trim()) return;
    try {
      const res = await hrApi.post('/departments', deptForm);
      setDepartments(prev => [...prev, res.data]);
      setDeptForm({ name: '', manager_email: '', c_level_email: '', parent_department_id: '' });
      setMessage('Department added');
    } catch { setMessage('Failed to add department'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEditDept = async () => {
    if (!editingDept) return;
    try {
      const res = await hrApi.put(`/departments/${editingDept.id}`, editingDept);
      setDepartments(prev => prev.map(d => d.id === editingDept.id ? res.data : d));
      setMessage('Department updated');
      setEditingDept(null);
    } catch { setMessage('Failed to update department'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteDept = async (dept) => {
    try {
      const res = await hrApi.delete(`/departments/${dept.id}`);
      setDepartments(prev => prev.filter(d => d.id !== res.data.id));
      setMessage(`Department "${dept.name}" deleted`);
    } catch { setMessage('Failed to delete department'); }
    setDeleteConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchHolidays = async () => {
    try {
      const res = await hrApi.get('/holidays');
      setHolidays(res.data);
    } catch (err) { console.error('Failed to load holidays:', err); }
  };

  const handleAddHoliday = async () => {
    if (!holidayForm.date) return;
    try {
      const res = await hrApi.post('/holidays', holidayForm);
      setHolidays(prev => [...prev, res.data]);
      setHolidayForm({ date: '', name: '' });
      setMessage('Holiday added');
    } catch (err) {
      setMessage('Failed to add holiday: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteHoliday = async (holiday) => {
    try {
      const res = await hrApi.delete(`/holidays/${holiday.id}`);
      setHolidays(prev => prev.filter(h => h.id !== res.data.id));
      setMessage(`Holiday "${holiday.name || holiday.date}" deleted`);
    } catch { setMessage('Failed to delete holiday'); }
    setHolidayDeleteConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchLeaveTypes = async () => {
    try {
      const res = await hrApi.get('/leave-types');
      setLeaveTypes(res.data.types || []);
      setLastReset(res.data.last_reset || null);
    } catch (err) { console.error('Failed to load leave types:', err); }
  };

  const handleSaveLeaveType = async (lt) => {
    try {
      const res = await hrApi.put(`/leave-types/${lt.id}`, {
        label: lt.label, default_balance: lt.default_balance, is_active: lt.is_active,
      });
      setLeaveTypes(prev => prev.map(t => t.id === lt.id ? res.data : t));
      setMessage('Leave type updated');
      setEditingLt(null);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleResetBalances = async () => {
    try {
      await hrApi.post('/leave-balances/reset');
      setMessage('All balances reset to defaults');
      setLastReset(new Date().toISOString());
    } catch { setMessage('Failed to reset balances'); }
    setResetConfirm(false);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchGrades = async () => {
    try {
      const res = await hrApi.get('/grades');
      setGrades(res.data);
    } catch (err) { console.error('Failed to load grades:', err); }
  };

  const handleAddGrade = async () => {
    if (!gradeForm.grade_level || !gradeForm.name) return;
    try {
      const res = await hrApi.post('/grades', {
        grade_level: parseInt(gradeForm.grade_level),
        name: gradeForm.name,
        description: gradeForm.description || null,
        min_salary: gradeForm.min_salary ? parseFloat(gradeForm.min_salary) : null,
        max_salary: gradeForm.max_salary ? parseFloat(gradeForm.max_salary) : null,
      });
      setGrades(prev => [...prev, res.data]);
      setGradeForm({ grade_level: '', name: '', description: '', min_salary: '', max_salary: '' });
      setMessage('Grade added');
    } catch { setMessage('Failed to add grade'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleEditGrade = async () => {
    if (!editingGrade) return;
    try {
      const res = await hrApi.put(`/grades/${editingGrade.id}`, {
        grade_level: parseInt(editingGrade.grade_level),
        name: editingGrade.name,
        description: editingGrade.description || null,
        min_salary: editingGrade.min_salary ? parseFloat(editingGrade.min_salary) : null,
        max_salary: editingGrade.max_salary ? parseFloat(editingGrade.max_salary) : null,
      });
      setGrades(prev => prev.map(g => g.id === editingGrade.id ? res.data : g));
      setMessage('Grade updated');
      setEditingGrade(null);
    } catch { setMessage('Failed to update grade'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteGrade = async (grade) => {
    try {
      const res = await hrApi.delete(`/grades/${grade.id}`);
      setGrades(prev => prev.filter(g => g.id !== res.data.id));
      setMessage(`Grade "${grade.name}" deleted`);
    } catch { setMessage('Failed to delete grade'); }
    setGradeDeleteConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const fetchMlSkills = async () => {
    try { const res = await hrApi.get('/master-skills'); setMlSkills(res.data); }
    catch { setMessage('Failed to load skills'); }
  };
  const fetchMlCerts = async () => {
    try { const res = await hrApi.get('/master-certifications'); setMlCerts(res.data); }
    catch { setMessage('Failed to load certifications'); }
  };

  const handleMlAdd = async () => {
    const name = mlNewName.trim();
    if (!name) return;
    try {
      if (mlActiveSubtab === 'skills') { await hrApi.post('/master-skills', { name }); await fetchMlSkills(); }
      else { await hrApi.post('/master-certifications', { name }); await fetchMlCerts(); }
      setMlNewName(''); setMessage(`"${name}" added`);
    } catch (err) { setMessage(err.response?.data?.error || 'Failed to add'); }
    setTimeout(() => setMessage(''), 3000);
  };
  const handleMlUpdate = async () => {
    const name = mlEditName.trim();
    if (!name || !mlEditing) return;
    try {
      if (mlActiveSubtab === 'skills') { await hrApi.put(`/master-skills/${mlEditing.id}`, { name }); await fetchMlSkills(); }
      else { await hrApi.put(`/master-certifications/${mlEditing.id}`, { name }); await fetchMlCerts(); }
      setMlEditing(null); setMlEditName(''); setMessage(`Updated to "${name}"`);
    } catch (err) { setMessage(err.response?.data?.error || 'Failed to update'); }
    setTimeout(() => setMessage(''), 3000);
  };
  const handleMlDelete = async (id) => {
    try {
      if (mlActiveSubtab === 'skills') { await hrApi.delete(`/master-skills/${id}`); await fetchMlSkills(); }
      else { await hrApi.delete(`/master-certifications/${id}`); await fetchMlCerts(); }
      setMessage('Deleted');
    } catch { setMessage('Failed to delete'); }
    setMlConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };


  const handleSaveWorkWeek = async () => {
    setSaving(true);
    try {
      await hrApi.put('/settings/work-week', {
        work_week_start: settings.work_week_start,
        work_week_end: settings.work_week_end,
        period_start_day: settings.period_start_day,
        period_end_day: settings.period_end_day,
      });
      setMessage('Work week settings saved');
    } catch { setMessage('Failed to save'); }
    setSaving(false);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <HRLayout>
      <div className="page">
        <div className="glass-page-header">
          <div>
            <h1>HR Settings</h1>
            <p className="subtitle">Configure departments, holidays, and leave types</p>
          </div>
        </div>

        {message && <div className={`glass-alert ${message.toLowerCase().includes('failed') ? 'glass-alert-danger' : 'glass-alert-success'}`} style={{whiteSpace:'pre-line'}}>{message}</div>}

        <div className="glass-tabs" style={{ marginBottom: 24 }}>
          {[
            { key: 'company', label: 'Company', icon: 'lucide:building-2' },
            { key: 'departments', label: 'Departments', icon: 'lucide:git-branch' },
            { key: 'holidays', label: 'Holidays & Work Week', icon: 'lucide:calendar-days' },
            { key: 'leave-types', label: 'Leave Types', icon: 'lucide:calendar-check' },
            { key: 'grades', label: 'Grades', icon: 'lucide:layers' },
            { key: 'master-lists', label: 'Master Lists', icon: 'lucide:list' },
          ].map(tab => (
            <button key={tab.key} className={`glass-tab ${activeTab === tab.key ? 'glass-tab-active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              <Icon icon={tab.icon} style={{ marginRight: 6, fontSize: 14 }} />{tab.label}
            </button>
          ))}
        </div>

        <div className="settings-form">
          {activeTab === 'company' && (
            <>
              <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:building-2" style={{ marginRight: 8 }} />Company Information</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    This information is used when generating contracts and official documents.
                  </p>
                  <div className="glass-detail-grid">
                    <div className="glass-form-group">
                      <label className="glass-label">Company Name</label>
                      <input className="glass-input" value={company.company_name}
                        onChange={e => setCompany({...company, company_name: e.target.value})} placeholder="Company name" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Phone</label>
                      <input className="glass-input" value={company.company_phone}
                        onChange={e => setCompany({...company, company_phone: e.target.value})} placeholder="+20 2 1234 5678" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Fax</label>
                      <input className="glass-input" value={company.company_fax}
                        onChange={e => setCompany({...company, company_fax: e.target.value})} placeholder="+20 2 1234 5679" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Commercial Register</label>
                      <input className="glass-input" value={company.company_commercial_register}
                        onChange={e => setCompany({...company, company_commercial_register: e.target.value})} placeholder="رقم السجل التجاري" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Tax Card</label>
                      <input className="glass-input" value={company.company_tax_card}
                        onChange={e => setCompany({...company, company_tax_card: e.target.value})} placeholder="رقم البطاقة الضريبية" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Company Representative</label>
                      <input className="glass-input" value={company.company_representative}
                        onChange={e => setCompany({...company, company_representative: e.target.value})} placeholder="اسم الممثل القانوني" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Representative Title</label>
                      <input className="glass-input" value={company.company_representative_title}
                        onChange={e => setCompany({...company, company_representative_title: e.target.value})} placeholder="رئيس مجلس الإدارة / المدير العام" />
                    </div>
                  </div>
                  <div className="glass-form-group" style={{ marginTop: 16 }}>
                    <label className="glass-label">Company Address</label>
                    <textarea className="glass-textarea" rows={3} value={company.company_address}
                      onChange={e => setCompany({...company, company_address: e.target.value})} placeholder="عنوان الشركة" />
                  </div>
                  <div className="glass-form-group" style={{ marginTop: 16 }}>
                    <label className="glass-label">Location URL (Google Maps link)</label>
                    <input className="glass-input" value={company.company_location_url}
                      onChange={e => setCompany({...company, company_location_url: e.target.value})} placeholder="https://maps.google.com/?q=..." />
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <button className="glass-btn glass-btn-primary" disabled={companySaving} onClick={async () => {
                      setCompanySaving(true);
                      try {
                        await hrApi.put('/settings/company', company);
                        setMessage('Company settings saved');
                      } catch { setMessage('Failed to save company settings'); }
                      setCompanySaving(false);
                      setTimeout(() => setMessage(''), 3000);
                    }}>{companySaving ? 'Saving...' : 'Save Company Info'}</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'departments' && (
            <>
              <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:crown" style={{ marginRight: 8 }} />Company CEO</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    The CEO oversees all departments and can approve any manager&apos;s leave requests across the entire company.
                  </p>
                  <div style={{ maxWidth: 400, marginBottom: 24 }}>
                    <div className="glass-form-group">
                      <label className="glass-label">CEO Email</label>
                      <input type="email" className="glass-input" value={ceoEmail}
                        onChange={(e) => setCeoEmail(e.target.value)} placeholder="ceo@company.com" />
                    </div>
                    <button className="glass-btn glass-btn-primary" onClick={async () => {
                      try {
                        await hrApi.put('/settings/work-week', { ceo_email: ceoEmail });
                        setMessage('CEO email saved');
                      } catch { setMessage('Failed to save CEO email'); }
                      setTimeout(() => setMessage(''), 3000);
                    }} style={{ marginTop: 8 }}>Save CEO</button>
                  </div>

                  <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--border-glass)' }} />

                  <div className="glass-page-header" style={{ padding: 0, marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}><Icon icon="lucide:git-branch" style={{ marginRight: 8 }} />Manage Departments</h3>
                  </div>

                  <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={async () => {
                      try {
                        const res = await hrApi.get('/departments/template', { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'departments_template.xlsx';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      } catch { setMessage('Failed to download template'); setTimeout(() => setMessage(''), 3000); }
                    }}><Icon icon="lucide:download" style={{ marginRight: 6 }} />Download Template</button>
                    <button className="glass-btn glass-btn-primary glass-btn-sm" style={{ position: 'relative', overflow: 'hidden' }}
                      onClick={() => document.getElementById('excel-import-input').click()}>
                      <Icon icon="lucide:upload" style={{ marginRight: 6 }} />Import from Excel
                      <input id="excel-import-input" type="file" accept=".xlsx,.xls" style={{ position: 'absolute', left: '-9999px' }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const token = localStorage.getItem('hrToken');
                            const res = await fetch('/api/hr/departments/import', {
                              method: 'POST',
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                              body: formData,
                            });
                            const data = await res.json();
                            if (!res.ok) throw { response: { data } };
                            let msg = data.message;
                            if (data.errors && data.errors.length > 0) {
                              msg += '\n' + data.errors.join('\n');
                            }
                            setMessage(msg);
                            fetchDepartments();
                          } catch (err) {
                            setMessage(err.response?.data?.error || 'Import failed');
                          }
                          e.target.value = '';
                          setTimeout(() => setMessage(''), 15000);
                        }} />
                    </button>
                  </div>

                  <div className="glass-table-wrapper" style={{ marginBottom: 24 }}>
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th style={{width: 60}}>ID</th>
                          <th>Name</th>
                          <th>Parent Dept</th>
                          <th>Max HC</th>
                          <th>Manager Email</th>
                          <th>C-Level Email</th>
                          <th style={{width: 160}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {departments.length === 0 && (
                          <tr><td colSpan={7}><div className="glass-empty" style={{ padding: 20 }}>No departments yet. Add one below.</div></td></tr>
                        )}
                        {departments.map((dept) => (
                          <tr key={dept.id}>
                            {editingDept?.id === dept.id ? (
                              <>
                                <td className="cell-mono">{dept.id}</td>
                                <td>
                                  <input type="text" className="glass-input" style={{width:'100%'}}
                                    value={editingDept.name}
                                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })} />
                                </td>
                                <td>
                                  <select className="glass-select" style={{width:'100%'}}
                                    value={editingDept.parent_department_id || ''}
                                    onChange={(e) => setEditingDept({ ...editingDept, parent_department_id: e.target.value })}>
                                    <option value="">— None —</option>
                                    {departments.filter(d => d.id !== dept.id).map(d => (
                                      <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input type="email" className="glass-input" style={{width:'100%'}}
                                    value={editingDept.manager_email}
                                    onChange={(e) => setEditingDept({ ...editingDept, manager_email: e.target.value })} />
                                </td>
                                <td>
                                  <input type="email" className="glass-input" style={{width:'100%'}}
                                    value={editingDept.c_level_email || ''}
                                    onChange={(e) => setEditingDept({ ...editingDept, c_level_email: e.target.value })} />
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={handleEditDept}>Save</button>
                                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setEditingDept(null)}>Cancel</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="cell-mono">{dept.id}</td>
                                <td><strong>{dept.name}</strong></td>
                                <td style={{fontSize:'0.85rem', color:'var(--text-dim)'}}>
                                  {(() => {
                                    const parent = departments.find(d => d.id === dept.parent_department_id);
                                    return parent ? parent.name : <span style={{color:'var(--text-dim)'}}>—</span>;
                                  })()}
                                </td>
                                <td className="cell-mono">
                                  {dept.max_headcount > 0 ? `${dept.max_headcount} (auto)` : <span style={{color:'var(--text-dim)'}}>∞</span>}
                                </td>
                                <td>{dept.manager_email || <span style={{color:'var(--text-dim)'}}>—</span>}</td>
                                <td>{dept.c_level_email || <span style={{color:'var(--text-dim)'}}>—</span>}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setEditingDept({ ...dept, c_level_email: dept.c_level_email || '', parent_department_id: dept.parent_department_id || '' })}>Edit</button>
                                    <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => setDeleteConfirm(dept)}>Delete</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="glass-page-header" style={{ padding: 0, marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Add New Department</h3>
                  </div>
                  <div className="glass-detail-grid">
                    <div className="glass-form-group">
                      <label className="glass-label">Department Name</label>
                      <input type="text" className="glass-input"
                        value={deptForm.name}
                        onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                        placeholder="e.g. Marketing" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Parent Department</label>
                      <select className="glass-select"
                        value={deptForm.parent_department_id}
                        onChange={(e) => setDeptForm({ ...deptForm, parent_department_id: e.target.value })}>
                        <option value="">— None (top-level) —</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Manager Email</label>
                      <input type="email" className="glass-input"
                        value={deptForm.manager_email}
                        onChange={(e) => setDeptForm({ ...deptForm, manager_email: e.target.value })}
                        placeholder="manager@company.com" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">C-Level Email</label>
                      <input type="email" className="glass-input"
                        value={deptForm.c_level_email}
                        onChange={(e) => setDeptForm({ ...deptForm, c_level_email: e.target.value })}
                        placeholder="ceo@company.com" />
                    </div>
                  </div>
                  <button className="glass-btn glass-btn-primary" onClick={handleAddDept} disabled={!deptForm.name.trim()} style={{marginTop: 8}}>
                    Add Department
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'holidays' && (
            <>
              <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:calendar-clock" style={{ marginRight: 8 }} />Work Week</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    Set which days are work days. Any work day without an attendance record will be counted as absence.
                  </p>
                  <div className="glass-detail-grid">
                    <div className="glass-form-group">
                      <label className="glass-label">Work Week Start Day</label>
                      <select className="glass-select" value={settings.work_week_start}
                        onChange={(e) => setSettings({ ...settings, work_week_start: e.target.value })}>
                        {weekDays.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Work Week End Day</label>
                      <select className="glass-select" value={settings.work_week_end}
                        onChange={(e) => setSettings({ ...settings, work_week_end: e.target.value })}>
                        {weekDays.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button className="glass-btn glass-btn-primary" onClick={handleSaveWorkWeek} disabled={saving}>
                      {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:timer" style={{ marginRight: 8 }} />Attendance Period</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    The attendance month runs from day {settings.period_start_day} of the previous month to day {settings.period_end_day} of the current month.
                  </p>
                  <div className="glass-detail-grid">
                    <div className="glass-form-group">
                      <label className="glass-label">Period Start Day (of previous month)</label>
                      <input type="number" className="glass-input" value={settings.period_start_day}
                        onChange={(e) => setSettings({ ...settings, period_start_day: e.target.value })}
                        min={1} max={28} />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Period End Day (of current month)</label>
                      <input type="number" className="glass-input" value={settings.period_end_day}
                        onChange={(e) => setSettings({ ...settings, period_end_day: e.target.value })}
                        min={1} max={28} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:party-popper" style={{ marginRight: 8 }} />Official Holidays</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    These dates will be excluded from absence calculations.
                  </p>

                  <div className="glass-table-wrapper" style={{ marginBottom: 24 }}>
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th style={{width: 60}}>ID</th>
                          <th>Date</th>
                          <th>Name</th>
                          <th style={{width: 100}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holidays.length === 0 && (
                          <tr><td colSpan={4}><div className="glass-empty" style={{ padding: 20 }}>No holidays added yet.</div></td></tr>
                        )}
                        {holidays.map((h) => (
                          <tr key={h.id}>
                            <td className="cell-mono">{h.id}</td>
                            <td>{formatDate(h.date)}</td>
                            <td>{h.name || <span style={{color:'var(--text-dim)'}}>—</span>}</td>
                            <td>
                              <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => setHolidayDeleteConfirm(h)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="glass-page-header" style={{ padding: 0, marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Add New Holiday</h3>
                  </div>
                  <div className="glass-detail-grid">
                    <div className="glass-form-group">
                      <label className="glass-label">Date</label>
                      <input type="date" className="glass-input"
                        value={holidayForm.date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Holiday Name</label>
                      <input type="text" className="glass-input"
                        value={holidayForm.name}
                        onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                        placeholder="e.g. Eid al-Fitr" />
                    </div>
                  </div>
                  <button className="glass-btn glass-btn-primary" onClick={handleAddHoliday} disabled={!holidayForm.date} style={{marginTop: 8}}>
                    Add Holiday
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'leave-types' && (
            <>
              <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:calendar-check" style={{ marginRight: 8 }} />Manage Leave Types</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    Configure leave type names and default balances. New employees receive the default balance for types that have one.
                  </p>
                  <div className="glass-table-wrapper">
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Label</th>
                          <th>Default Balance</th>
                          <th>Active</th>
                          <th style={{width: 120}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveTypes.length === 0 && (
                          <tr><td colSpan={5}><div className="glass-empty" style={{ padding: 20 }}>No leave types found.</div></td></tr>
                        )}
                        {leaveTypes.map((lt) => (
                          editingLt?.id === lt.id ? (
                            <tr key={lt.id}>
                              <td className="cell-mono">{lt.name}</td>
                              <td>
                                <input type="text" className="glass-input" style={{width:'100%'}}
                                  value={editingLt.label}
                                  onChange={(e) => setEditingLt({ ...editingLt, label: e.target.value })} />
                              </td>
                              <td>
                                <input type="number" className="glass-input" style={{width:100}}
                                  value={editingLt.default_balance ?? ''}
                                  onChange={(e) => setEditingLt({ ...editingLt, default_balance: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                                  step="0.5" min="0" placeholder="No balance" />
                              </td>
                              <td>
                                <input type="checkbox" checked={!!editingLt.is_active}
                                  onChange={(e) => setEditingLt({ ...editingLt, is_active: e.target.checked ? 1 : 0 })} />
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={() => handleSaveLeaveType(editingLt)}>Save</button>
                                  <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setEditingLt(null)}>Cancel</button>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            <tr key={lt.id}>
                              <td className="cell-mono">{lt.name}</td>
                              <td><strong>{lt.label}</strong></td>
                              <td>{lt.default_balance !== null ? `${lt.default_balance} days` : <span style={{color:'var(--text-dim)'}}>—</span>}</td>
                              <td>
                                <span className={`glass-badge ${lt.is_active ? 'glass-badge-success' : 'glass-badge-secondary'}`}>
                                  {lt.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setEditingLt({ ...lt })}>Edit</button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <hr style={{ margin: '28px 0', border: 'none', borderTop: '1px solid var(--border-glass)' }} />

                  <div className="glass-page-header" style={{ padding: 0, marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>Reset All Balances</h3>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                    Reset all employees&apos; leave balances to the default values configured above.
                    {lastReset && <span> Last reset: <strong>{new Date(lastReset).toLocaleDateString()}</strong></span>}
                  </p>
                  <button className="glass-btn glass-btn-danger" onClick={() => setResetConfirm(true)}>
                    Reset All Balances to Defaults
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'grades' && (
            <>
              <div className="glass-card card-hover fade-in-up" style={{ marginBottom: 24 }}>
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:layers" style={{ marginRight: 8 }} />Manage Grades (Job Levels)</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    Define job grades/levels and their salary ranges. Grades are used to standardize positions and compensation across the organization.
                  </p>

                  <div className="glass-table-wrapper" style={{ marginBottom: 24 }}>
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th style={{width: 60}}>Level</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Min Salary</th>
                          <th>Max Salary</th>
                          <th style={{width: 140}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grades.length === 0 && (
                          <tr><td colSpan={6}><div className="glass-empty" style={{ padding: 20 }}>No grades defined yet. Add one below.</div></td></tr>
                        )}
                        {grades.map((g) => (
                          <tr key={g.id}>
                            {editingGrade?.id === g.id ? (
                              <>
                                <td>
                                  <input type="number" className="glass-input" style={{width:60}}
                                    value={editingGrade.grade_level}
                                    onChange={(e) => setEditingGrade({ ...editingGrade, grade_level: e.target.value })} />
                                </td>
                                <td>
                                  <input type="text" className="glass-input" style={{width:'100%'}}
                                    value={editingGrade.name}
                                    onChange={(e) => setEditingGrade({ ...editingGrade, name: e.target.value })} />
                                </td>
                                <td>
                                  <input type="text" className="glass-input" style={{width:'100%'}}
                                    value={editingGrade.description || ''}
                                    onChange={(e) => setEditingGrade({ ...editingGrade, description: e.target.value })} />
                                </td>
                                <td>
                                  <input type="number" className="glass-input" style={{width:120}}
                                    value={editingGrade.min_salary || ''}
                                    onChange={(e) => setEditingGrade({ ...editingGrade, min_salary: e.target.value })} />
                                </td>
                                <td>
                                  <input type="number" className="glass-input" style={{width:120}}
                                    value={editingGrade.max_salary || ''}
                                    onChange={(e) => setEditingGrade({ ...editingGrade, max_salary: e.target.value })} />
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={handleEditGrade}>Save</button>
                                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setEditingGrade(null)}>Cancel</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="cell-mono"><strong>Lv.{g.grade_level}</strong></td>
                                <td><strong>{g.name}</strong></td>
                                <td>{g.description || <span style={{color:'var(--text-dim)'}}>—</span>}</td>
                                <td>{g.min_salary ? `${Number(g.min_salary).toLocaleString()}` : <span style={{color:'var(--text-dim)'}}>—</span>}</td>
                                <td>{g.max_salary ? `${Number(g.max_salary).toLocaleString()}` : <span style={{color:'var(--text-dim)'}}>—</span>}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setEditingGrade({ ...g, grade_level: String(g.grade_level) })}>Edit</button>
                                    <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => setGradeDeleteConfirm(g)}>Delete</button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="glass-page-header" style={{ padding: 0, marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Add New Grade</h3>
                  </div>
                  <div className="glass-detail-grid">
                    <div className="glass-form-group">
                      <label className="glass-label">Level *</label>
                      <input type="number" className="glass-input"
                        value={gradeForm.grade_level}
                        onChange={(e) => setGradeForm({ ...gradeForm, grade_level: e.target.value })}
                        placeholder="1" min={1} />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Name *</label>
                      <input type="text" className="glass-input"
                        value={gradeForm.name}
                        onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })}
                        placeholder="e.g. Junior" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Description</label>
                      <input type="text" className="glass-input"
                        value={gradeForm.description}
                        onChange={(e) => setGradeForm({ ...gradeForm, description: e.target.value })}
                        placeholder="e.g. Entry level" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Min Salary</label>
                      <input type="number" className="glass-input"
                        value={gradeForm.min_salary}
                        onChange={(e) => setGradeForm({ ...gradeForm, min_salary: e.target.value })}
                        placeholder="0" />
                    </div>
                    <div className="glass-form-group">
                      <label className="glass-label">Max Salary</label>
                      <input type="number" className="glass-input"
                        value={gradeForm.max_salary}
                        onChange={(e) => setGradeForm({ ...gradeForm, max_salary: e.target.value })}
                        placeholder="0" />
                    </div>
                  </div>
                  <button className="glass-btn glass-btn-primary" onClick={handleAddGrade}
                    disabled={!gradeForm.grade_level || !gradeForm.name} style={{marginTop: 8}}>
                    Add Grade
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'master-lists' && (
            <>
              <div className="glass-card card-hover fade-in-up">
                <div className="glass-card-header">
                  <h3><Icon icon="lucide:list" style={{ marginRight: 8 }} />Master Lists</h3>
                </div>
                <div className="glass-card-body">
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 16 }}>
                    Add and manage skills and certifications used across recruitment requirements.
                  </p>
                  {message && <div className={`glass-alert ${message.toLowerCase().includes('failed') ? 'glass-alert-danger' : 'glass-alert-success'}`} style={{whiteSpace:'pre-line'}}>{message}</div>}
                  <div className="glass-tabs" style={{ marginBottom: 16 }}>
                    <button className={`glass-tab ${mlActiveSubtab === 'skills' ? 'glass-tab-active' : ''}`} onClick={() => setMlActiveSubtab('skills')}>
                      <Icon icon="lucide:wrench" style={{ marginRight: 4 }} /> Skills
                    </button>
                    <button className={`glass-tab ${mlActiveSubtab === 'certs' ? 'glass-tab-active' : ''}`} onClick={() => setMlActiveSubtab('certs')}>
                      <Icon icon="lucide:award" style={{ marginRight: 4 }} /> Certifications
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input className="glass-input" value={mlNewName}
                      onChange={e => setMlNewName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleMlAdd(); }}
                      placeholder={`Add new ${mlActiveSubtab === 'skills' ? 'skill' : 'certification'}...`}
                      style={{ maxWidth: 400 }} />
                    <button className="glass-btn glass-btn-primary" onClick={handleMlAdd} disabled={!mlNewName.trim()}>
                      <Icon icon="lucide:plus" style={{ marginRight: 6 }} /> Add
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
                        {(mlActiveSubtab === 'skills' ? mlSkills : mlCerts).length === 0 ? (
                          <tr><td colSpan={3}><div className="glass-empty" style={{ padding: 20 }}>No {mlActiveSubtab === 'skills' ? 'skills' : 'certifications'} yet. Add one above.</div></td></tr>
                        ) : (mlActiveSubtab === 'skills' ? mlSkills : mlCerts).map(item => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>
                              {mlEditing?.id === item.id ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <input className="glass-input" value={mlEditName}
                                    onChange={e => setMlEditName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleMlUpdate(); if (e.key === 'Escape') setMlEditing(null); }}
                                    style={{ maxWidth: 300 }} />
                                  <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={handleMlUpdate}>Save</button>
                                  <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => setMlEditing(null)}>Cancel</button>
                                </div>
                              ) : item.name}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => { setMlEditing(item); setMlEditName(item.name); }}>Edit</button>
                                <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => setMlConfirm(item)}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {mlConfirm && (
                <ConfirmModal
                  message={`Delete "${mlConfirm.name}"?`}
                  onConfirm={() => handleMlDelete(mlConfirm.id)}
                  onCancel={() => setMlConfirm(null)}
                />
              )}
            </>
          )}

        </div>
      </div>

      {deleteConfirm && (
        <ConfirmModal
          title="Delete Department"
          message={`Delete "${deleteConfirm.name}"? Employees in this department will be unassigned.`}
          onConfirm={() => handleDeleteDept(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
      {holidayDeleteConfirm && (
        <ConfirmModal
          title="Delete Holiday"
          message={`Delete holiday "${holidayDeleteConfirm.name || holidayDeleteConfirm.date}"? This will not affect existing attendance records.`}
          onConfirm={() => handleDeleteHoliday(holidayDeleteConfirm)}
          onCancel={() => setHolidayDeleteConfirm(null)}
        />
      )}
      {resetConfirm && (
        <ConfirmModal
          title="Reset All Balances"
          message="This will reset ALL employees' leave balances to the default values from Leave Types.\n\nThis action cannot be undone. Are you sure?"
          confirmText="Reset Balances"
          confirmClass="btn btn-danger"
          onConfirm={handleResetBalances}
          onCancel={() => setResetConfirm(false)}
        />
      )}
      {gradeDeleteConfirm && (
        <ConfirmModal
          title="Delete Grade"
          message={`Delete grade "${gradeDeleteConfirm.name}" (Lv.${gradeDeleteConfirm.grade_level})? Employees assigned to this grade will have their grade unset.`}
          onConfirm={() => handleDeleteGrade(gradeDeleteConfirm)}
          onCancel={() => setGradeDeleteConfirm(null)}
        />
      )}
    </HRLayout>
  );
}

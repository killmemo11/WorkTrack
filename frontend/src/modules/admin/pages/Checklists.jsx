// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ConfirmModal from '../../../shared/components/ConfirmModal';

export default function AdminChecklists() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', type: 'onboarding' });
  const [editTemplateId, setEditTemplateId] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ task_name: '', assigned_to: 'admin', order_index: 0, is_required: true, days_offset: 0 });
  const [editItemId, setEditItemId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await hrApi.get('/checklist-templates');
      setTemplates(res.data);
    } catch (err) {
      setMessage('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openCreateTemplate = () => {
    setEditTemplateId(null);
    setTemplateForm({ name: '', type: 'onboarding' });
    setShowTemplateForm(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) { setMessage('Name is required'); setTimeout(() => setMessage(''), 3000); return; }
    try {
      if (editTemplateId) {
        await hrApi.put(`/checklist-templates/${editTemplateId}`, templateForm);
        setMessage('Template updated');
      } else {
        await hrApi.post('/checklist-templates', templateForm);
        setMessage('Template created');
      }
      setShowTemplateForm(false);
      fetchTemplates();
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteTemplate = async (id) => {
    try { await hrApi.delete(`/checklist-templates/${id}`); setMessage('Deleted'); fetchTemplates(); } catch (err) { setMessage('Failed'); }
    setConfirm(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const openAddItem = (template) => {
    setEditItemId(null);
    setItemForm({ task_name: '', assigned_to: 'admin', order_index: (template.items?.length || 0) + 1, is_required: true, days_offset: 0 });
    setSelectedTemplate(template);
    setShowItemForm(true);
  };

  const openEditItem = (template, item) => {
    setEditItemId(item.id);
    setItemForm({ task_name: item.task_name, assigned_to: item.assigned_to, order_index: item.order_index, is_required: !!item.is_required, days_offset: item.days_offset || 0 });
    setSelectedTemplate(template);
    setShowItemForm(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.task_name.trim()) { setMessage('Task name is required'); setTimeout(() => setMessage(''), 3000); return; }
    try {
      if (editItemId) {
        await hrApi.put(`/checklist-items/${editItemId}`, itemForm);
        setMessage('Item updated');
      } else {
        await hrApi.post(`/checklist-templates/${selectedTemplate.id}/items`, itemForm);
        setMessage('Item added');
      }
      setShowItemForm(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDeleteItem = async (itemId) => {
    try { await hrApi.delete(`/checklist-items/${itemId}`); setMessage('Item deleted'); fetchTemplates(); } catch (err) { setMessage('Failed'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const assigneeBadge = (a) => {
    const map = { it: 'info', hr: 'success', admin: 'warning', manager: 'danger' };
    return <span className={`glass-badge glass-badge-${map[a] || 'default'}`}>{a}</span>;
  };

  if (loading) return <div className="glass-loading"><div className="spinner"/><span>Loading...</span></div>;

  return (
      <div className="page">
        <div className="glass-page-header">
          <div>
            <h1>Onboarding & Offboarding</h1>
            <p className="subtitle" style={{color:'var(--text-dim)'}}>Manage checklists templates for employee onboarding and offboarding</p>
          </div>
        </div>

        {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}

        <div className="glass-tabs">
          <button className={`glass-tab ${tab === 'templates' ? 'glass-tab-active' : ''}`} onClick={() => setTab('templates')}><span className="iconify" data-icon="lucide:list-checks"/> Templates</button>
          <button className={`glass-tab ${tab === 'employees' ? 'glass-tab-active' : ''}`} onClick={() => setTab('employees')}><span className="iconify" data-icon="lucide:users"/> Employee Progress</button>
        </div>

        {tab === 'templates' && (
          <>
            <button className="glass-btn glass-btn-primary" style={{ marginBottom: 16 }} onClick={openCreateTemplate}><span className="iconify" data-icon="lucide:file-plus"/> New Template</button>

            {templates.length === 0 ? (
              <div className="glass-empty"><span className="iconify" data-icon="lucide:clipboard-list"/><p>No templates created yet.</p></div>
            ) : templates.map((t, idx) => (
              <div key={t.id} className="glass-card card-hover fade-in-up" style={{ marginBottom: 16, animationDelay: `${idx * 60}ms` }}>
                <div className="glass-card-header">
                  <div>
                    <h3>{t.name}</h3>
                    <span className={`glass-badge glass-badge-${t.type === 'onboarding' ? 'success' : 'warning'}`} style={{ marginLeft: 8 }}>{t.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => { setEditTemplateId(t.id); setTemplateForm({ name: t.name, type: t.type }); setShowTemplateForm(true); }}><span className="iconify" data-icon="lucide:pencil"/></button>
                    <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => openAddItem(t)}><span className="iconify" data-icon="lucide:plus"/> Add Task</button>
                    <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => setConfirm({ action: () => handleDeleteTemplate(t.id), label: `Delete "${t.name}"?` })}><span className="iconify" data-icon="lucide:trash-2"/></button>
                  </div>
                </div>
                <div className="glass-card-body">
                  {(!t.items || t.items.length === 0) ? (
                    <p style={{ color: 'var(--text-dim)', fontSize: 13, padding: 8 }}>No tasks yet. Click "Add Task"</p>
                  ) : (
                    <table className="glass-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>#</th>
                          <th>Task</th>
                          <th style={{ width: 100 }}>Assignee</th>
                          <th style={{ width: 80 }}>Required</th>
                          <th style={{ width: 100 }}>Days Offset</th>
                          <th style={{ width: 120 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.items.map(item => (
                          <tr key={item.id}>
                            <td>{item.order_index}</td>
                            <td>{item.task_name}</td>
                            <td>{assigneeBadge(item.assigned_to)}</td>
                            <td>{item.is_required ? <span className="iconify" data-icon="lucide:check-circle" style={{color:'var(--success)'}}/> : <span className="iconify" data-icon="lucide:minus" style={{color:'var(--text-dim)'}}/>}</td>
                            <td>{item.days_offset > 0 ? `+${item.days_offset}d` : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => openEditItem(t, item)}><span className="iconify" data-icon="lucide:pencil"/></button>
                                <button className="glass-btn glass-btn-danger glass-btn-sm" onClick={() => handleDeleteItem(item.id)}><span className="iconify" data-icon="lucide:trash-2"/></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'employees' && <EmployeeChecklistProgress />}

        {showTemplateForm && (
          <div className="glass-modal-overlay" onClick={() => setShowTemplateForm(false)}>
            <div className="glass-modal" onClick={e => e.stopPropagation()}>
              <button className="glass-modal-close" onClick={() => setShowTemplateForm(false)}><span className="iconify" data-icon="lucide:x"/></button>
              <h3>{editTemplateId ? 'Edit Template' : 'New Template'}</h3>
              <div className="glass-form-group">
                <label>Name *</label>
                <input className="glass-input" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} />
              </div>
              <div className="glass-form-group">
                <label>Type</label>
                <select className="glass-select" value={templateForm.type} onChange={e => setTemplateForm({...templateForm, type: e.target.value})}>
                  <option value="onboarding">Onboarding</option>
                  <option value="offboarding">Offboarding</option>
                </select>
              </div>
              <div className="glass-modal-footer">
                <button className="glass-btn glass-btn-ghost" onClick={() => setShowTemplateForm(false)}>Cancel</button>
                <button className="glass-btn glass-btn-primary" onClick={handleSaveTemplate}>{editTemplateId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {showItemForm && (
          <div className="glass-modal-overlay" onClick={() => setShowItemForm(false)}>
            <div className="glass-modal" onClick={e => e.stopPropagation()}>
              <button className="glass-modal-close" onClick={() => setShowItemForm(false)}><span className="iconify" data-icon="lucide:x"/></button>
              <h3>{editItemId ? 'Edit Task' : 'Add Task'} — {selectedTemplate?.name}</h3>
              <div className="glass-form-group">
                <label>Task Name *</label>
                <input className="glass-input" value={itemForm.task_name} onChange={e => setItemForm({...itemForm, task_name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group">
                  <label>Assigned To</label>
                  <select className="glass-select" value={itemForm.assigned_to} onChange={e => setItemForm({...itemForm, assigned_to: e.target.value})}>
                    <option value="it">IT</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="glass-form-group">
                  <label>Order</label>
                  <input type="number" className="glass-input" value={itemForm.order_index} onChange={e => setItemForm({...itemForm, order_index: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="glass-form-group">
                  <label style={{display:'flex', alignItems:'center', gap:8}}><input type="checkbox" checked={itemForm.is_required} onChange={e => setItemForm({...itemForm, is_required: e.target.checked})} /> Required</label>
                </div>
                <div className="glass-form-group">
                  <label>Days Offset</label>
                  <input type="number" className="glass-input" value={itemForm.days_offset} onChange={e => setItemForm({...itemForm, days_offset: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="glass-modal-footer">
                <button className="glass-btn glass-btn-ghost" onClick={() => setShowItemForm(false)}>Cancel</button>
                <button className="glass-btn glass-btn-primary" onClick={handleSaveItem}>{editItemId ? 'Update' : 'Add'}</button>
              </div>
            </div>
          </div>
        )}

        {confirm && <ConfirmModal message={confirm.label} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      </div>
  );
}

function EmployeeChecklistProgress() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empChecklists, setEmpChecklists] = useState([]);
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [checklistDetail, setChecklistDetail] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    hrApi.get('/employees?limit=200').then(r => setEmployees(r.data.employees || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadChecklists = async (empId) => {
    setSelectedEmp(empId);
    try {
      const res = await hrApi.get(`/employees/${empId}/checklists`);
      setEmpChecklists(res.data);
      setSelectedChecklist(null);
      setChecklistDetail(null);
    } catch (err) { setMessage('Failed'); }
  };

  const loadDetail = async (chkId) => {
    setSelectedChecklist(chkId);
    try {
      const res = await hrApi.get(`/checklists/${chkId}`);
      setChecklistDetail(res.data);
    } catch (err) { setMessage('Failed'); }
  };

  const startChecklist = async (empId, templateId) => {
    try {
      await hrApi.post(`/employees/${empId}/checklists/start`, { template_id: templateId });
      setMessage('Checklist started!');
      loadChecklists(empId);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  const completeTask = async (chkId, taskId) => {
    try {
      await hrApi.put(`/checklists/${chkId}/tasks/${taskId}/complete`);
      setMessage('Task completed');
      loadDetail(chkId);
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.error || err.message));
    }
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <div className="glass-loading" style={{ padding: 20 }}><div className="spinner"/><span>Loading employees...</span></div>;

  const statusBadge = (s) => {
    const map = { in_progress: 'warning', completed: 'success', cancelled: 'danger' };
    return <span className={`glass-badge glass-badge-${map[s] || 'default'}`}>{s}</span>;
  };

  return (
    <div>
      {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h3>Employees</h3>
          <div className="glass-card" style={{ maxHeight: 400, overflowY: 'auto', padding: 0 }}>
            {employees.map(emp => (
              <div key={emp.id} onClick={() => loadChecklists(emp.id)}
                style={{ padding: '8px 12px', cursor: 'pointer', background: selectedEmp === emp.id ? 'var(--bg-glass-hover)' : 'transparent', borderBottom: '1px solid var(--border-glass)', transition: 'background 0.15s' }}>
                {emp.name}
              </div>
            ))}
          </div>
        </div>

        {selectedEmp && (
          <div style={{ flex: 2 }}>
            <h3>Checklists</h3>
            {empChecklists.length === 0 ? (
              <div className="glass-card" style={{ padding: 20 }}>
                <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>No checklists started. Start one:</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={() => startChecklist(selectedEmp, 1)}><span className="iconify" data-icon="lucide:play"/> Start Onboarding</button>
                  <button className="glass-btn glass-btn-ghost glass-btn-sm" onClick={() => startChecklist(selectedEmp, 2)}><span className="iconify" data-icon="lucide:log-out"/> Start Offboarding</button>
                </div>
              </div>
            ) : (
              <div>
                {empChecklists.map(chk => (
                  <div key={chk.id} onClick={() => loadDetail(chk.id)}
                    className="glass-card card-hover" style={{ padding: '8px 12px', cursor: 'pointer', background: selectedChecklist === chk.id ? 'var(--bg-glass-hover)' : undefined, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><strong>{chk.template_name}</strong> <span className={`glass-badge glass-badge-${chk.type === 'onboarding' ? 'success' : 'warning'}`}>{chk.type}</span></div>
                    <div>{statusBadge(chk.status)}</div>
                  </div>
                ))}
                <button className="glass-btn glass-btn-ghost glass-btn-sm" style={{ marginTop: 8 }} onClick={() => startChecklist(selectedEmp, prompt('Template ID (1=Onboarding, 2=Offboarding):') || 1)}><span className="iconify" data-icon="lucide:plus"/> Start New</button>
              </div>
            )}

            {checklistDetail && (
              <div className="glass-card fade-in-up" style={{ marginTop: 16 }}>
                <div className="glass-card-header">
                  <h4>Tasks — {checklistDetail.checklist.template_name}</h4>
                </div>
                <div className="glass-card-body">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Task</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklistDetail.tasks.map(t => (
                        <tr key={t.id}>
                          <td>{t.order_index}</td>
                          <td>{t.task_name}</td>
                          <td><span className={`glass-badge glass-badge-${t.assigned_to === 'it' ? 'info' : t.assigned_to === 'hr' ? 'success' : t.assigned_to === 'admin' ? 'warning' : 'danger'}`}>{t.assigned_to}</span></td>
                          <td>{statusBadge(t.status)}</td>
                          <td>
                            {t.status !== 'completed' && (
                              <button className="glass-btn glass-btn-primary glass-btn-sm" onClick={() => completeTask(checklistDetail.checklist.id, t.id)}><span className="iconify" data-icon="lucide:check"/> Complete</button>
                            )}
                            {t.status === 'completed' && t.completed_by_name && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>by {t.completed_by_name}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

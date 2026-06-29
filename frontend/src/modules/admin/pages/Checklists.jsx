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
    const colors = { it: 'tag-blue', hr: 'tag-green', admin: 'tag-amber', manager: 'tag-red' };
    return <span className={`tag ${colors[a] || 'tag-gray'}`}>{a}</span>;
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1>Onboarding & Offboarding</h1>
            <p className="subtitle">Manage checklists templates for employee onboarding and offboarding</p>
          </div>
        </div>

        {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`btn btn-sm ${tab === 'templates' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('templates')}>Templates</button>
          <button className={`btn btn-sm ${tab === 'employees' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('employees')}>Employee Progress</button>
        </div>

        {tab === 'templates' && (
          <>
            <button className="btn btn-primary" style={{ marginBottom: 16 }} onClick={openCreateTemplate}>+ New Template</button>

            {templates.length === 0 ? (
              <p className="empty-state">No templates created yet.</p>
            ) : templates.map(t => (
              <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <strong>{t.name}</strong>
                    <span className={`tag ${t.type === 'onboarding' ? 'tag-green' : 'tag-amber'}`} style={{ marginLeft: 8 }}>{t.type}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditTemplateId(t.id); setTemplateForm({ name: t.name, type: t.type }); setShowTemplateForm(true); }}>Edit</button>
                    <button className="btn btn-sm btn-outline" onClick={() => openAddItem(t)}>+ Add Task</button>
                    <button className="btn btn-sm btn-outline" onClick={() => setConfirm({ action: () => handleDeleteTemplate(t.id), label: `Delete "${t.name}"?` })}>Delete</button>
                  </div>
                </div>
                <div style={{ padding: '8px 20px' }}>
                  {(!t.items || t.items.length === 0) ? (
                    <p style={{ color: '#999', fontSize: 13, padding: 8 }}>No tasks yet. Click "+ Add Task"</p>
                  ) : (
                    <table className="table" style={{ margin: 0 }}>
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
                            <td>{item.is_required ? '✅' : '—'}</td>
                            <td>{item.days_offset > 0 ? `+${item.days_offset}d` : '—'}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-sm btn-outline" onClick={() => openEditItem(t, item)}>Edit</button>
                                <button className="btn btn-sm btn-outline" onClick={() => handleDeleteItem(item.id)}>Del</button>
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
          <div className="modal-overlay" onClick={() => setShowTemplateForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editTemplateId ? 'Edit Template' : 'New Template'}</h3>
              <div className="form-group">
                <label>Name *</label>
                <input className="form-control" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={templateForm.type} onChange={e => setTemplateForm({...templateForm, type: e.target.value})}>
                  <option value="onboarding">Onboarding</option>
                  <option value="offboarding">Offboarding</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setShowTemplateForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveTemplate}>{editTemplateId ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {showItemForm && (
          <div className="modal-overlay" onClick={() => setShowItemForm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3>{editItemId ? 'Edit Task' : 'Add Task'} — {selectedTemplate?.name}</h3>
              <div className="form-group">
                <label>Task Name *</label>
                <input className="form-control" value={itemForm.task_name} onChange={e => setItemForm({...itemForm, task_name: e.target.value})} />
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label>Assigned To</label>
                  <select className="form-control" value={itemForm.assigned_to} onChange={e => setItemForm({...itemForm, assigned_to: e.target.value})}>
                    <option value="it">IT</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Order</label>
                  <input type="number" className="form-control" value={itemForm.order_index} onChange={e => setItemForm({...itemForm, order_index: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label><input type="checkbox" checked={itemForm.is_required} onChange={e => setItemForm({...itemForm, is_required: e.target.checked})} /> Required</label>
                </div>
                <div className="form-group">
                  <label>Days Offset</label>
                  <input type="number" className="form-control" value={itemForm.days_offset} onChange={e => setItemForm({...itemForm, days_offset: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-outline" onClick={() => setShowItemForm(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveItem}>{editItemId ? 'Update' : 'Add'}</button>
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

  if (loading) return <p className="loading" style={{ padding: 20 }}>Loading employees...</p>;

  const statusBadge = (s) => {
    const colors = { in_progress: 'tag-amber', completed: 'tag-green', cancelled: 'tag-red' };
    return <span className={`tag ${colors[s] || 'tag-gray'}`}>{s}</span>;
  };

  return (
    <div>
      {message && <div className={`alert ${message.includes('Failed') ? 'alert-error' : 'alert-success'}`}>{message}</div>}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h3>Employees</h3>
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
            {employees.map(emp => (
              <div key={emp.id} onClick={() => loadChecklists(emp.id)}
                style={{ padding: '8px 12px', cursor: 'pointer', background: selectedEmp === emp.id ? '#eef2ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}>
                {emp.name}
              </div>
            ))}
          </div>
        </div>

        {selectedEmp && (
          <div style={{ flex: 2 }}>
            <h3>Checklists</h3>
            {empChecklists.length === 0 ? (
              <div>
                <p style={{ color: '#999', fontSize: 13 }}>No checklists started. Start one:</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => startChecklist(selectedEmp, 1)}>Start Onboarding</button>
                  <button className="btn btn-sm btn-outline" onClick={() => startChecklist(selectedEmp, 2)}>Start Offboarding</button>
                </div>
              </div>
            ) : (
              <div>
                {empChecklists.map(chk => (
                  <div key={chk.id} onClick={() => loadDetail(chk.id)}
                    style={{ padding: '8px 12px', cursor: 'pointer', background: selectedChecklist === chk.id ? '#eef2ff' : 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <div><strong>{chk.template_name}</strong> <span className={`tag ${chk.type === 'onboarding' ? 'tag-green' : 'tag-amber'}`}>{chk.type}</span></div>
                    <div>{statusBadge(chk.status)}</div>
                  </div>
                ))}
                <button className="btn btn-sm btn-outline" style={{ marginTop: 8 }} onClick={() => startChecklist(selectedEmp, prompt('Template ID (1=Onboarding, 2=Offboarding):') || 1)}>+ Start New</button>
              </div>
            )}

            {checklistDetail && (
              <div style={{ marginTop: 16 }}>
                <h4>Tasks — {checklistDetail.checklist.template_name}</h4>
                <table className="table">
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
                        <td><span className={`tag ${t.assigned_to === 'it' ? 'tag-blue' : t.assigned_to === 'hr' ? 'tag-green' : t.assigned_to === 'admin' ? 'tag-amber' : 'tag-red'}`}>{t.assigned_to}</span></td>
                        <td>{statusBadge(t.status)}</td>
                        <td>
                          {t.status !== 'completed' && (
                            <button className="btn btn-sm btn-primary" onClick={() => completeTask(checklistDetail.checklist.id, t.id)}>Complete</button>
                          )}
                          {t.status === 'completed' && t.completed_by_name && <span style={{ fontSize: 12, color: '#666' }}>by {t.completed_by_name}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';

export default function ProfileChecklists({ employeeId }) {
  const [checklists, setChecklists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      hrApi.get(`/employees/${employeeId}/checklists`),
      hrApi.get('/checklist-templates'),
    ]).then(([c, t]) => {
      setChecklists(c.data);
      setTemplates(t.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [employeeId]);

  const startChecklist = async (templateId) => {
    try {
      await hrApi.post(`/employees/${employeeId}/checklists/start`, { template_id: templateId });
      setMessage('Checklist started');
      const res = await hrApi.get(`/employees/${employeeId}/checklists`);
      setChecklists(res.data);
    } catch (err) { setMessage('Failed: ' + (err.response?.data?.error || err.message)); }
    setTimeout(() => setMessage(''), 3000);
  };

  const loadDetail = async (id) => {
    setSelected(id);
    try {
      const res = await hrApi.get(`/checklists/${id}`);
      setDetail(res.data);
    } catch (err) { setMessage('Failed'); }
  };

  const completeTask = async (chkId, taskId) => {
    try {
      await hrApi.put(`/checklists/${chkId}/tasks/${taskId}/complete`);
      loadDetail(chkId);
      setMessage('Task completed');
    } catch (err) { setMessage('Failed'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const statusBadge = (s) => {
    const colors = { in_progress: 'amber', completed: 'success', cancelled: 'danger' };
    return <span className={`glass-badge glass-badge-${colors[s] || 'neutral'}`}>{s}</span>;
  };

  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div>
      {message && <div className={`glass-alert ${message.includes('Failed') ? 'glass-alert-danger' : 'glass-alert-success'}`}>{message}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {templates.filter(t => t.is_active !== 0).map(t => (
          <button key={t.id} className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => startChecklist(t.id)}>
            + Start {t.name}
          </button>
        ))}
      </div>

      {checklists.length === 0 ? (
        <p className="glass-empty">No checklists started.</p>
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h4>Checklists</h4>
            {checklists.map(chk => (
              <div key={chk.id} onClick={() => loadDetail(chk.id)}
                style={{ padding: '8px 12px', cursor: 'pointer', background: selected === chk.id ? '#eef2ff' : 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                <div><strong>{chk.template_name}</strong> <span className={`glass-badge ${chk.type === 'onboarding' ? 'glass-badge-success' : 'glass-badge-warning'}`}>{chk.type}</span></div>
                <div>{statusBadge(chk.status)}</div>
              </div>
            ))}
          </div>

          {detail && (
            <div style={{ flex: 2 }}>
              <h4>Tasks — {detail.checklist.template_name}</h4>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Task</th>
                    <th>Assignee</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.tasks.map(t => (
                    <tr key={t.id}>
                      <td>{t.order_index}</td>
                      <td>{t.task_name}</td>
                      <td><span className={`glass-badge ${t.assigned_to === 'it' ? 'glass-badge-info' : t.assigned_to === 'hr' ? 'glass-badge-success' : t.assigned_to === 'admin' ? 'glass-badge-warning' : 'glass-badge-danger'}`}>{t.assigned_to}</span></td>
                      <td>{statusBadge(t.status)}</td>
                      <td>
                        {t.status !== 'completed' && (
                          <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => completeTask(detail.checklist.id, t.id)}>Complete</button>
                        )}
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
  );
}

import { useState, useEffect } from 'react';
import hrApi from '../../../shared/api/hrApi';
import ProfileSection from './ProfileSection';
import '../styles/profile.css';

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

  if (loading) return (
    <ProfileSection title="Checklists" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}>
      <div className="doc-skeleton"><div className="doc-skeleton-card" style={{ height: 60 }} /></div>
    </ProfileSection>
  );

  return (
    <ProfileSection
      title="Checklists"
      icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>}
    >
      {message && <div className={`profile-message profile-message-${message.includes('Failed') ? 'error' : 'success'}`}>{message}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {templates.filter(t => t.is_active !== 0).map(t => (
          <button key={t.id} className="profile-btn profile-btn-primary profile-btn-sm" onClick={() => startChecklist(t.id)}>
            + Start {t.name}
          </button>
        ))}
      </div>

      {checklists.length === 0 ? (
        <div className="doc-empty" style={{ padding: '20px' }}>
          <span className="doc-empty-icon" style={{ fontSize: 36 }}>📋</span>
          <h4>No checklists started</h4>
          <p>Use the buttons above to start a checklist.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Checklists</h4>
            {checklists.map(chk => (
              <div key={chk.id} onClick={() => loadDetail(chk.id)}
                className="profile-list-item"
                style={{
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: selected === chk.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  border: selected === chk.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 200ms ease, border-color 200ms ease',
                }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>{chk.template_name}</strong> <span className={`glass-badge ${chk.type === 'onboarding' ? 'glass-badge-success' : 'glass-badge-warning'}`}>{chk.type}</span></div>
                <div>{statusBadge(chk.status)}</div>
              </div>
            ))}
          </div>

          {detail && (
            <div style={{ flex: 2, minWidth: 300, animation: 'slideDown 300ms ease' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Tasks — {detail.checklist.template_name}</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {['#', 'Task', 'Assignee', 'Status', 'Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-dim)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.tasks.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 12px', color: 'var(--text-faint)' }}>{t.order_index}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>{t.task_name}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`glass-badge ${t.assigned_to === 'it' ? 'glass-badge-info' : t.assigned_to === 'hr' ? 'glass-badge-success' : t.assigned_to === 'admin' ? 'glass-badge-warning' : 'glass-badge-danger'}`}>{t.assigned_to}</span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>{statusBadge(t.status)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {t.status !== 'completed' && (
                            <button className="profile-btn profile-btn-xs profile-btn-primary" onClick={() => completeTask(detail.checklist.id, t.id)}>Complete</button>
                          )}
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
    </ProfileSection>
  );
}

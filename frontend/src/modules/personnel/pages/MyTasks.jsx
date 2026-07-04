import { useState, useEffect } from 'react';
import api from '../../../shared/api';

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_BADGE = { low: 'glass-badge-default', medium: 'glass-badge-warning', high: 'glass-badge-danger' };
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_BADGE = { pending: 'glass-badge-default', in_progress: 'glass-badge-info', completed: 'glass-badge-success', cancelled: 'glass-badge-default' };

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = () => {
    api.get('/tasks?mine=true')
      .then(res => setTasks(res.data))
      .catch(err => console.error('Failed to load tasks:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, []);

  const updateStatus = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  return (
    <div className="page">
      <div className="glass-page-header">
        <div>
          <h1>My Tasks</h1>
          <p className="subtitle" style={{ color: 'var(--text-dim)' }}>Tasks assigned to you by your manager</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="glass-empty">
          <span className="iconify" data-icon="lucide:check-square" style={{ fontSize: 48, opacity: 0.4 }}></span>
          <h3>No tasks assigned</h3>
          <p>All caught up! Great job.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {tasks.map((t, idx) => (
            <div key={t.id} className="glass-card card-hover fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="glass-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '1rem' }}>{t.title}</strong>
                    <span className={`glass-badge ${PRIORITY_BADGE[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span>
                    <span className={`glass-badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                  </div>
                  {t.description && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>{t.description}</p>}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {t.due_date && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="iconify" data-icon="lucide:calendar" style={{ fontSize: 12 }}></span>
                        Due {t.due_date}
                      </span>
                    )}
                    {t.assigned_by_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="iconify" data-icon="lucide:user" style={{ fontSize: 12 }}></span>
                        {t.assigned_by_name}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    className="glass-select"
                    style={{ minWidth: 130 }}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {t.status !== 'completed' && t.status !== 'cancelled' && (
                    <button
                      className="glass-btn glass-btn-sm glass-btn-primary"
                      onClick={() => updateStatus(t.id, 'completed')}
                    >
                      <span className="iconify" data-icon="lucide:check" style={{ marginRight: 4, fontSize: 12 }}></span>
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

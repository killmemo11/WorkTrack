import { useState, useEffect } from 'react';
import api from '../../../shared/api';

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_COLORS = { low: 'tag-green', medium: 'tag-amber', high: 'tag-red' };
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

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

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My Tasks</h1>
          <p className="subtitle">Tasks assigned to you by your manager</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="empty-state">No tasks assigned. 🎉</p>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Assigned By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.title}</strong>
                    {t.description && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#666' }}>{t.description}</p>}
                  </td>
                  <td><span className={`tag ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span></td>
                  <td>
                    <select
                      value={t.status}
                      onChange={(e) => updateStatus(t.id, e.target.value)}
                      className="form-control"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>{t.due_date || '—'}</td>
                  <td>{t.assigned_by_name}</td>
                  <td>
                    {t.status !== 'completed' && t.status !== 'cancelled' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => updateStatus(t.id, 'completed')}
                      >
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

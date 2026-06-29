import { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/context/AuthContext';
import api from '../../../shared/api';

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_COLORS = { low: 'tag-green', medium: 'tag-amber', high: 'tag-red' };

export default function ManagerTasks() {
  const { employee } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tasksRes, teamRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/manager/team'),
      ]);
      setTasks(tasksRes.data);
      setTeam(teamRes.data.team || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const createTask = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.assigned_to) return;
    try {
      await api.post('/tasks', form);
      setForm({ title: '', description: '', assigned_to: '', priority: 'medium', due_date: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const updateStatus = async (taskId, status) => {
    try {
      await api.patch(`/tasks/${taskId}/status`, { status });
      fetchData();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Team Tasks</h1>
          <p className="subtitle">Manage tasks for your team</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Assign New Task</h3>
          <form onSubmit={createTask}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.9rem' }}>Title *</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Task title"
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.9rem' }}>Assign To *</label>
                <select
                  className="form-control"
                  value={form.assigned_to}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  required
                >
                  <option value="">Select team member...</option>
                  {team.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.9rem' }}>Priority</label>
                <select
                  className="form-control"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.9rem' }}>Due Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: '0.9rem' }}>Description</label>
              <textarea
                className="form-control"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Task details..."
                rows={3}
              />
            </div>
            <button type="submit" className="btn btn-primary">Create Task</button>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>{pendingTasks.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>Pending / In Progress</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{completedTasks.length}</div>
          <div style={{ fontSize: '0.85rem', color: '#666' }}>Completed</div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#999' }}>No tasks yet. Create your first task!</td></tr>
            ) : tasks.map(t => (
              <tr key={t.id}>
                <td>
                  <strong>{t.title}</strong>
                  {t.description && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#666' }}>{t.description}</p>}
                </td>
                <td>{t.assigned_to_name}</td>
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
                <td>
                  <button className="btn btn-sm btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => deleteTask(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { useAuth } from '../../../shared/context/AuthContext';
import api from '../../../shared/api';

const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_BADGE = { low: 'glass-badge-default', medium: 'glass-badge-warning', high: 'glass-badge-danger' };
const STATUS_BADGE = { completed: 'glass-badge-success', in_progress: 'glass-badge-info', pending: 'glass-badge-warning', cancelled: 'glass-badge-default' };

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

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading...</span></div>;

  const pendingTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="page">
      <div className="glass-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1><Icon icon="lucide:list-checks" style={{ marginRight: 10, verticalAlign: 'middle' }} />Team Tasks</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Manage tasks for your team</p>
        </div>
        <button className="glass-btn glass-btn-primary" onClick={() => setShowForm(!showForm)}>
          <Icon icon={showForm ? 'lucide:x' : 'lucide:plus'} style={{ marginRight: 6 }} />
          {showForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card fade-in-up" style={{ marginBottom: 24 }}>
          <div className="glass-card-header">
            <h3 className="glass-modal-title"><Icon icon="lucide:plus-circle" style={{ marginRight: 8 }} />Assign New Task</h3>
          </div>
          <div className="glass-card-body">
            <form onSubmit={createTask}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div className="glass-form-group">
                  <label>Title *</label>
                  <input
                    className="glass-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Task title"
                    required
                  />
                </div>
                <div className="glass-form-group">
                  <label>Assign To *</label>
                  <select
                    className="glass-select"
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
                <div className="glass-form-group">
                  <label>Priority</label>
                  <select
                    className="glass-select"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="glass-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="glass-form-group">
                <label>Description</label>
                <textarea
                  className="glass-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                />
              </div>
              <button type="submit" className="glass-btn glass-btn-primary">
                <Icon icon="lucide:send" style={{ marginRight: 6 }} />Create Task
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="glass-card fade-in-up" style={{ textAlign: 'center' }}>
          <div className="glass-card-body" style={{ padding: 16 }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)' }}>{pendingTasks.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Pending / In Progress</div>
          </div>
        </div>
        <div className="glass-card fade-in-up" style={{ textAlign: 'center' }}>
          <div className="glass-card-body" style={{ padding: 16 }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{completedTasks.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Completed</div>
          </div>
        </div>
      </div>

      <div className="glass-table-wrapper fade-in-up">
        <table className="glass-table">
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
              <tr><td colSpan={6} className="glass-empty">No tasks yet. Create your first task!</td></tr>
            ) : tasks.map(t => (
              <tr key={t.id}>
                <td>
                  <strong>{t.title}</strong>
                  {t.description && <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>{t.description}</p>}
                </td>
                <td>{t.assigned_to_name}</td>
                <td><span className={`glass-badge ${PRIORITY_BADGE[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span></td>
                <td>
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    className="glass-select"
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
                  <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => deleteTask(t.id)}>
                    <Icon icon="lucide:trash-2" style={{ marginRight: 4 }} />Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

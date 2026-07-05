import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from '../../../shared/components/Icon';
import api from '../../../shared/api';

// Toast notification component
const Toast = ({ message, type = 'error', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: 'lucide:check-circle',
    error: 'lucide:alert-circle',
    info: 'lucide:info'
  };

  return (
    <div className={`glass-toast glass-toast-${type}`} onClick={onClose}>
      <Icon icon={icons[type]} />
      {message}
    </div>
  );
};

const API_ENDPOINTS = {
  TASKS: '/tasks',
  TASK_STATUS: (taskId) => `/tasks/${taskId}/status`,
  CREATE_TASK: '/tasks',
  TASK_HISTORY: (taskId) => `/tasks/${taskId}/history`,
  TASK_TEMPLATES: '/task-templates',
  TASK_STATS: '/tasks/stats'
};

const PRIORITY_CONFIG = {
  labels: { low: 'Low', medium: 'Medium', high: 'High' },
  badges: { low: 'glass-badge-default', medium: 'glass-badge-warning', high: 'glass-badge-danger' }
};

const STATUS_CONFIG = {
  labels: { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' },
  badges: { pending: 'glass-badge-default', in_progress: 'glass-badge-info', completed: 'glass-badge-success', cancelled: 'glass-badge-default' }
};

const TaskCard = ({ task, onUpdateStatus, onViewDetails, isSelected, onSelect, progress }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    try {
      await api.patch(API_ENDPOINTS.TASK_STATUS(task.id), { status: newStatus });
      onUpdateStatus(task.id, newStatus);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const isOverdue = task.due_date && 
    task.status !== 'completed' && 
    task.status !== 'cancelled' && 
    new Date(task.due_date) < new Date();

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div 
      className={`glass-card card-hover fade-in-up ${isSelected ? 'selected-task' : ''}`} 
      style={{ animationDelay: `${task.id * 50}ms` }}
    >
      <div className="glass-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(task.id)}
            className="task-checkbox"
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: '1rem' }}>{task.title}</strong>
            <span className={`glass-badge ${PRIORITY_CONFIG.badges[task.priority]}`}>{PRIORITY_CONFIG.labels[task.priority]}</span>
            <span className={`glass-badge ${STATUS_CONFIG.badges[task.status]}`}>{STATUS_CONFIG.labels[task.status]}</span>
            {isOverdue && (
              <span className="glass-badge glass-badge-danger" style={{ marginLeft: 8 }}>
                Overdue
              </span>
            )}
          </div>
          {task.description && (
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>{task.description}</p>
          )}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            {task.due_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon icon="lucide:calendar" style={{ fontSize: 12 }}></Icon>
                Due {formatDate(task.due_date)}
              </span>
            )}
            {task.assigned_by_name && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon icon="lucide:user" style={{ fontSize: 12 }}></Icon>
                {task.assigned_by_name}
              </span>
            )}
          </div>
          {progress !== undefined && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 4, backgroundColor: 'var(--bg-dim)', borderRadius: 2, marginTop: 4 }}>
                <div 
                  style={{ 
                    height: '100%', 
                    backgroundColor: 'var(--primary)', 
                    borderRadius: 2,
                    width: `${progress}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="glass-select"
            style={{ minWidth: 130 }}
            disabled={isUpdating}
          >
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {task.status !== 'completed' && task.status !== 'cancelled' && (
            <button
              className="glass-btn glass-btn-sm glass-btn-primary"
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
            >
              <Icon icon="lucide:check" style={{ marginRight: 4, fontSize: 12 }}></Icon>
              Complete
            </button>
          )}
          <button
            className="glass-btn glass-btn-sm glass-btn-secondary"
            onClick={() => onViewDetails(task)}
            style={{ marginLeft: 8 }}
          >
            <Icon icon="lucide:eye" style={{ marginRight: 4, fontSize: 12 }}></Icon>
            Details
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskDetailsModal = ({ task, onClose, onViewHistory }) => {
  if (!task) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'var(--warning)',
      in_progress: 'var(--info)',
      completed: 'var(--success)',
      cancelled: 'var(--danger)'
    };
    return colors[status] || 'var(--text)';
  };

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header">
          <h2 className="glass-modal-title">{task.title}</h2>
          <button className="glass-modal-close" onClick={onClose}>
            <Icon icon="lucide:x" />
          </button>
        </div>
        <div className="glass-modal-body">
          <div className="task-details">
            <div className="task-info">
              <div className="info-row">
                <span className="label">Priority:</span>
                <span className={`glass-badge ${PRIORITY_CONFIG.badges[task.priority]}`}>
                  {PRIORITY_CONFIG.labels[task.priority]}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Status:</span>
                <span 
                  className={`glass-badge ${STATUS_CONFIG.badges[task.status]}`}
                  style={{ color: getStatusColor(task.status) }}
                >
                  {STATUS_CONFIG.labels[task.status]}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Due:</span>
                <span>{formatDate(task.due_date)}</span>
              </div>
              <div className="info-row">
                <span className="label">Assigned by:</span>
                <span>{task.assigned_by_name || 'Unknown'}</span>
              </div>
              <div className="info-row">
                <span className="label">Created:</span>
                <span>{formatDate(task.created_at)}</span>
              </div>
              <div className="info-row">
                <span className="label">Updated:</span>
                <span>{formatDate(task.updated_at)}</span>
              </div>
            </div>
            
            {task.description && (
              <div className="task-description">
                <h3>Description</h3>
                <p>{task.description}</p>
              </div>
            )}
            
            {task.notes && (
              <div className="task-notes">
                <h3>Notes</h3>
                <p>{task.notes}</p>
              </div>
            )}
          </div>
        </div>
        <div className="glass-modal-footer" style={{ justifyContent: 'space-between' }}>
          <button 
            className="glass-btn glass-btn-sm glass-btn-ghost"
            onClick={() => {
              onClose();
              onViewHistory(task);
            }}
          >
            <Icon icon="lucide:clock" style={{ marginRight: 4 }} />
            View History
          </button>
          <button className="glass-btn glass-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskHistoryModal = ({ task, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (task) {
      api.get(API_ENDPOINTS.TASK_HISTORY(task.id))
        .then(res => setHistory(res.data))
        .catch(err => console.error('Failed to load task history:', err))
        .finally(() => setLoading(false));
    }
  }, [task]);

  if (!task) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header">
          <h2 className="glass-modal-title">{task.title} - History</h2>
          <button className="glass-modal-close" onClick={onClose}>
            <Icon icon="lucide:x" />
          </button>
        </div>
        <div className="glass-modal-body">
          {loading ? (
            <div className="glass-loading">
              <div className="spinner" />
              <span>Loading history...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="glass-empty">
              <Icon icon="lucide:clock" style={{ fontSize: 48, opacity: 0.4 }}></Icon>
              <h3>No activity yet</h3>
              <p>This task has no recorded history.</p>
            </div>
          ) : (
            <div className="task-history">
              {history.map((entry, idx) => (
                <div key={idx} className="history-entry">
                  <div className="history-header">
                    <span className="history-user">{entry.user_name}</span>
                    <span className="history-date">{formatDate(entry.created_at)}</span>
                  </div>
                  <div className="history-action">
                    {entry.action}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-modal-footer">
          <button className="glass-btn glass-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskTemplateModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      api.get(API_ENDPOINTS.TASK_TEMPLATES)
        .then(res => setTemplates(res.data))
        .catch(err => console.error('Failed to load templates:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header">
          <h2 className="glass-modal-title">Task Templates</h2>
          <button className="glass-modal-close" onClick={onClose}>
            <Icon icon="lucide:x" />
          </button>
        </div>
        <div className="glass-modal-body">
          {loading ? (
            <div className="glass-loading">
              <div className="spinner" />
              <span>Loading templates...</span>
            </div>
          ) : templates.length === 0 ? (
            <div className="glass-empty">
              <Icon icon="lucide:file-text" style={{ fontSize: 48, opacity: 0.4 }}></Icon>
              <h3>No templates found</h3>
              <p>Create your first task template to get started.</p>
            </div>
          ) : (
            <div className="template-grid">
              {templates.map(template => (
                <div 
                  key={template.id} 
                  className="template-card glass-panel card-hover"
                  onClick={() => {
                    onSelectTemplate(template);
                    onClose();
                  }}
                >
                  <div className="template-header">
                    <h3>{template.name}</h3>
                    <span className={`glass-badge ${PRIORITY_CONFIG.badges[template.priority]}`}>
                      {PRIORITY_CONFIG.labels[template.priority]}
                    </span>
                  </div>
                  {template.description && (
                    <p className="template-description">{template.description}</p>
                  )}
                  <div className="template-footer">
                    <span className="template-count">
                      {template.task_count} tasks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="glass-modal-footer">
          <button className="glass-btn glass-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const CalendarView = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getTasksForDate = (day) => {
    if (!day) return [];
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      const taskDateStr = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
      return taskDateStr === dateStr;
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={handlePrevMonth}>
          <Icon icon="lucide:chevron-left" />
        </button>
        <h3>{monthName}</h3>
        <button className="calendar-nav" onClick={handleNextMonth}>
          <Icon icon="lucide:chevron-right" />
        </button>
      </div>
      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        {days.map((day, idx) => {
          const dayTasks = getTasksForDate(day);
          const isToday = day === new Date().getDate() && 
                         currentDate.getMonth() === new Date().getMonth() && 
                         currentDate.getFullYear() === new Date().getFullYear();
          
          return (
            <div 
              key={idx} 
              className={`calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => day && setSelectedDate(day)}
            >
              {day && (
                <>
                  <div className="day-number">{day}</div>
                  {dayTasks.length > 0 && (
                    <div className="day-tasks">
                      {dayTasks.slice(0, 2).map(task => (
                        <div 
                          key={task.id} 
                          className="day-task"
                          style={{ backgroundColor: task.priority === 'high' ? 'var(--danger)' : task.priority === 'medium' ? 'var(--warning)' : 'var(--info)' }}
                          title={task.title}
                        />
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="day-task-more">+{dayTasks.length - 2}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CreateTaskModal = ({ isOpen, onClose, onCreate, teamMembers }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    notes: '',
    assigned_to: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.assigned_to) {
      setError('Please select an employee to assign this task to');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(API_ENDPOINTS.CREATE_TASK, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date || null,
        notes: formData.notes,
        assigned_to: formData.assigned_to
      });
      onCreate();
      setFormData({ title: '', description: '', priority: 'medium', due_date: '', notes: '', assigned_to: '' });
      onClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
        <div className="glass-modal-header">
          <h2 className="glass-modal-title">Create New Task</h2>
          <button className="glass-modal-close" onClick={onClose}>
            <Icon icon="lucide:x" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="glass-modal-body">
            {error && (
              <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: 'var(--error)', fontSize: '0.85rem', marginBottom: 12 }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="glass-input"
                placeholder="Enter task title"
              />
            </div>
            <div className="form-group">
              <label>Assign to *</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="glass-select"
                required
              >
                <option value="">Select employee...</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="glass-textarea"
                rows="3"
                placeholder="Enter task description"
              />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="glass-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="glass-input"
              />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="glass-textarea"
                rows="2"
                placeholder="Additional notes"
              />
            </div>
          </div>
          <div className="glass-modal-footer">
            <button
              type="button"
              className="glass-btn glass-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-btn glass-btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });
  const [bulkStatus, setBulkStatus] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [stats, setStats] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [toast, setToast] = useState(null);
  const [sortBy, setSortBy] = useState('due_date');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        mine: 'true',
        page: page.toString(),
        limit: '20'
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`${API_ENDPOINTS.TASKS}?${params}`);
      let newTasks = response.data;
      
      if (page === 1) {
        setTasks(newTasks);
      } else {
        setTasks(prev => [...prev, ...newTasks]);
      }
      
      setHasMore(newTasks.length === 20);
    } catch (err) {
      setError('Failed to load tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get(API_ENDPOINTS.TASK_STATS);
      setStats(response.data);
    } catch (err) {
      // Stats are optional
    }
  }, []);

  const fetchUserRole = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const emp = response.data;
      setUserRole(emp.role);
      setTeamMembers(emp.team_members || []);
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchStats();
    fetchUserRole();
  }, [fetchTasks, fetchStats, fetchUserRole]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedTasks(new Set(tasks.map(t => t.id)));
      }
      if (e.key === 'Delete' && selectedTasks.size > 0) {
        e.preventDefault();
        setShowDeleteConfirm(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTasks, tasks]);

  const handleUpdateStatus = (taskId, newStatus) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const handleCreateTask = () => {
    setShowCreateModal(false);
    showToast('Task created successfully', 'success');
    fetchTasks();
  };

  const handleViewDetails = (task) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  const handleViewHistory = (task) => {
    setSelectedTask(task);
    setShowHistoryModal(true);
  };

  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedTasks(new Set(tasks.map(t => t.id)));
  };

  const handleBulkUpdateStatus = async () => {
    if (!bulkStatus || selectedTasks.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedTasks).map(taskId => 
          api.patch(API_ENDPOINTS.TASK_STATUS(taskId), { status: bulkStatus })
        )
      );
      setTasks(prev => prev.map(task => 
        selectedTasks.has(task.id) ? { ...task, status: bulkStatus } : task
      ));
      const count = selectedTasks.size;
      setSelectedTasks(new Set());
      setBulkStatus('');
      showToast(`Updated ${count} task${count !== 1 ? 's' : ''} to ${STATUS_CONFIG.labels[bulkStatus]}`, 'success');
    } catch (error) {
      showToast('Failed to update tasks');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return;
    try {
      await Promise.all(
        Array.from(selectedTasks).map(taskId => 
          api.delete(`${API_ENDPOINTS.TASKS}/${taskId}`)
        )
      );
      setTasks(prev => prev.filter(task => !selectedTasks.has(task.id)));
      const count = selectedTasks.size;
      setSelectedTasks(new Set());
      setShowDeleteConfirm(false);
      showToast(`Deleted ${count} task${count !== 1 ? 's' : ''}`, 'success');
    } catch (error) {
      showToast('Failed to delete tasks');
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  const filteredTasks = tasks
    .filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'due_date') {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'created_at') {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'priority') {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
      }
      return 0;
    });

  const canCreateTasks = userRole === 'manager' && teamMembers.length > 0;

  if (loading && page === 1) {
    return (
      <div className="glass-loading">
        <div className="spinner" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-error">
        <Icon icon="lucide:alert-circle" style={{ fontSize: 48, opacity: 0.4 }}></Icon>
        <h3>Error Loading Tasks</h3>
        <p>{error}</p>
        <button className="glass-btn glass-btn-primary" onClick={fetchTasks}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {showDeleteConfirm && (
        <div className="glass-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="glass-modal" onClick={(e) => e.stopPropagation()}>
            <div className="glass-modal-header">
              <h2 className="glass-modal-title">Confirm Delete</h2>
              <button className="glass-modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <Icon icon="lucide:x" />
              </button>
            </div>
            <div className="glass-modal-body">
              <p>Are you sure you want to delete {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''}?</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>This action cannot be undone.</p>
            </div>
            <div className="glass-modal-footer">
              <button className="glass-btn glass-btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="glass-btn glass-btn-danger" onClick={handleBulkDelete}>
                Delete {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-page-header">
        <div>
          <h1>My Tasks</h1>
          <p className="subtitle" style={{ color: 'var(--text-dim)' }}>Tasks assigned to you by your manager</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {canCreateTasks && (
            <button
              className="glass-btn glass-btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Icon icon="lucide:plus" style={{ marginRight: 4 }}></Icon>
              Create Task
            </button>
          )}
          <div className="view-mode-toggle" style={{ display: 'flex', gap: 4 }}>
            <button
              className={`glass-btn glass-btn-sm ${viewMode === 'list' ? 'glass-btn-primary' : 'glass-btn-secondary'}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <Icon icon="lucide:list" />
            </button>
            <button
              className={`glass-btn glass-btn-sm ${viewMode === 'calendar' ? 'glass-btn-primary' : 'glass-btn-secondary'}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar view"
            >
              <Icon icon="lucide:calendar" />
            </button>
          </div>
        </div>
      </div>

      {stats && (
        <div className="bulk-actions" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div><span className="stats-label">Total:</span><span className="stats-value">{stats.total}</span></div>
            <div><span className="stats-label">Completed:</span><span className="stats-value">{stats.completed}</span></div>
            <div><span className="stats-label">In Progress:</span><span className="stats-value">{stats.in_progress}</span></div>
            <div><span className="stats-label">Pending:</span><span className="stats-value">{stats.pending}</span></div>
            <div><span className="stats-label">Rate:</span><span className="stats-value">{stats.completion_rate}%</span></div>
          </div>
        </div>
      )}

      {selectedTasks.size > 0 && (
        <div className="bulk-actions">
          <span style={{ color: 'var(--text)' }}>
            {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="glass-select"
            style={{ minWidth: 120 }}
          >
            <option value="">Change status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {bulkStatus && (
            <button className="glass-btn glass-btn-sm glass-btn-success" onClick={handleBulkUpdateStatus}>
              Apply
            </button>
          )}
          <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            <Icon icon="lucide:trash" style={{ marginRight: 4, fontSize: 12 }}></Icon>
            Delete
          </button>
          <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => setSelectedTasks(new Set())}>
            Cancel
          </button>
        </div>
      )}

      <div className="task-filters" style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="glass-select"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Priority</label>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="glass-select"
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Sort</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="glass-select"
          >
            <option value="due_date">Due Date</option>
            <option value="created_at">Created</option>
            <option value="priority">Priority</option>
          </select>
        </div>
        <div className="filter-group" style={{ flex: 1, minWidth: 200 }}>
          <label>Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="glass-input"
            placeholder="Search tasks..."
          />
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <CalendarView tasks={filteredTasks} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
              onChange={handleSelectAll}
              className="task-checkbox"
            />
            <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Select all ({filteredTasks.length} tasks)</span>
          </div>
          {filteredTasks.length === 0 ? (
            <div className="glass-empty">
              <Icon icon="lucide:check-square" style={{ fontSize: 48, opacity: 0.4 }}></Icon>
              <h3>No tasks found</h3>
              <p>{tasks.length === 0 ? 'No tasks assigned yet.' : 'No tasks match your current filters.'}</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onUpdateStatus={handleUpdateStatus}
                onViewDetails={handleViewDetails}
                isSelected={selectedTasks.has(task.id)}
                onSelect={handleSelectTask}
              />
            ))
          )}
          
          {hasMore && (
            <div className="load-more-container" style={{ textAlign: 'center', padding: '20px 0' }}>
              <button 
                className="glass-btn glass-btn-primary" 
                onClick={loadMore}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More Tasks'}
              </button>
            </div>
          )}
        </div>
      )}

      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateTask}
        teamMembers={teamMembers}
      />

      <TaskDetailsModal
        task={selectedTask}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTask(null);
        }}
        onViewHistory={handleViewHistory}
      />

      <TaskHistoryModal
        task={selectedTask}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'];
const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1'];

const statusLabels = {
  signed_in: { label: 'Signed In', color: '#22c55e', icon: '🟢' },
  signed_out: { label: 'Signed Out', color: '#6366f1', icon: '🔵' },
  not_signed_in: { label: 'Not Signed In', color: '#f59e0b', icon: '🟡' },
  on_leave: { label: 'On Leave', color: '#8b5cf6', icon: '🟣' },
};

const getAttendanceTrend = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    day,
    attendance: Math.floor(Math.random() * 20 + 80),
    previous: Math.floor(Math.random() * 20 + 75),
  }));
};

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/personnel/dashboard', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard data');
      }
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-icon">⚠</div>
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={() => fetchDashboardData()} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-empty">
        <div className="empty-icon">📊</div>
        <h3>No Data Available</h3>
        <p>Your dashboard data is still loading. Please check back later.</p>
      </div>
    );
  }

  const { employee: empData, today, monthlyStats, leaveBalance, upcomingTasks, recentNotifications } = dashboardData;

  const statusInfo = statusLabels[today.status] || statusLabels.not_signed_in;

  const leaveData = [
    { name: 'Annual', value: parseFloat(leaveBalance.annual) || 0, color: '#6366f1' },
    { name: 'Sick', value: parseFloat(leaveBalance.sick) || 0, color: '#f59e0b' },
    { name: 'Casual', value: parseFloat(leaveBalance.casual) || 0, color: '#22c55e' },
  ];

  const attendanceTrend = getAttendanceTrend();

  return (
    <div className="employee-dashboard">
      <div className="dashboard-greeting">
        <div className="greeting-avatar">{empData.name?.charAt(0) || 'U'}</div>
        <div className="greeting-text">
          <h1>Welcome back, {empData.name?.split(' ')[0] || 'User'}</h1>
          <p>{empData.position || empData.department || 'Employee'} &middot; {formatDate(new Date())}</p>
        </div>
        <div className="greeting-badge">
          <span className={`status-dot ${today.status}`}></span>
          {statusInfo.label}
        </div>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks</button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card gradient-purple">
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                <div className="stat-label">Today's Status</div>
                <div className="stat-value">{statusInfo.label}</div>
                {today.attendance && (
                  <div className="stat-details">
                    <span>In: {new Date(today.attendance.sign_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    {today.attendance.sign_out_time && (
                      <span>Out: {new Date(today.attendance.sign_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="stat-card-icon">{today.status === 'signed_in' ? '✓' : today.status === 'signed_out' ? '↩' : '⏰'}</div>
            </div>

            <div className="stat-card gradient-blue">
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                <div className="stat-label">Attendance Rate</div>
                <div className="stat-value">{monthlyStats.attendanceRate}%</div>
                <div className="stat-bar">
                  <div className="stat-bar-fill" style={{ width: `${monthlyStats.attendanceRate}%` }}></div>
                </div>
                <div className="stat-details">{monthlyStats.presentDays} of {monthlyStats.totalDays} days</div>
              </div>
              <div className="stat-card-icon">📈</div>
            </div>

            <div className="stat-card gradient-green">
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                <div className="stat-label">Annual Leave</div>
                <div className="stat-value">{leaveBalance.annual}</div>
                <div className="stat-details">days remaining</div>
              </div>
              <div className="stat-card-icon">🏖</div>
            </div>

            <div className="stat-card gradient-pink">
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                <div className="stat-label">Sick Leave</div>
                <div className="stat-value">{leaveBalance.sick}</div>
                <div className="stat-details">days available</div>
              </div>
              <div className="stat-card-icon">💊</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Attendance Trend</h3>
              <p className="chart-subtitle">Weekly attendance rate comparison</p>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={attendanceTrend}>
                    <defs>
                      <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="#71717a" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#71717a" tick={{ fontSize: 12 }} domain={[60, 100]} />
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="attendance" stroke="#6366f1" fillOpacity={1} fill="url(#colorAtt)" strokeWidth={2} />
                    <Line type="monotone" dataKey="previous" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-card">
              <h3>Leave Distribution</h3>
              <p className="chart-subtitle">Your available leave balance</p>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={leaveData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {leaveData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'tasks' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2>Upcoming Tasks</h2>
            <button className="btn-outline-sm" onClick={() => navigate('/personnel/my-tasks')}>View All</button>
          </div>
          {upcomingTasks.length > 0 ? (
            <div className="tasks-grid">
              {upcomingTasks.map((task, idx) => (
                <div key={task.id} className="task-card" style={{ '--task-accent': COLORS[idx % COLORS.length] }}>
                  <div className="task-card-accent"></div>
                  <div className="task-card-content">
                    <div className="task-card-header">
                      <h4>{task.title}</h4>
                      <span className={`task-priority-badge ${task.priority}`}>{task.priority}</span>
                    </div>
                    <p className="task-card-desc">{task.description}</p>
                    <div className="task-card-footer">
                      <span className="task-due">Due {formatDate(task.due_date)}</span>
                      <span className="task-status-badge">{task.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <p>No upcoming tasks. Great job!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2>Recent Activity</h2>
          </div>
          {recentNotifications.length > 0 ? (
            <div className="activity-timeline">
              {recentNotifications.map((notification, idx) => (
                <div key={notification.id} className="timeline-item">
                  <div className="timeline-dot" style={{ background: COLORS[idx % COLORS.length] }}></div>
                  <div className="timeline-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="timeline-time">{formatDate(notification.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔔</div>
              <p>No recent notifications.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="section-card">
          <div className="section-card-header">
            <h2>Personal Goals</h2>
          </div>
          <div className="goals-grid">
            <div className="goal-card">
              <div className="goal-icon">🎯</div>
              <div className="goal-body">
                <div className="goal-header-row">
                  <h4>Performance Improvement</h4>
                  <span className="goal-percent">75%</span>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill" style={{ width: '75%' }}></div>
                </div>
                <p className="goal-desc">Focus on improving attendance and completing tasks on time</p>
              </div>
            </div>
            <div className="goal-card">
              <div className="goal-icon">📚</div>
              <div className="goal-body">
                <div className="goal-header-row">
                  <h4>Professional Development</h4>
                  <span className="goal-percent">60%</span>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill fill-orange" style={{ width: '60%' }}></div>
                </div>
                <p className="goal-desc">Complete 3 training courses this quarter</p>
              </div>
            </div>
            <div className="goal-card">
              <div className="goal-icon">🤝</div>
              <div className="goal-body">
                <div className="goal-header-row">
                  <h4>Team Collaboration</h4>
                  <span className="goal-percent">90%</span>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill fill-green" style={{ width: '90%' }}></div>
                </div>
                <p className="goal-desc">Maintain active participation in team meetings and projects</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6'];

const statusLabels = {
  signed_in: { label: 'Signed In', color: '#22c55e', icon: 'lucide:log-in' },
  signed_out: { label: 'Signed Out', color: '#6366f1', icon: 'lucide:log-out' },
  not_signed_in: { label: 'Not Signed In', color: '#f59e0b', icon: 'lucide:clock' },
  on_leave: { label: 'On Leave', color: '#8b5cf6', icon: 'lucide:calendar-off' },
};

const getAttendanceTrend = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    day,
    attendance: Math.floor(Math.random() * 20 + 80),
    previous: Math.floor(Math.random() * 20 + 75),
  }));
};

const tooltipStyle = {
  background: 'rgba(24,24,27,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
};

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const todayDow = new Date().getDay();
  const isWeekend = todayDow === 5 || todayDow === 6;
  const isHoliday = isWeekend;

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
      <div className="glass-loading">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-alert glass-alert-danger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 32, textAlign: 'center' }}>
        <span className="iconify" data-icon="lucide:alert-triangle" style={{ fontSize: 32 }}></span>
        <h3>Error Loading Dashboard</h3>
        <p style={{ color: 'var(--text-dim)' }}>{error}</p>
        <button onClick={() => fetchDashboardData()} className="glass-btn glass-btn-primary">
          <span className="iconify" data-icon="lucide:refresh-cw" style={{ marginRight: 6 }}></span>
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="glass-empty">
        <span className="iconify" data-icon="lucide:bar-chart-3" style={{ fontSize: 48, opacity: 0.4 }}></span>
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
      <div className="dashboard-greeting fade-in-up">
        <div className="greeting-avatar">{empData.name?.charAt(0) || 'U'}</div>
        <div className="greeting-text">
          <h1>{isHoliday ? '🎉 Happy holiday, ' + (empData.name?.split(' ')[0] || 'User') + '! 🎉' : 'Welcome back, ' + (empData.name?.split(' ')[0] || 'User')}</h1>
          <p>{isHoliday ? 'Enjoy your well-deserved break! 🎊' : (empData.position || empData.department || 'Employee') + ' \u00B7 ' + formatDate(new Date())}</p>
        </div>
        <div className="greeting-badge">
          <span className={`status-dot ${isHoliday ? 'holiday' : today.status}`}></span>
          {isHoliday ? '🎉 Holiday' : statusInfo.label}
        </div>
      </div>

      <div className="dashboard-tabs fade-in-up delay-1">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <span className="iconify" data-icon="lucide:layout-dashboard" style={{ marginRight: 6, fontSize: 14 }}></span>
          Overview
        </button>
        <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>
          <span className="iconify" data-icon="lucide:list-todo" style={{ marginRight: 6, fontSize: 14 }}></span>
          Tasks
        </button>
        <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          <span className="iconify" data-icon="lucide:activity" style={{ marginRight: 6, fontSize: 14 }}></span>
          Activity
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card gradient-purple card-hover fade-in-up delay-1">
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                <div className="stat-label">{isHoliday ? '🎉 Enjoy your holiday! 🎉' : "Today's Status"}</div>
                <div className="stat-value">{isHoliday ? 'Holiday! 🎉' : statusInfo.label}</div>
                {today.attendance && (
                  <div className="stat-details">
                    <span>
                      <span className="iconify" data-icon="lucide:log-in" style={{ marginRight: 4, fontSize: 12 }}></span>
                      In: {new Date(today.attendance.sign_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {today.attendance.sign_out_time && (
                      <span>
                        <span className="iconify" data-icon="lucide:log-out" style={{ marginRight: 4, fontSize: 12 }}></span>
                        Out: {new Date(today.attendance.sign_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className="iconify stat-card-icon" data-icon={statusInfo.icon}></span>
            </div>

            <div className={`stat-card ${isHoliday ? 'gradient-holiday' : 'gradient-blue'} card-hover fade-in-up delay-2`}>
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                {isHoliday ? (
                  <>
                    <div className="stat-label">🎉 Holiday Time</div>
                    <div className="stat-value holiday-text">🎉 Holiday!</div>
                    <div className="stat-details" style={{ color: '#fbbf24' }}>Enjoy your day off!</div>
                  </>
                ) : (
                  <>
                    <div className="stat-label">Attendance Rate</div>
                    <div className="stat-value">{monthlyStats.attendanceRate}%</div>
                    <div className="stat-bar">
                      <div className="stat-bar-fill" style={{ width: `${monthlyStats.attendanceRate}%` }}></div>
                    </div>
                    <div className="stat-details">{monthlyStats.signedDays} of {monthlyStats.totalDays} days</div>
                  </>
                )}
              </div>
              <span className="iconify stat-card-icon" data-icon={isHoliday ? 'lucide:party-popper' : 'lucide:trending-up'}></span>
            </div>

            <div className="stat-card gradient-green card-hover fade-in-up delay-3">
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                <div className="stat-label">Annual Leave</div>
                <div className="stat-value">{leaveBalance.annual}</div>
                <div className="stat-details">days remaining</div>
              </div>
              <span className="iconify stat-card-icon" data-icon="lucide:umbrella"></span>
            </div>

            <div className="stat-card gradient-pink card-hover fade-in-up delay-4">
              <div className="stat-card-bg"></div>
              <div className="stat-card-content">
                <div className="stat-label">Sick Leave</div>
                <div className="stat-value">{leaveBalance.sick}</div>
                <div className="stat-details">days available</div>
              </div>
              <span className="iconify stat-card-icon" data-icon="lucide:heart-pulse"></span>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card card-hover fade-in-up delay-2">
              <h3>Attendance Trend</h3>
              <p className="chart-subtitle">Weekly attendance rate comparison</p>
              {isHoliday ? (
                <div className="glass-empty" style={{ height: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div className="holiday-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                  <h3>No work today!</h3>
                  <p>Happy holiday!</p>
                </div>
              ) : (
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
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="attendance" stroke="#6366f1" fillOpacity={1} fill="url(#colorAtt)" strokeWidth={2} />
                    <Line type="monotone" dataKey="previous" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="chart-card card-hover fade-in-up delay-3">
              <h3>Leave Distribution</h3>
              <p className="chart-subtitle">Your available leave balance</p>
              {isHoliday ? (
                <div className="glass-empty" style={{ height: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <div className="holiday-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                  <h3>No work today!</h3>
                  <p>Happy holiday!</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={leaveData.filter(d => d.value > 0)}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={4} dataKey="value"
                    >
                      {leaveData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                      formatter={(value) => <span style={{ color: '#a1a1aa' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="section-card glass-card card-hover fade-in-up delay-3">
            <div className="section-card-header glass-card-header">
              <h2>Personal Goals</h2>
            </div>
            <div className="goals-grid glass-card-body">
              <div className="goal-card glass-detail-row">
                <span className="iconify goal-icon" data-icon="lucide:target" style={{ fontSize: 28, color: '#818cf8' }}></span>
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
              <div className="goal-card glass-detail-row">
                <span className="iconify goal-icon" data-icon="lucide:book-open" style={{ fontSize: 28, color: '#f97316' }}></span>
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
              <div className="goal-card glass-detail-row">
                <span className="iconify goal-icon" data-icon="lucide:users" style={{ fontSize: 28, color: '#22c55e' }}></span>
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
        </>
      )}

      {activeTab === 'tasks' && (
        <div className="section-card glass-card fade-in-up delay-2">
          <div className="section-card-header glass-card-header">
            <h2>Upcoming Tasks</h2>
            <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => navigate('/personnel/my-tasks')}>
              <span className="iconify" data-icon="lucide:arrow-right" style={{ marginRight: 4, fontSize: 12 }}></span>
              View All
            </button>
          </div>
          {upcomingTasks.length > 0 ? (
            <div className="tasks-grid glass-card-body">
              {upcomingTasks.map((task, idx) => (
                <div key={task.id} className="task-card glass-card card-hover fade-in-up" style={{ '--task-accent': COLORS[idx % COLORS.length] }}>
                  <div className="task-card-accent" style={{ background: COLORS[idx % COLORS.length] }}></div>
                  <div className="task-card-content">
                    <div className="task-card-header">
                      <h4>{task.title}</h4>
                      <span className={`glass-badge ${task.priority === 'high' ? 'glass-badge-danger' : task.priority === 'medium' ? 'glass-badge-warning' : 'glass-badge-default'}`}>{task.priority}</span>
                    </div>
                    <p className="task-card-desc">{task.description}</p>
                    <div className="task-card-footer">
                      <span className="task-due" style={{ color: 'var(--text-dim)' }}>
                        <span className="iconify" data-icon="lucide:calendar" style={{ marginRight: 4, fontSize: 11 }}></span>
                        Due {formatDate(task.due_date)}
                      </span>
                      <span className={`glass-badge ${task.status === 'completed' ? 'glass-badge-success' : task.status === 'in_progress' ? 'glass-badge-info' : 'glass-badge-default'}`}>{task.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-empty glass-card-body">
              <span className="iconify" data-icon="lucide:check-circle" style={{ fontSize: 40, opacity: 0.4 }}></span>
              <p>No upcoming tasks. Great job!</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="section-card glass-card fade-in-up delay-2">
          <div className="section-card-header glass-card-header">
            <h2>Recent Activity</h2>
          </div>
          {recentNotifications.length > 0 ? (
            <div className="activity-timeline glass-card-body">
              {recentNotifications.map((notification, idx) => (
                <div key={notification.id} className="timeline-item glass-detail-row">
                  <div className="timeline-dot" style={{ background: COLORS[idx % COLORS.length] }}></div>
                  <div className="timeline-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="timeline-time" style={{ color: 'var(--text-dim)' }}>
                      <span className="iconify" data-icon="lucide:clock" style={{ marginRight: 4, fontSize: 11 }}></span>
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-empty glass-card-body">
              <span className="iconify" data-icon="lucide:bell" style={{ fontSize: 40, opacity: 0.3 }}></span>
              <p>No recent notifications.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

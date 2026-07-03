// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper function to format dates as "MMM dd, yyyy"
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
};

export default function EmployeeDashboard() {
  const { employee } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <div className="error-icon">⚠️</div>
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

  return (
    <div className="employee-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Welcome back, {empData.name}!</h1>
          <p>Here's your personal dashboard overview</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Today's Status</h3>
            <p className="stat-value">{today.status || 'Not signed in'}</p>
            {today.status === 'signed_in' && (
              <div className="sign-in-time">
                <p>Sign In: {today.sign_in || 'N/A'}</p>
                <p>Sign Out: {today.sign_out || 'Pending'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Monthly Attendance</h3>
            <p className="stat-value">{monthlyStats.attendanceRate}%</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${monthlyStats.attendanceRate}%` }}></div>
            </div>
            <p className="stat-subtext">
              {monthlyStats.presentDays} days present out of {monthlyStats.totalDays}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏖️</div>
          <div className="stat-content">
            <h3>Leave Balance</h3>
            <p className="stat-value">{leaveBalance.annual} days</p>
            <p className="stat-subtext">Annual Leave</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🤒</div>
          <div className="stat-content">
            <h3>Sick Leave</h3>
            <p className="stat-value">{leaveBalance.sick} days</p>
            <p className="stat-subtext">Available</p>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="section">
        <h2>Upcoming Tasks</h2>
        {upcomingTasks.length > 0 ? (
          <div className="tasks-list">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="task-item">
                <div className="task-header">
                  <h3>{task.title}</h3>
                  <span className="task-priority">{task.priority}</span>
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-footer">
                   <span className="task-date">Due: {formatDate(task.due_date)}</span>
                  <span className="task-status">{task.status}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-tasks">
            <p>No upcoming tasks at the moment. Great job staying on top of your work!</p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="section">
        <h2>Recent Activity</h2>
        {recentNotifications.length > 0 ? (
          <div className="activity-list">
            {recentNotifications.map((notification) => (
              <div key={notification.id} className="activity-item">
                <div className="activity-icon">📢</div>
                <div className="activity-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                   <span className="activity-time">{formatDate(notification.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-activity">
            <p>No recent activity notifications.</p>
          </div>
        )}
      </div>

      {/* Personal Goals */}
      <div className="section">
        <h2>Personal Goals</h2>
        <div className="goals-container">
          <div className="goal-card">
            <div className="goal-header">
              <h3>Performance Improvement</h3>
              <span className="goal-progress">75%</span>
            </div>
            <div className="goal-progress-bar">
              <div className="goal-progress-fill" style={{ width: '75%' }}></div>
            </div>
            <p className="goal-description">Focus on improving attendance and completing tasks on time</p>
          </div>
          <div className="goal-card">
            <div className="goal-header">
              <h3>Professional Development</h3>
              <span className="goal-progress">60%</span>
            </div>
            <div className="goal-progress-bar">
              <div className="goal-progress-fill" style={{ width: '60%' }}></div>
            </div>
            <p className="goal-description">Complete 3 training courses this quarter</p>
          </div>
        </div>
      </div>
    </div>
  );
}
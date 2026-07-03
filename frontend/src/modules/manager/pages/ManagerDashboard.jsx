// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ManagerDashboard() {
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
      const response = await fetch('/api/manager/team', {
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
        <p>Loading team dashboard...</p>
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

  const { team, summary, performance_metrics, task_completion, engagement_metrics } = dashboardData;

  return (
    <div className="manager-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Team Dashboard</h1>
          <p>Manage and monitor your team's performance</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Total Team Members</h3>
            <p className="stat-value">{summary.total_members}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Present Today</h3>
            <p className="stat-value">{summary.signed_in}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🕐</div>
          <div className="stat-content">
            <h3>On Leave Today</h3>
            <p className="stat-value">{summary.on_leave}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>Absent Today</h3>
            <p className="stat-value">{summary.absent}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏠</div>
          <div className="stat-content">
            <h3>Department</h3>
            <p className="stat-value">{summary.department_name}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="section">
        <h2>Team Performance</h2>
        <div className="metrics-grid">
          <div className="metric-card">
            <h3>Average Days Worked</h3>
            <p className="metric-value">{performance_metrics.avg_days_worked.toFixed(1)}</p>
            <p className="metric-subtext">This period</p>
          </div>

          <div className="metric-card">
            <h3>Average Missing Sign-outs</h3>
            <p className="metric-value">{performance_metrics.avg_missing_sign_outs.toFixed(1)}</p>
            <p className="metric-subtext">This period</p>
          </div>

          <div className="metric-card">
            <h3>Office Days</h3>
            <p className="metric-value">{performance_metrics.avg_office_days.toFixed(1)}</p>
            <p className="metric-subtext">This period</p>
          </div>

          <div className="metric-card">
            <h3>WFH Days</h3>
            <p className="metric-value">{performance_metrics.avg_wfh_days.toFixed(1)}</p>
            <p className="metric-subtext">This period</p>
          </div>

          <div className="metric-card">
            <h3>Task Completion Rate</h3>
            <p className="metric-value">{task_completion.completion_rate}%</p>
            <p className="metric-subtext">
              {task_completion.completed} of {task_completion.total} tasks completed
            </p>
          </div>

          <div className="metric-card">
            <h3>Team Active Rate</h3>
            <p className="metric-value">{engagement_metrics.active_rate}%</p>
            <p className="metric-subtext">
              {engagement_metrics.active_employees} of {engagement_metrics.total_employees} active
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="section">
        <h2>Team Members</h2>
        <div className="team-members">
          {team.map((member) => (
            <div key={member.id} className="team-member-card">
              <div className="member-header">
                <div className="member-info">
                  <h3>{member.name}</h3>
                  <p className="member-role">{member.role}</p>
                </div>
                <div className="member-status">
                  <span className={`status-badge ${member.today_status}`}>
                    {member.today_status}
                  </span>
                </div>
              </div>

              <div className="member-stats">
                <div className="stat-item">
                  <span className="stat-label">Today:</span>
                  <span className="stat-value">{member.today_status}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sign In:</span>
                  <span className="stat-value">{member.today_sign_in || 'N/A'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Sign Out:</span>
                  <span className="stat-value">{member.today_sign_out || 'Pending'}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending Leaves:</span>
                  <span className="stat-value">{member.pending_leave_count}</span>
                </div>
              </div>

              <div className="member-period-stats">
                <div className="stat-item">
                  <span className="stat-label">Days Worked:</span>
                  <span className="stat-value">{member.period_days_worked}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Office Days:</span>
                  <span className="stat-value">{member.period_office_days}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">WFH Days:</span>
                  <span className="stat-value">{member.period_wfh_days}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Missing Sign-outs:</span>
                  <span className="stat-value">{member.period_missing_sign_outs}</span>
                </div>
              </div>

              <div className="member-actions">
                <button className="action-button" onClick={() => navigate(`/personnel/${member.id}`)}>
                  View Profile
                </button>
                <button className="action-button" onClick={() => navigate(`/manager/leave-requests/${member.id}`)}>
                  Leave Requests
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Health */}
      <div className="section">
        <h2>Team Health Overview</h2>
        <div className="health-indicators">
          <div className="indicator-card">
            <h3>Attendance Health</h3>
            <div className="indicator-content">
              <div className="indicator-bar">
                <div className="indicator-fill" style={{ width: '85%' }}></div>
              </div>
              <p className="indicator-text">85% attendance rate - Good performance</p>
            </div>
          </div>

          <div className="indicator-card">
            <h3>Task Completion</h3>
            <div className="indicator-content">
              <div className="indicator-bar">
                <div className="indicator-fill" style={{ width: task_completion.completion_rate }}></div>
              </div>
              <p className="indicator-text">
                {task_completion.completion_rate}% completion rate
              </p>
            </div>
          </div>

          <div className="indicator-card">
            <h3>Team Engagement</h3>
            <div className="indicator-content">
              <div className="indicator-bar">
                <div className="indicator-fill" style={{ width: engagement_metrics.active_rate }}></div>
              </div>
              <p className="indicator-text">
                {engagement_metrics.active_rate}% active rate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
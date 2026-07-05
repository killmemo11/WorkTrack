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
      <div className="glass-loading">
        <div className="spinner" />
        <span>Loading team dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1rem' }}>
        <div className="glass-alert glass-alert-danger">
          <span className="iconify" data-icon="lucide:alert-triangle" style={{ fontSize: '1.5rem' }}></span>
          <div>
            <h3>Error Loading Dashboard</h3>
            <p>{error}</p>
          </div>
        </div>
        <button onClick={() => fetchDashboardData()} className="glass-btn glass-btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="glass-empty">
        <span className="iconify" data-icon="lucide:building-2" style={{ fontSize: '3rem', opacity: 0.5 }}></span>
        <h3>No Data Available</h3>
        <p>Your dashboard data is still loading. Please check back later.</p>
      </div>
    );
  }

  const { team, summary } = dashboardData;
  if (!summary) {
    return (
      <div className="glass-empty">
        <span className="iconify" data-icon="lucide:users" style={{ fontSize: '3rem', opacity: 0.5 }}></span>
        <h3>No Team Data Available</h3>
        <p>You are not assigned to a department. Please contact your administrator.</p>
      </div>
    );
  }
  const performance_metrics = summary.performance_metrics || {};
  const task_completion = summary.task_completion || {};
  const engagement_metrics = summary.engagement_metrics || {};

  const attendanceRate = summary.total_members > 0
    ? Math.round((summary.signed_in / summary.total_members) * 100)
    : 0;

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'signed_in': return 'success';
      case 'on_leave': return 'warning';
      case 'absent': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div>
      {/* Header - Greeting Pattern */}
      <div className="dashboard-greeting fade-in-up">
        <div className="greeting-avatar">{employee?.name?.charAt(0) || 'M'}</div>
        <div className="greeting-text">
          <h1>Team Dashboard</h1>
          <p>{summary.department_name || 'Manager View'} &middot; Manage your team's performance</p>
        </div>
        <div className="greeting-badge">
          <span className={`status-dot ${summary.signed_in > 0 ? 'signed_in' : 'not_signed_in'}`}></span>
          {summary.signed_in > 0 ? `${summary.signed_in} Present` : 'Team Overview'}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card gradient-purple fade-in-up delay-1 card-hover">
          <span className="iconify stat-card-icon" data-icon="lucide:users"></span>
          <div className="stat-card-content">
            <h3>Total Team Members</h3>
            <p className="stat-value">{summary.total_members}</p>
          </div>
        </div>

        <div className="stat-card gradient-green fade-in-up delay-2 card-hover">
          <span className="iconify stat-card-icon" data-icon="lucide:check-circle"></span>
          <div className="stat-card-content">
            <h3>Present Today</h3>
            <p className="stat-value">{summary.signed_in}</p>
          </div>
        </div>

        <div className="stat-card gradient-blue fade-in-up delay-3 card-hover">
          <span className="iconify stat-card-icon" data-icon="lucide:clock"></span>
          <div className="stat-card-content">
            <h3>On Leave Today</h3>
            <p className="stat-value">{summary.on_leave}</p>
          </div>
        </div>

        <div className="stat-card gradient-pink fade-in-up delay-4 card-hover">
          <span className="iconify stat-card-icon" data-icon="lucide:x-circle"></span>
          <div className="stat-card-content">
            <h3>Absent Today</h3>
            <p className="stat-value">{summary.absent}</p>
          </div>
        </div>

        <div className="stat-card gradient-amber fade-in-up delay-5 card-hover">
          <span className="iconify stat-card-icon" data-icon="lucide:building"></span>
          <div className="stat-card-content">
            <h3>Department</h3>
            <p className="stat-value">{summary.department_name}</p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="section">
        <h2>Team Performance</h2>
        <div className="stats-grid">
          <div className="stat-card gradient-blue fade-in-up delay-1 card-hover">
            <h3>Average Days Worked</h3>
            <p className="stat-value">{(performance_metrics.avg_days_worked ?? 0).toFixed(1)}</p>
            <p className="stat-details">This period</p>
          </div>

          <div className="stat-card gradient-blue fade-in-up delay-2 card-hover">
            <h3>Average Missing Sign-outs</h3>
            <p className="stat-value">{(performance_metrics.avg_missing_sign_outs ?? 0).toFixed(1)}</p>
            <p className="stat-details">This period</p>
          </div>

          <div className="stat-card gradient-blue fade-in-up delay-3 card-hover">
            <h3>Office Days</h3>
            <p className="stat-value">{(performance_metrics.avg_office_days ?? 0).toFixed(1)}</p>
            <p className="stat-details">This period</p>
          </div>

          <div className="stat-card gradient-blue fade-in-up delay-4 card-hover">
            <h3>WFH Days</h3>
            <p className="stat-value">{(performance_metrics.avg_wfh_days ?? 0).toFixed(1)}</p>
            <p className="stat-details">This period</p>
          </div>

          <div className="stat-card gradient-blue fade-in-up delay-5 card-hover">
            <h3>Task Completion Rate</h3>
            <p className="stat-value">{task_completion.completion_rate}%</p>
            <p className="stat-details">
              {task_completion.completed} of {task_completion.total} tasks completed
            </p>
          </div>

          <div className="stat-card gradient-blue fade-in-up delay-5 card-hover">
            <h3>Team Active Rate</h3>
            <p className="stat-value">{engagement_metrics.active_rate}%</p>
            <p className="stat-details">
              {engagement_metrics.active_employees} of {engagement_metrics.total_employees} active
            </p>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="section">
        <h2>Team Members</h2>
        <div className="glass-grid">
          {team.map((member) => (
            <div key={member.id} className="glass-card card-hover fade-in-up">
              <div className="glass-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="greeting-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                    {member.name?.charAt(0) || '?'}
                  </div>
                  <div className="member-info">
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.125rem' }}>{member.name}</h3>
                    <p className="muted-text" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{member.role}</p>
                  </div>
                </div>
                <div className="member-status">
                  <span className={`glass-badge ${getStatusBadgeClass(member.today_status)}`}>
                    {member.today_status}
                  </span>
                </div>
              </div>

              <div className="glass-detail-grid">
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Today:</span>
                  <span className="glass-detail-value">{member.today_status}</span>
                </div>
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Sign In:</span>
                  <span className="glass-detail-value">{member.today_sign_in || 'N/A'}</span>
                </div>
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Sign Out:</span>
                  <span className="glass-detail-value">{member.today_sign_out || 'Pending'}</span>
                </div>
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Pending Leaves:</span>
                  <span className="glass-detail-value">{member.pending_leave_count}</span>
                </div>
              </div>

              <div className="glass-detail-grid" style={{ marginTop: '0.75rem' }}>
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Days Worked:</span>
                  <span className="glass-detail-value">{member.period_days_worked}</span>
                </div>
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Office Days:</span>
                  <span className="glass-detail-value">{member.period_office_days}</span>
                </div>
                <div className="glass-detail-row">
                  <span className="glass-detail-label">WFH Days:</span>
                  <span className="glass-detail-value">{member.period_wfh_days}</span>
                </div>
                <div className="glass-detail-row">
                  <span className="glass-detail-label">Missing Sign-outs:</span>
                  <span className="glass-detail-value">{member.period_missing_sign_outs}</span>
                </div>
              </div>

              {member.goals && member.goals.length > 0 && (
                <div className="glass-detail-grid" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.5rem' }}>
                  <div className="glass-detail-row" style={{ gridColumn: '1 / -1', fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>GOALS</div>
                  {member.goals.slice(0, 2).map(goal => (
                    <div key={goal.id} className="glass-detail-row" style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                        <span className="iconify" data-icon={goal.icon || 'lucide:target'} style={{ fontSize: 14, color: goal.color || '#818cf8', flexShrink: 0 }}></span>
                        <span style={{ flex: 1, fontSize: '0.8rem' }}>{goal.title}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{Math.round(goal.progress_percentage)}%</span>
                      </div>
                    </div>
                  ))}
                  {member.goals.length > 2 && (
                    <div className="glass-detail-row" style={{ gridColumn: '1 / -1', fontSize: '0.75rem', opacity: 0.5 }}>
                      +{member.goals.length - 2} more goals
                    </div>
                  )}
                </div>
              )}

              <div className="glass-modal-footer" style={{ marginTop: '1rem', borderTop: 'none' }}>
                <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => navigate(`/personnel/${member.id}`)}>
                  <span className="iconify" data-icon="lucide:user"></span>
                  View Profile
                </button>
                <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => navigate(`/manager/leave-requests/${member.id}`)}>
                  <span className="iconify" data-icon="lucide:calendar"></span>
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
        <div className="glass-grid">
          <div className="glass-card card-hover fade-in-up">
            <h3>Attendance Health</h3>
            <div className="indicator-content">
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: attendanceRate + '%' }}></div>
              </div>
              <p className="stat-details">{attendanceRate}% attendance rate - {attendanceRate >= 80 ? 'Good performance' : 'Needs attention'}</p>
            </div>
          </div>

          <div className="glass-card card-hover fade-in-up">
            <h3>Task Completion</h3>
            <div className="indicator-content">
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: task_completion.completion_rate + '%' }}></div>
              </div>
              <p className="stat-details">
                {task_completion.completion_rate}% completion rate
              </p>
            </div>
          </div>

          <div className="glass-card card-hover fade-in-up">
            <h3>Team Engagement</h3>
            <div className="indicator-content">
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: engagement_metrics.active_rate + '%' }}></div>
              </div>
              <p className="stat-details">
                {engagement_metrics.active_rate}% active rate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

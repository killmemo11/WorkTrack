// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CEODashboard() {
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
      const response = await fetch('/api/ceo/dashboard', {
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
        <p>Loading executive dashboard...</p>
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

  const { month, is_current_month, today, summary, departments } = dashboardData;
  const recruitment_metrics = summary.recruitment_metrics;
  const headcount_metrics = summary.headcount_metrics;
  const performance_metrics = summary.performance_metrics;

  return (
    <div className="ceo-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Executive Dashboard</h1>
          <p>Strategic overview of organizational performance</p>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="executive-summary">
        <div className="summary-header">
          <h2>Executive Summary</h2>
          <p>{month.label}</p>
        </div>

        <div className="summary-metrics">
          <div className="metric-card">
            <div className="metric-icon">👥</div>
            <div className="metric-content">
              <h3>Total Employees</h3>
              <p className="metric-value">{summary.total_employees}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-content">
              <h3>Present Today</h3>
              <p className="metric-value">{summary.present_today}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🕐</div>
            <div className="metric-content">
              <h3>On Leave Today</h3>
              <p className="metric-value">{summary.on_leave_today}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">❌</div>
            <div className="metric-content">
              <h3>Absent Today</h3>
              <p className="metric-value">{summary.absent_today}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-content">
              <h3>Overall Attendance</h3>
              <p className="metric-value">{summary.attendance_rate}%</p>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${summary.attendance_rate}%` }}></div>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">🎯</div>
            <div className="metric-content">
              <h3>Recruitment Rate</h3>
              <p className="metric-value">{recruitment_metrics.hiring_rate}%</p>
              <p className="metric-subtext">
                {recruitment_metrics.hired} hired of {recruitment_metrics.total} candidates
              </p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📈</div>
            <div className="metric-content">
              <h3>Headcount Utilization</h3>
              <p className="metric-value">{headcount_metrics.utilization_rate}%</p>
              <p className="metric-subtext">
                {headcount_metrics.total_employees} of {headcount_metrics.total_capacity} capacity
              </p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon">📋</div>
            <div className="metric-content">
              <h3>Performance Reviews</h3>
              <p className="metric-value">{performance_metrics.completion_rate}%</p>
              <p className="metric-subtext">
                {performance_metrics.completed} of {performance_metrics.total} completed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Department Overview */}
      <div className="section">
        <h2>Department Overview</h2>
        <div className="departments-grid">
          {departments.map((dept) => (
            <div key={dept.id} className="department-card">
              <div className="department-header">
                <h3>{dept.name}</h3>
                <div className="department-stats">
                  <span className="stat-item">
                    <span className="stat-label">Employees:</span>
                    <span className="stat-value">{dept.employee_count}</span>
                  </span>
                  <span className="stat-item">
                    <span className="stat-label">Manager:</span>
                    <span className="stat-value">{dept.manager || 'Unassigned'}</span>
                  </span>
                  <span className="stat-item">
                    <span className="stat-label">Pending Leaves:</span>
                    <span className="stat-value">{dept.pending_leaves}</span>
                  </span>
                </div>
              </div>

              <div className="department-today-stats">
                <div className="stat-row">
                  <span className="stat-label">Present:</span>
                  <span className="stat-value">{dept.today.present}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">On Leave:</span>
                  <span className="stat-value">{dept.today.on_leave}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Absent:</span>
                  <span className="stat-value">{dept.today.absent}</span>
                </div>
              </div>

              <div className="department-month-stats">
                <div className="stat-row">
                  <span className="stat-label">Attendance Rate:</span>
                  <span className="stat-value">{dept.month.attendance_rate}%</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Work Days:</span>
                  <span className="stat-value">{dept.month.total_work_days}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Attendance Days:</span>
                  <span className="stat-value">{dept.month.attendance_days}</span>
                </div>
              </div>

              <div className="department-actions">
                <button className="action-button" onClick={() => navigate(`/ceo/department/${dept.id}`)}>
                  View Details
                </button>
                <button className="action-button" onClick={() => navigate(`/ceo/leave-requests/${dept.id}`)}>
                  Leave Requests
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Analytics */}
      <div className="section">
        <h2>Strategic Analytics</h2>
        <div className="analytics-grid">
          <div className="analytics-card">
            <h3>Recruitment Pipeline</h3>
            <div className="analytics-content">
              <div className="pipeline-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Candidates:</span>
                  <span className="stat-value">{recruitment_metrics.total}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Hired:</span>
                  <span className="stat-value">{recruitment_metrics.hired}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending:</span>
                  <span className="stat-value">{recruitment_metrics.pending}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Hiring Rate:</span>
                  <span className="stat-value">{recruitment_metrics.hiring_rate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <h3>Headcount Management</h3>
            <div className="analytics-content">
              <div className="headcount-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Employees:</span>
                  <span className="stat-value">{headcount_metrics.total_employees}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Capacity:</span>
                  <span className="stat-value">{headcount_metrics.total_capacity}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Utilization Rate:</span>
                  <span className="stat-value">{headcount_metrics.utilization_rate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-card">
            <h3>Performance Management</h3>
            <div className="analytics-content">
              <div className="performance-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Reviews:</span>
                  <span className="stat-value">{performance_metrics.total}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Completed:</span>
                  <span className="stat-value">{performance_metrics.completed}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Pending:</span>
                  <span className="stat-value">{performance_metrics.pending}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Completion Rate:</span>
                  <span className="stat-value">{performance_metrics.completion_rate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="section">
        <h2>Risk Assessment Dashboard</h2>
        <div className="risk-indicators">
          <div className="risk-card">
            <h3>Attendance Risk</h3>
            <div className="risk-content">
              <div className="risk-bar">
                <div className="risk-fill" style={{ width: '75%' }}></div>
              </div>
              <p className="risk-text">75% - Moderate risk level</p>
              <p className="risk-description">Overall attendance rate is acceptable but some departments show declining trends</p>
            </div>
          </div>

          <div className="risk-card">
            <h3>Recruitment Risk</h3>
            <div className="risk-content">
              <div className="risk-bar">
                <div className="risk-fill" style={{ width: '60%' }}></div>
              </div>
              <p className="risk-text">60% - Low risk level</p>
              <p className="risk-description">Recruitment pipeline is healthy with good hiring rates</p>
            </div>
          </div>

          <div className="risk-card">
            <h3>Headcount Risk</h3>
            <div className="risk-content">
              <div className="risk-bar">
                <div className="risk-fill" style={{ width: '85%' }}></div>
              </div>
              <p className="risk-text">85% - Low risk level</p>
              <p className="risk-description">Headcount utilization is optimal with good capacity management</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
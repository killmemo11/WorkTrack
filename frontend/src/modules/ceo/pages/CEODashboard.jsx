// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';

const GRADIENTS = ['gradient-purple', 'gradient-blue', 'gradient-green', 'gradient-pink', 'gradient-amber'];

export default function CEODashboard() {
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
      <div className="glass-loading">
        <div className="spinner" />
        <span>Loading executive dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="glass-alert glass-alert-danger">
          <span className="iconify" data-icon="lucide:alert-triangle" style={{ marginRight: 8 }} />
          {error}
          <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={fetchDashboardData} style={{ marginLeft: 12 }}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="glass-empty">
        <span className="iconify" data-icon="lucide:bar-chart-2" style={{ fontSize: 48, opacity: 0.3 }} />
        <h3>No Data Available</h3>
        <p>Your dashboard data is still loading.</p>
      </div>
    );
  }

  const { month, is_current_month, today, summary, departments } = dashboardData;
  const [openDept, setOpenDept] = useState(null);
  const recruitment_metrics = summary.recruitment_metrics;
  const headcount_metrics = summary.headcount_metrics;
  const performance_metrics = summary.performance_metrics;

  const getRiskColor = (value) => {
    if (value > 85) return '#ef4444';
    if (value >= 70) return '#eab308';
    return '#22c55e';
  };

  return (
    <div className="ceo-dashboard fade-in-up">
      <div className="dashboard-greeting fade-in-up">
        <div className="greeting-avatar">{employee?.name?.charAt(0) || 'C'}</div>
        <div className="greeting-text">
          <h1>Executive Dashboard</h1>
          <p>{month?.label || 'Strategic overview'}</p>
        </div>
        <div className="greeting-badge">
          <span className="status-dot signed_in"></span>
          CEO Access
        </div>
      </div>

      <div className="dashboard-tabs fade-in-up delay-1">
        {['overview', 'departments', 'analytics', 'risk'].map(tab => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            <span className="iconify" data-icon={`lucide:${tab === 'overview' ? 'layout-dashboard' : tab === 'departments' ? 'building-2' : tab === 'analytics' ? 'line-chart' : 'shield-alert'}`} style={{ marginRight: 6, fontSize: 14 }} />
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="glass-card fade-in-up delay-2">
            <div className="glass-card-header">
              <h2>Executive Summary</h2>
              <p>{month.label}</p>
            </div>
            <div className="glass-card-body">
              <div className="stats-grid">
                <div className={`stat-card ${GRADIENTS[0]} fade-in-up`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:users"></span>
                  <div className="stat-card-content">
                    <h3>Total Employees</h3>
                    <p className="stat-value">{summary.total_employees}</p>
                  </div>
                </div>

                <div className={`stat-card ${GRADIENTS[1]} fade-in-up delay-1`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:check-circle"></span>
                  <div className="stat-card-content">
                    <h3>Present Today</h3>
                    <p className="stat-value">{summary.present_today}</p>
                  </div>
                </div>

                <div className={`stat-card ${GRADIENTS[2]} fade-in-up delay-2`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:clock"></span>
                  <div className="stat-card-content">
                    <h3>On Leave Today</h3>
                    <p className="stat-value">{summary.on_leave_today}</p>
                  </div>
                </div>

                <div className={`stat-card ${GRADIENTS[3]} fade-in-up delay-3`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:x-circle"></span>
                  <div className="stat-card-content">
                    <h3>Absent Today</h3>
                    <p className="stat-value">{summary.absent_today}</p>
                  </div>
                </div>

                <div className={`stat-card ${GRADIENTS[4]} fade-in-up`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:bar-chart-2"></span>
                  <div className="stat-card-content">
                    <h3>Overall Attendance</h3>
                    <p className="stat-value">{summary.attendance_rate}%</p>
                    <div className="stat-bar">
                      <div className="stat-bar-fill" style={{ width: `${summary.attendance_rate}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className={`stat-card ${GRADIENTS[0]} fade-in-up delay-1`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:target"></span>
                  <div className="stat-card-content">
                    <h3>Recruitment Rate</h3>
                    <p className="stat-value">{recruitment_metrics.hiring_rate}%</p>
                    <p className="stat-details">
                      {recruitment_metrics.hired} hired of {recruitment_metrics.total} candidates
                    </p>
                  </div>
                </div>

                <div className={`stat-card ${GRADIENTS[1]} fade-in-up delay-2`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:trending-up"></span>
                  <div className="stat-card-content">
                    <h3>Headcount Utilization</h3>
                    <p className="stat-value">{headcount_metrics.utilization_rate}%</p>
                    <p className="stat-details">
                      {headcount_metrics.total_employees} of {headcount_metrics.total_capacity} capacity
                    </p>
                  </div>
                </div>

                <div className={`stat-card ${GRADIENTS[2]} fade-in-up delay-3`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:clipboard-list"></span>
                  <div className="stat-card-content">
                    <h3>Performance Reviews</h3>
                    <p className="stat-value">{performance_metrics.completion_rate}%</p>
                    <p className="stat-details">
                      {performance_metrics.completed} of {performance_metrics.total} completed
                    </p>
                  </div>
                </div>

                <div className={`stat-card gradient-purple fade-in-up delay-4`}>
                  <span className="iconify stat-card-icon" data-icon="lucide:target"></span>
                  <div className="stat-card-content">
                    <h3>Department Goals</h3>
                    <p className="stat-value">{departments.filter(d => d.goals?.total > 0).length}/{departments.length}</p>
                    <p className="stat-details">
                      Depts with active goals
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'departments' && (
        <div className="glass-card fade-in-up delay-2">
          <div className="glass-card-header">
            <h2>Department Overview</h2>
          </div>
          <div className="glass-card-body">
            <div className="glass-grid">
              {departments.map((dept, idx) => (
                <div key={dept.id} className="glass-card card-hover fade-in-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                  <div className="glass-card-header">
                    <h3>{dept.name}</h3>
                    <div className="department-stats">
                      <span className="glass-detail-row">
                        <span className="glass-detail-label">Employees:</span>
                        <span className="glass-detail-value">{dept.employee_count}</span>
                      </span>
                      <span className="glass-detail-row">
                        <span className="glass-detail-label">Manager:</span>
                        <span className="glass-detail-value">{dept.manager || 'Unassigned'}</span>
                      </span>
                      <span className="glass-detail-row">
                        <span className="glass-detail-label">Pending Leaves:</span>
                        <span className="glass-detail-value">{dept.pending_leaves}</span>
                      </span>
                    </div>
                  </div>

                  <div className="glass-detail-grid">
                    <div className="glass-detail-row">
                      <span className="glass-detail-label">Present:</span>
                      <span className="glass-detail-value">{dept.today.present}</span>
                    </div>
                    <div className="glass-detail-row">
                      <span className="glass-detail-label">On Leave:</span>
                      <span className="glass-detail-value">{dept.today.on_leave}</span>
                    </div>
                    <div className="glass-detail-row">
                      <span className="glass-detail-label">Absent:</span>
                      <span className="glass-detail-value">{dept.today.absent}</span>
                    </div>
                  </div>

                  <div className="glass-detail-grid">
                    <div className="glass-detail-row">
                      <span className="glass-detail-label">Attendance Rate:</span>
                      <span className="glass-detail-value">{dept.month.attendance_rate}%</span>
                    </div>
                    <div className="glass-detail-row">
                      <span className="glass-detail-label">Work Days:</span>
                      <span className="glass-detail-value">{dept.month.total_work_days}</span>
                    </div>
                    <div className="glass-detail-row">
                      <span className="glass-detail-label">Attendance Days:</span>
                      <span className="glass-detail-value">{dept.month.attendance_days}</span>
                    </div>
                    {dept.goals && dept.goals.total > 0 && (
                      <div className="glass-detail-row">
                        <span className="glass-detail-label">Goals Avg:</span>
                        <span className="glass-detail-value">{dept.goals.avg_progress}% ({dept.goals.total})</span>
                      </div>
                    )}
                  </div>

                  <div className="department-actions">
                    <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => navigate(`/ceo/department/${dept.id}`)}>
                      View Details
                    </button>
                    <button className="glass-btn glass-btn-sm glass-btn-ghost" onClick={() => navigate(`/ceo/leave-requests/${dept.id}`)}>
                      Leave Requests
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="glass-card fade-in-up delay-2">
          <div className="glass-card-header">
            <h2>Strategic Analytics</h2>
          </div>
          <div className="glass-card-body">
            <div className="glass-grid">
              <div className="glass-card fade-in-up">
                <div className="glass-card-header">
                  <h3>Recruitment Pipeline</h3>
                </div>
                <div className="pipeline-stats">
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Total Candidates:</span>
                    <span className="glass-detail-value">{recruitment_metrics.total}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Hired:</span>
                    <span className="glass-detail-value">{recruitment_metrics.hired}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Pending:</span>
                    <span className="glass-detail-value">{recruitment_metrics.pending}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Hiring Rate:</span>
                    <span className="glass-detail-value">{recruitment_metrics.hiring_rate}%</span>
                  </div>
                </div>
              </div>

              <div className="glass-card fade-in-up delay-1">
                <div className="glass-card-header">
                  <h3>Headcount Management</h3>
                </div>
                <div className="headcount-stats">
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Total Employees:</span>
                    <span className="glass-detail-value">{headcount_metrics.total_employees}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Total Capacity:</span>
                    <span className="glass-detail-value">{headcount_metrics.total_capacity}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Utilization Rate:</span>
                    <span className="glass-detail-value">{headcount_metrics.utilization_rate}%</span>
                  </div>
                </div>
              </div>

              <div className="glass-card fade-in-up delay-2">
                <div className="glass-card-header">
                  <h3>Performance Management</h3>
                </div>
                <div className="performance-stats">
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Total Reviews:</span>
                    <span className="glass-detail-value">{performance_metrics.total}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Completed:</span>
                    <span className="glass-detail-value">{performance_metrics.completed}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Pending:</span>
                    <span className="glass-detail-value">{performance_metrics.pending}</span>
                  </div>
                  <div className="glass-detail-row">
                    <span className="glass-detail-label">Completion Rate:</span>
                    <span className="glass-detail-value">{performance_metrics.completion_rate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="glass-card fade-in-up delay-2">
          <div className="glass-card-header">
            <h2>Risk Assessment Dashboard</h2>
          </div>
          <div className="glass-card-body">
            <div className="glass-grid">
              <div className="glass-card fade-in-up">
                <div className="glass-card-header">
                  <h3>Attendance Risk</h3>
                </div>
                <div className="risk-content">
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: '75%', backgroundColor: getRiskColor(75) }}></div>
                  </div>
                  <p className="risk-text">75% - Moderate risk level</p>
                  <p className="glass-form-hint">Overall attendance rate is acceptable but some departments show declining trends</p>
                </div>
              </div>

              <div className="glass-card fade-in-up delay-1">
                <div className="glass-card-header">
                  <h3>Recruitment Risk</h3>
                </div>
                <div className="risk-content">
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: '60%', backgroundColor: getRiskColor(60) }}></div>
                  </div>
                  <p className="risk-text">60% - Low risk level</p>
                  <p className="glass-form-hint">Recruitment pipeline is healthy with good hiring rates</p>
                </div>
              </div>

              <div className="glass-card fade-in-up delay-2">
                <div className="glass-card-header">
                  <h3>Headcount Risk</h3>
                </div>
                <div className="risk-content">
                  <div className="stat-bar">
                    <div className="stat-bar-fill" style={{ width: '85%', backgroundColor: getRiskColor(85) }}></div>
                  </div>
                  <p className="risk-text">85% - Elevated risk level</p>
                  <p className="glass-form-hint">Headcount utilization is optimal with good capacity management</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

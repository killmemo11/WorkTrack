// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../shared/components/Icon';

export default function PlatformDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('platformToken');
      const [statsRes, activityRes] = await Promise.all([
        fetch('/api/platform/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/platform/activity', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setRecentActivity(data);
      }
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const formatNumber = (num) => num?.toLocaleString() || '0';
  const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleString() : '—';

  if (loading) return <div className="glass-loading"><div className="spinner" /><span>Loading dashboard...</span></div>;

  return (
    <div className="platform-page">
      <div className="platform-page-header">
        <h1>Platform Dashboard</h1>
        <p>Overview of all tenants and platform activity</p>
      </div>

      <div className="platform-stats-grid">
        <Link to="/platform/tenants" className="platform-stat-card glass-card">
          <div className="stat-icon success">
            <Icon icon="lucide:building-2" size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(stats?.tenants?.total_tenants || 0)}</div>
            <div className="stat-label">Total Tenants</div>
            <div className="stat-breakdown">
              <span className="success">{formatNumber(stats?.tenants?.active_tenants || 0)} Active</span>
              <span className="info">{formatNumber(stats?.tenants?.trial_tenants || 0)} Trial</span>
              <span className="warning">{formatNumber(stats?.tenants?.suspended_tenants || 0)} Suspended</span>
            </div>
          </div>
        </Link>

        <Link to="/platform/tenants" className="platform-stat-card glass-card">
          <div className="stat-icon info">
            <Icon icon="lucide:users" size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(stats?.employees?.total_employees || 0)}</div>
            <div className="stat-label">Total Employees</div>
          </div>
        </Link>

        <Link to="/platform/tenant-requests" className="platform-stat-card glass-card">
          <div className="stat-icon warning">
            <Icon icon="lucide:inbox" size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatNumber(stats?.requests?.total_requests || 0)}</div>
            <div className="stat-label">Tenant Requests</div>
            <div className="stat-breakdown">
              <span className="warning">{formatNumber(stats?.requests?.pending_requests || 0)} Pending</span>
              <span className="success">{formatNumber(stats?.requests?.approved_requests || 0)} Approved</span>
              <span className="error">{formatNumber(stats?.requests?.rejected_requests || 0)} Rejected</span>
            </div>
          </div>
        </Link>

        <div className="platform-stat-card glass-card">
          <div className="stat-icon primary">
            <Icon icon="lucide:activity" size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{recentActivity.length}</div>
            <div className="stat-label">Recent Platform Activity</div>
          </div>
        </div>
      </div>

      <div className="platform-dashboard-grid">
        <div className="glass-card">
          <h2 className="platform-section-title">Quick Actions</h2>
          <div className="platform-quick-actions">
            <Link to="/platform/tenant-requests" className="platform-action-btn glass-btn glass-btn-primary">
              <Icon icon="lucide:plus-circle" size={20} />
              <div>
                <strong>Review Requests</strong>
                <span>Approve or reject new tenant signups</span>
              </div>
            </Link>
            <Link to="/platform/tenants" className="platform-action-btn glass-btn glass-btn-ghost">
              <Icon icon="lucide:building-2" size={20} />
              <div>
                <strong>Manage Tenants</strong>
                <span>View, suspend, or modify tenant accounts</span>
              </div>
            </Link>
            <Link to="/platform/tenants/new" className="platform-action-btn glass-btn glass-btn-ghost">
              <Icon icon="lucide:plus" size={20} />
              <div>
                <strong>Create Tenant</strong>
                <span>Manually create a new tenant account</span>
              </div>
            </Link>
          </div>
        </div>

        <div className="glass-card">
          <h2 className="platform-section-title">Recent Platform Activity</h2>
          {recentActivity.length === 0 ? (
            <div className="platform-empty-state small">
              <Icon icon="lucide:activity" size={32} />
              <p>No recent platform activity</p>
            </div>
          ) : (
            <div className="platform-activity-list">
              {recentActivity.slice(0, 10).map((item, idx) => (
                <div key={idx} className="platform-activity-item">
                  <div className="activity-icon">
                    <Icon icon="lucide:activity" size={14} />
                  </div>
                  <div className="activity-content">
                    <div className="activity-description">{item.description}</div>
                    <div className="activity-meta">
                      <span>{item.admin_username || 'System'}</span>
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
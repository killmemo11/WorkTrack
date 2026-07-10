// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import Icon from '../Icon';
import Footer from '../Footer';

export default function PlatformLayout() {
  const { platformAdmin, logout } = usePlatformAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch platform stats
    const token = localStorage.getItem('platformToken');
    if (token) {
      fetch('/api/platform/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch(() => {});
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/platform/login');
  };

  const isActive = (path) => location.pathname === path ? 'platform-nav-link active' : 'platform-nav-link';

  return (
    <div className="platform-layout">
      <aside className="platform-sidebar">
        <div className="platform-brand">
          <Link to="/platform">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="platform-logo">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span>WorkTrack Platform</span>
          </Link>
          <span className="platform-badge">Super Admin</span>
        </div>
        <nav className="platform-nav">
          <Link to="/platform" className={isActive('/platform')}>
            <Icon icon="lucide:layout-dashboard" />
            <span>Dashboard</span>
          </Link>
          <Link to="/platform/tenants" className={isActive('/platform/tenants')}>
            <Icon icon="lucide:building-2" />
            <span>Tenants</span>
            {stats?.tenants?.total_tenants && (
              <span className="nav-badge">{stats.tenants.total_tenants}</span>
            )}
          </Link>
          <Link to="/platform/requests" className={isActive('/platform/requests')}>
            <Icon icon="lucide:file-text" />
            <span>Requests</span>
            {stats?.requests?.pending_requests > 0 && (
              <span className="nav-badge urgent">{stats.requests.pending_requests}</span>
            )}
          </Link>
          <Link to="/platform/tenants" className={isActive('/platform/tenants')}>
            <Icon icon="lucide:users" />
            <span>All Users</span>
          </Link>
        </nav>
        <div className="platform-sidebar-footer">
          <button onClick={handleLogout} className="glass-btn glass-btn-sm glass-btn-ghost" style={{width:'100%'}}>
            <Icon icon="lucide:log-out" /> Logout
          </button>
          <div className="platform-user">
            <Icon icon="lucide:user" style={{fontSize:'0.8rem'}} />
            {platformAdmin?.username}
            <span style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft:2 }}>Platform Owner</span>
          </div>
        </div>
      </aside>
      <main className="platform-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
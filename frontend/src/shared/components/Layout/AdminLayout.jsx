// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import axios from 'axios';
import AdminNotificationBell from '../../../modules/notification/components/AdminNotificationBell';
import Footer from '../Footer';

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logo, setLogo] = useState('');

  useEffect(() => {
    axios.get('/api/settings/public').then((res) => {
      if (res.data?.logo_data) setLogo(res.data.logo_data);
    }).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path ? 'admin-nav-link active' : 'admin-nav-link';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link to="/admin"><img src={logo || '/logo.png'} alt="" className="admin-logo" />WorkTrack</Link>
        </div>
        <nav className="admin-nav">
          <Link to="/admin/settings" className={isActive('/admin/settings')}>
            <span className="iconify" data-icon="lucide:settings" /> Settings
          </Link>
          <Link to="/admin/activity-log" className={isActive('/admin/activity-log')}>
            <span className="iconify" data-icon="lucide:activity" /> Activity Log
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/dashboard" className="admin-nav-link">
            <span className="iconify" data-icon="lucide:arrow-left" /> Back to App
          </Link>
          <button onClick={handleLogout} className="glass-btn glass-btn-sm glass-btn-ghost" style={{width:'100%'}}>
            <span className="iconify" data-icon="lucide:log-out" /> Logout
          </button>
          <div className="admin-user">
            <span className="iconify" data-icon="lucide:user" style={{fontSize:'0.8rem'}} />
            {admin?.name || admin?.username}
            <span style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft:2 }}>{admin?.type === 'admin' ? 'IT Admin' : 'Admin'}</span>
            <AdminNotificationBell />
          </div>
        </div>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

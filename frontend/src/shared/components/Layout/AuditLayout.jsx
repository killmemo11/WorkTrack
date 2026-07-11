// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../Icon';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import axios from 'axios';
import Footer from '../Footer';

export default function AuditLayout() {
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
          <Link to="/audit/activity"><img src={logo || '/logo.svg'} alt="" className="admin-logo" />Audit Portal</Link>
        </div>
        <nav className="admin-nav">
          <div className="admin-nav-section-label">AUDIT TRAIL</div>
          <Link to="/audit/activity" className={isActive('/audit/activity')}>
            <Icon icon="lucide:activity" /> Activity Log
          </Link>
          <Link to="/audit/balance" className={isActive('/audit/balance')}>
            <Icon icon="lucide:scale" /> Balance Audit
          </Link>
          <Link to="/audit/export" className={isActive('/audit/export')}>
            <Icon icon="lucide:download" /> Export Logs
          </Link>
          <Link to="/audit/compliance" className={isActive('/audit/compliance')}>
            <Icon icon="lucide:file-text" /> Compliance Report
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/admin/settings" className="admin-nav-link">
            <Icon icon="lucide:arrow-left" /> Admin Panel
          </Link>
          <button onClick={handleLogout} className="glass-btn glass-btn-sm glass-btn-ghost" style={{width:'100%'}}>
            <Icon icon="lucide:log-out" /> Logout
          </button>
          <div className="admin-user">
            <Icon icon="lucide:user" style={{fontSize:'0.8rem'}} />
            {admin?.username || admin?.name}
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

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../Icon';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import axios from 'axios';
import Footer from '../Footer';

export default function ITLayout() {
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
          <Link to="/it/settings"><img src={logo || '/logo.svg'} alt="" className="admin-logo" />IT Portal</Link>
        </div>
        <nav className="admin-nav">
          <div className="admin-nav-section-label">CONFIGURATION</div>
          <Link to="/it/settings" className={isActive('/it/settings')}>
            <Icon icon="lucide:settings" /> Settings
          </Link>
          <Link to="/it/smtp" className={isActive('/it/smtp')}>
            <Icon icon="lucide:mail" /> SMTP
          </Link>
          <Link to="/it/geofence" className={isActive('/it/geofence')}>
            <Icon icon="lucide:map-pin" /> Office Geofence
          </Link>
          <Link to="/it/branding" className={isActive('/it/branding')}>
            <Icon icon="lucide:palette" /> Branding
          </Link>
          <Link to="/it/meetings" className={isActive('/it/meetings')}>
            <Icon icon="lucide:video" /> Meeting Integrations
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

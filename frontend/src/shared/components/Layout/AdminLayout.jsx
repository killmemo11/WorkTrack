// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../Icon';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useSession } from '../../context/SessionContext';
import axios from 'axios';
import AdminNotificationBell from '../../../modules/notification/components/AdminNotificationBell';
import Footer from '../Footer';
import SkipLink from '../SkipLink';
import platformApi from '../../api/platformApi';

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth();
  const { session, can } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [logo, setLogo] = useState('');

  // Accounts without any RBAC rows keep the legacy full navigation.
  const permissions = session?.permissions || [];
  const allow = (permKey) => permissions.length === 0 || can(permKey);

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
      <SkipLink />
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link to="/admin"><img src={logo || '/logo.svg'} alt="" className="admin-logo" />WorkTrack</Link>
        </div>
        <nav className="admin-nav">
          {allow('admin.manage_services') && (
            <Link to="/admin/settings" className={isActive('/admin/settings')}>
              <Icon icon="lucide:settings" /> Settings
            </Link>
          )}
          {allow('admin.manage_policies') && (
            <Link to="/admin/policies" className={isActive('/admin/policies')}>
              <Icon icon="lucide:scroll-text" /> Company Policies
            </Link>
          )}
          {allow('admin.manage_roles') && (
            <Link to="/admin/rbac" className={isActive('/admin/rbac')}>
              <Icon icon="lucide:shield" /> RBAC Manager
            </Link>
          )}
          {allow('admin.view_audit') && (
            <Link to="/admin/activity-log" className={isActive('/admin/activity-log')}>
              <Icon icon="lucide:activity" /> Activity Log
            </Link>
          )}
        </nav>
        <div className="admin-sidebar-footer">
          <button onClick={handleLogout} className="glass-btn glass-btn-sm glass-btn-ghost" style={{width:'100%'}}>
            <Icon icon="lucide:log-out" /> Logout
          </button>
          <div className="admin-user">
            <Icon icon="lucide:user" style={{fontSize:'0.8rem'}} />
            {admin?.name || admin?.username}
            <span style={{ fontSize: '0.65rem', opacity: 0.6, marginLeft:2 }}>{admin?.type === 'admin' ? 'IT Admin' : 'Admin'}</span>
            <AdminNotificationBell />
          </div>
        </div>
      </aside>
      <main className="admin-content" id="main-content" tabIndex={-1}>
        {session?.impersonation?.active && (
          <div className="glass-alert glass-alert-warning" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>
              <Icon icon="lucide:shield-alert" /> Impersonation session
              {session.impersonation.platform_admin_name ? ` by ${session.impersonation.platform_admin_name}` : ''} — every action is audited.
            </span>
            <button
              type="button"
              className="glass-btn glass-btn-sm glass-btn-warning"
              onClick={async () => {
                try { await platformApi.post('/support/impersonation/stop'); } catch { /* fall through */ }
                window.location.href = '/platform/support';
              }}
            >
              End impersonation
            </button>
          </div>
        )}
        {session?.tenant?.plan === 'trial' && session?.tenant?.trial_ends_at && (
          <div className="glass-alert glass-alert-info" style={{ marginBottom: 16 }}>
            Trial workspace — access ends on{' '}
            {new Date(session.tenant.trial_ends_at).toLocaleDateString()}.
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

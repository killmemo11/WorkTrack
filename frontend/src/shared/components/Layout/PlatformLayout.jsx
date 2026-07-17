import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { usePlatformAuth } from '../../context/PlatformAuthContext';
import Icon from '../Icon';
import Footer from '../Footer';
import platformApi from '../../api/platformApi';

export default function PlatformLayout() {
  const { platformAdmin, logout } = usePlatformAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const [platformSettings, setPlatformSettings] = useState({});

  useEffect(() => {
    platformApi.get('/stats')
      .then((res) => { if (res.data) setStats(res.data); })
      .catch(() => {});

    platformApi.get('/settings')
      .then((res) => {
        const data = res.data;
        if (!Array.isArray(data)) return;
        const map = {};
        data.forEach(s => { map[s.key] = s.value; });
        setPlatformSettings(map);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/platform/login');
  };

  const isActive = (path) => location.pathname === path ? 'platform-nav-link active' : 'platform-nav-link';
  const platformName = platformSettings.company_name || 'WorkTrack';

  return (
    <div className="platform-layout">
      <aside className="platform-sidebar">
        <div className="platform-brand">
          <Link to="/platform">
            {platformSettings.platform_logo ? (
              <img src={platformSettings.platform_logo} alt={platformName} className="platform-brand-logo" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="platform-logo">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            )}
            <span>{platformName} Platform</span>
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
          <Link to="/platform/plans" className={isActive('/platform/plans')}>
            <Icon icon="lucide:credit-card" />
            <span>Plans</span>
          </Link>
          <Link to="/platform/payments" className={isActive('/platform/payments')}>
            <Icon icon="lucide:banknote" />
            <span>Payments</span>
          </Link>
          <Link to="/platform/revenue" className={isActive('/platform/revenue')}>
            <Icon icon="lucide:trending-up" />
            <span>Revenue</span>
          </Link>
          <Link to="/platform/admins" className={isActive('/platform/admins')}>
            <Icon icon="lucide:users" />
            <span>Admins</span>
          </Link>
          <Link to="/platform/client-accounts" className={isActive('/platform/client-accounts')}>
            <Icon icon="lucide:user-cog" />
            <span>Client Accounts</span>
          </Link>
          <Link to="/platform/activity" className={isActive('/platform/activity')}>
            <Icon icon="lucide:activity" />
            <span>Activity</span>
          </Link>
          <Link to="/platform/settings" className={isActive('/platform/settings')}>
            <Icon icon="lucide:settings" />
            <span>Settings</span>
          </Link>
        </nav>
        <div className="platform-sidebar-footer">
          <button onClick={handleLogout} className="glass-btn glass-btn-sm glass-btn-ghost platform-logout-btn">
            <Icon icon="lucide:log-out" /> Logout
          </button>
          <div className="platform-user">
            <Icon icon="lucide:user" />
            {platformAdmin?.username}
            <span className="platform-user-role">Platform Owner</span>
          </div>
        </div>
      </aside>
      <main className="platform-content">
        <Outlet />
        <Footer />
      </main>
    </div>
  );
}

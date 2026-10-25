import { useState, useEffect } from 'react';
import Icon from '../Icon';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import HrNotificationBell from '../../../modules/notification/components/HrNotificationBell';
import Footer from '../Footer';
import useMobileDrawer from '../../hooks/useMobileDrawer';
import SkipLink from '../SkipLink';

const NAV = [
  { path: '/hr/recruitment/jobs', label: 'Jobs', icon: 'lucide:briefcase' },
  { path: '/hr/recruitment/candidates', label: 'Candidates', icon: 'lucide:users' },
  { path: '/hr/recruitment/interviews', label: 'Interviews', icon: 'lucide:calendar' },
  { path: '/hr/recruitment/offers', label: 'Offers', icon: 'lucide:mail-check' },
  { path: '/hr/recruitment/headcount-requests', label: 'Headcount Requests', icon: 'lucide:clipboard-list' },
  { path: '/hr/recruitment/reports', label: 'Reports', icon: 'lucide:bar-chart-3' },
  { path: '/hr/recruitment/phone-templates', label: 'Phone Templates', icon: 'lucide:file-question' },
  { path: '/hr/recruitment/workflows', label: 'Workflows', icon: 'lucide:workflow' },
  { path: '/hr/recruitment/message-templates', label: 'Messages', icon: 'lucide:mail' },
  { path: '/hr/recruitment/availability', label: 'Availability', icon: 'lucide:calendar-clock' },
];

export default function ATSRecruitmentLayout() {
  const { employee: hr, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [logo, setLogo] = useState('');
  const { open: menuOpen, setOpen: setMenuOpen, triggerRef: menuButtonRef } = useMobileDrawer();

  useEffect(() => {
    axios.get('/api/settings/public').then(r => {
      if (r.data?.logo_data) setLogo(r.data.logo_data);
      if (r.data?.service_recruitment === '0') navigate('/hr', { replace: true });
    }).catch(() => {});
  }, [navigate]);

  const currentPath = '/' + location.pathname.split('/').slice(1, 4).join('/');
  const pageTitle = NAV.find(n => n.path === currentPath)?.label || 'Recruitment';

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    if (currentPath.includes('/candidates')) {
      navigate(`/hr/recruitment/candidates?q=${encodeURIComponent(search)}`);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className={`sub-layout${menuOpen ? ' menu-open' : ''}`}>
      <SkipLink />
      <aside className="sub-sidebar" id="sub-sidebar">
        <div className="sub-brand">
          <img src={logo || '/logo.svg'} alt="" />
          <span>Recruitment</span>
        </div>
        <nav className="sub-nav">
          {NAV.map(n => (
            <Link key={n.path} to={n.path} className={`sub-nav-link${isActive(n.path) ? ' active' : ''}`}>
              <Icon icon={n.icon} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="sub-sidebar-footer">
          <Link to="/hr" className="sub-nav-link" style={{ borderLeft: 'none', padding: '8px 12px' }}>
            <Icon icon="lucide:arrow-left" /> HR Panel
          </Link>
          <div className="sub-cross-links">
            <Link to="/hr/people/employees"><Icon icon="lucide:users" /> People</Link>
            <span>/</span>
            <Link to="/hr/attendance/records"><Icon icon="lucide:clock" /> Attendance</Link>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 6 }}>
            {hr?.name || hr?.username}
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="glass-btn glass-btn-sm glass-btn-ghost" style={{ width: '100%' }}>
            <Icon icon="lucide:log-out" /> Logout
          </button>
        </div>
      </aside>
      <button type="button" className="sub-menu-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />

      <div className="sub-main">
        <div className="sub-topbar">
          <button
            ref={menuButtonRef}
            type="button"
            className="sub-menu-toggle"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="sub-sidebar"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon icon={menuOpen ? 'lucide:x' : 'lucide:menu'} />
          </button>
          <span className="sub-topbar-title">{pageTitle}</span>

          <form onSubmit={handleSearch} className="sub-search">
            <Icon icon="lucide:search" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates..."
            />
          </form>

          <div style={{ flex: 1 }} />

          <Link to="/hr/recruitment/jobs" className="glass-btn glass-btn-sm glass-btn-primary">
            <Icon icon="lucide:plus" /> New Job
          </Link>
          <Link to="/hr/recruitment/candidates" className="glass-btn glass-btn-sm" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}>
            <Icon icon="lucide:plus" /> New Candidate
          </Link>

          <HrNotificationBell />
        </div>

        <main className="sub-content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

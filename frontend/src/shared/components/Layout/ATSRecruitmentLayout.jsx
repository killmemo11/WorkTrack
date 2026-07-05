import { useState, useEffect } from 'react';
import Icon from '../Icon';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import HrNotificationBell from '../../../modules/notification/components/HrNotificationBell';
import Footer from '../Footer';

const NAV = [
  { path: '/hr/recruitment/jobs', label: 'Jobs', icon: 'lucide:briefcase' },
  { path: '/hr/recruitment/candidates', label: 'Candidates', icon: 'lucide:users' },
  { path: '/hr/recruitment/interviews', label: 'Interviews', icon: 'lucide:calendar' },
  { path: '/hr/recruitment/offers', label: 'Offers', icon: 'lucide:mail-check' },
  { path: '/hr/recruitment/headcount-requests', label: 'Headcount Requests', icon: 'lucide:clipboard-list' },
  { path: '/hr/recruitment/reports', label: 'Reports', icon: 'lucide:bar-chart-3' },
];

export default function ATSRecruitmentLayout() {
  const { employee: hr, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [logo, setLogo] = useState('');

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
    <div className="sub-layout">
      <aside className="sub-sidebar">
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="sub-topbar">
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

        <div className="sub-content">
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
}

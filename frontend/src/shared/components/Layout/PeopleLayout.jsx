import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import HrNotificationBell from '../../../modules/notification/components/HrNotificationBell';
import Footer from '../Footer';

const NAV = [
  { path: '/hr/people/employees', label: 'Employees', icon: 'lucide:users' },
  { path: '/hr/people/positions', label: 'Job Architecture', icon: 'lucide:layout-list' },
  { path: '/hr/people/bulk-profiles', label: 'Bulk Profiles', icon: 'lucide:upload' },
  { path: '/hr/people/headcount', label: 'Headcount', icon: 'lucide:bar-chart-3' },
  { path: '/hr/people/resignations', label: 'Resignations', icon: 'lucide:door-open' },
  { path: '/hr/people/documents', label: 'Documents', icon: 'lucide:file-text' },
  { path: '/hr/people/contract-templates', label: 'Contracts', icon: 'lucide:file-signature' },
  { path: '/hr/people/checklists', label: 'Onboarding & Offboarding', icon: 'lucide:check-square' },
];

export default function PeopleLayout() {
  const { employee: hr, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [logo, setLogo] = useState('');
  const [serviceRecruitment, setServiceRecruitment] = useState(true);

  useEffect(() => {
    axios.get('/api/settings/public').then(r => {
      if (r.data?.logo_data) setLogo(r.data.logo_data);
      if (r.data?.service_people === '0') navigate('/hr', { replace: true });
      setServiceRecruitment(r.data.service_recruitment !== '0');
    }).catch(() => {});
  }, [navigate]);

  const currentPath = '/' + location.pathname.split('/').slice(1, 4).join('/');
  const pageTitle = NAV.find(n => n.path === currentPath)?.label || 'People';

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    if (location.pathname.startsWith('/hr/people/employees')) {
      navigate(`/hr/people/employees?q=${encodeURIComponent(search)}`);
    }
  };

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="sub-layout">
      <aside className="sub-sidebar">
        <div className="sub-brand">
          <img src={logo || '/logo.png'} alt="" />
          <span>People</span>
        </div>
        <nav className="sub-nav">
          {NAV.map(n => (
            <Link key={n.path} to={n.path} className={`sub-nav-link${isActive(n.path) ? ' active' : ''}`}>
              <span className="iconify" data-icon={n.icon} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="sub-sidebar-footer">
          <Link to="/hr" className="sub-nav-link" style={{ borderLeft: 'none', padding: '8px 12px' }}>
            <span className="iconify" data-icon="lucide:arrow-left" /> HR Panel
          </Link>
          <div className="sub-cross-links">
            {serviceRecruitment && <><Link to="/hr/recruitment/candidates"><span className="iconify" data-icon="lucide:target" /> Recruitment</Link><span>/</span></>}
            <Link to="/hr/attendance/records"><span className="iconify" data-icon="lucide:clock" /> Attendance</Link>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 6 }}>
            {hr?.name || hr?.username}
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="glass-btn glass-btn-sm glass-btn-ghost" style={{ width: '100%' }}>
            <span className="iconify" data-icon="lucide:log-out" /> Logout
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="sub-topbar">
          <span className="sub-topbar-title">{pageTitle}</span>

          <form onSubmit={handleSearch} className="sub-search">
            <span className="iconify" data-icon="lucide:search" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employees..."
            />
          </form>

          <div style={{ flex: 1 }} />

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

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import HrNotificationBell from '../../../modules/notification/components/HrNotificationBell';
import Footer from '../Footer';

const NAV = [
  { path: '/hr/recruitment/jobs', label: 'Jobs', icon: '📋' },
  { path: '/hr/recruitment/candidates', label: 'Candidates', icon: '👥' },
  { path: '/hr/recruitment/interviews', label: 'Interviews', icon: '📅' },
  { path: '/hr/recruitment/offers', label: 'Offers', icon: '💼' },
  { path: '/hr/recruitment/headcount-requests', label: 'Headcount Requests', icon: '📋' },
  { path: '/hr/recruitment/reports', label: 'Reports', icon: '📊' },
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

  const sidebarStyle = {
    width: 220, minWidth: 220,
    background: '#0f172a', color: '#94a3b8',
    display: 'flex', flexDirection: 'column',
    height: '100vh', position: 'sticky', top: 0,
    overflowY: 'auto',
  };

  const sidebarLink = (active) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', margin: '1px 8px', borderRadius: 6,
    fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? '#fff' : '#94a3b8',
    background: active ? '#1e293b' : 'transparent',
    textDecoration: 'none', transition: 'all .12s',
    borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      {/* ─── Sidebar ─── */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logo || '/logo.png'} alt="" style={{ height: 28, borderRadius: 4 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Recruitment</span>
        </div>
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {NAV.map(n => {
            const active = location.pathname.startsWith(n.path);
            return (
              <Link key={n.path} to={n.path} style={sidebarLink(active)}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{n.icon}</span>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e293b' }}>
          <Link to="/hr"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 6, marginBottom: 4,
              background: '#1e293b', color: '#94a3b8',
              textDecoration: 'none', fontSize: 12, fontWeight: 500,
            }}>
            ← HR Panel
          </Link>
          <div style={{ display: 'flex', gap: 4, fontSize: 11, marginBottom: 8, color: '#64748b' }}>
            <Link to="/hr/people/employees" style={{ color: '#6ee7b7', textDecoration: 'none' }}>👥 People</Link>
            <span>/</span>
            <Link to="/hr/attendance/records" style={{ color: '#c4b5fd', textDecoration: 'none' }}>⏰ Attendance</Link>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            {hr?.name || hr?.username}
          </div>
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{
              width: '100%', padding: '6px 12px', borderRadius: 6, border: '1px solid #334155',
              background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 12,
            }}>Logout</button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '0 24px', height: 56, minHeight: 56,
          background: '#fff', borderBottom: '1px solid #e2e8f0',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b', whiteSpace: 'nowrap' }}>
            {pageTitle}
          </span>

          <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 360, position: 'relative', marginLeft: 16 }}>
            <span style={{ position: 'absolute', left: 10, top: 7, fontSize: 14, color: '#94a3b8' }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates..."
              style={{
                width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid #e2e8f0',
                fontSize: 13, outline: 'none', background: '#f8fafc',
              }}
              onFocus={e => { e.target.style.borderColor = '#2563eb'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
            />
          </form>

          <div style={{ flex: 1 }} />

          <Link to="/hr/recruitment/jobs"
            style={{
              padding: '6px 14px', borderRadius: 6, background: '#2563eb', color: '#fff',
              fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            + New Job
          </Link>
          <Link to="/hr/recruitment/candidates"
            style={{
              padding: '6px 14px', borderRadius: 6, background: '#0f172a', color: '#fff',
              fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
            + New Candidate
          </Link>

          <HrNotificationBell />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f8fafc' }}>
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
}

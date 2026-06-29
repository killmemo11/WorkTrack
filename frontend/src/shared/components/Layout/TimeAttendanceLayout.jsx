// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import HrNotificationBell from '../../../modules/notification/components/HrNotificationBell';
import Footer from '../Footer';

const NAV = [
  { path: '/hr/attendance/records', label: 'Records', icon: '📋' },
  { path: '/hr/attendance/leaves', label: 'Leaves', icon: '🏖️' },
  { path: '/hr/attendance/signout-requests', label: 'Sign-Out', icon: '🚪' },
  { path: '/hr/attendance/reports', label: 'Reports', icon: '📊' },
];

export default function TimeAttendanceLayout() {
  const { employee: hr, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [logo, setLogo] = useState('');

  useEffect(() => {
    axios.get('/api/settings/public').then(r => {
      if (r.data?.logo_data) setLogo(r.data.logo_data);
    }).catch(() => {});
  }, []);

  const currentPath = '/' + location.pathname.split('/').slice(1, 4).join('/');
  const pageTitle = NAV.find(n => n.path === currentPath)?.label || 'Time & Attendance';

  const handleSearch = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    if (location.pathname.startsWith('/hr/attendance/records')) {
      navigate(`/hr/attendance/records?q=${encodeURIComponent(search)}`);
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
    borderLeft: active ? '3px solid #7c3aed' : '3px solid transparent',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
      <aside style={sidebarStyle}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logo || '/logo.png'} alt="" style={{ height: 28, borderRadius: 4 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Time & Attendance</span>
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
            <Link to="/hr/recruitment/candidates" style={{ color: '#93c5fd', textDecoration: 'none' }}>🎯 Recruitment</Link>
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
              placeholder="Search records..."
              style={{
                width: '100%', padding: '6px 12px 6px 32px', borderRadius: 6, border: '1px solid #e2e8f0',
                fontSize: 13, outline: 'none', background: '#f8fafc',
              }}
              onFocus={e => { e.target.style.borderColor = '#7c3aed'; }}
              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
            />
          </form>

          <div style={{ flex: 1 }} />

          <HrNotificationBell />
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#f8fafc' }}>
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  );
}

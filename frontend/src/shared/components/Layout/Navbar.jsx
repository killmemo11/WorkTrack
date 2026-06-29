// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import api from '../../api/index.js';
import NotificationBell from '../../../modules/notification/components/NotificationBell';

export default function Navbar() {
  const { employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logo, setLogo] = useState('');
  const [serviceLeaves, setServiceLeaves] = useState(true);
  const [serviceManager, setServiceManager] = useState(true);
  const [servicePeople, setServicePeople] = useState(true);
  const [approvalsCount, setApprovalsCount] = useState(0);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  useEffect(() => {
    axios.get('/api/settings/public').then((res) => {
      if (res.data?.logo_data) setLogo(res.data.logo_data);
      setServiceLeaves(res.data.service_leaves !== '0');
      setServiceManager(res.data.service_manager !== '0');
      setServicePeople(res.data.service_people !== '0');
    }).catch((err) => console.error('Failed to fetch settings:', err));
  }, []);

  useEffect(() => {
    const isManager = employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo);
    if (!employee || !serviceManager || !isManager) return;
    const fetchCount = () => {
      api.get('/manager/approvals/count').then((res) => {
        setApprovalsCount(res.data.total || 0);
      }).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [employee, serviceManager]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar" aria-label="Main navigation">
      <div className="nav-brand">
        <Link to="/dashboard">
          <img src={logo || '/logo.png'} alt="WorkTrack" className="nav-logo" />
          WorkTrack
        </Link>
      </div>
      <div className="nav-links">
        {employee?.is_global_ceo ? (
          <>
            <Link to="/ceo" className={isActive('/ceo') ? 'active' : ''} aria-current={isActive('/ceo') ? 'page' : undefined} style={{ fontWeight: 700 }}>Company Overview</Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={isActive('/dashboard') ? 'active' : ''} aria-current={isActive('/dashboard') ? 'page' : undefined}>Dashboard</Link>
            <Link to="/personnel/my-tasks" className={isActive('/personnel/my-tasks') ? 'active' : ''}>My Tasks</Link>
            <Link to="/personnel/organization-chart" className={isActive('/personnel/organization-chart') ? 'active' : ''}>Org Chart</Link>
            <Link to="/calendar" className={isActive('/calendar') ? 'active' : ''} aria-current={isActive('/calendar') ? 'page' : undefined}>Calendar</Link>
            <Link to="/history" className={isActive('/history') ? 'active' : ''} aria-current={isActive('/history') ? 'page' : undefined}>History</Link>
            {employee?.is_global_ceo !== true && <Link to="/requests" className={isActive('/requests') ? 'active' : ''} aria-current={isActive('/requests') ? 'page' : undefined}>Requests</Link>}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/team" className={isActive('/manager/team') ? 'active' : ''} aria-current={isActive('/manager/team') ? 'page' : undefined}>Team</Link>
            )}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/tasks" className={isActive('/manager/tasks') ? 'active' : ''}>Team Tasks</Link>
            )}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/team-requests" className={isActive('/manager/team-requests') ? 'active' : ''} aria-current={isActive('/manager/team-requests') ? 'page' : undefined}>Hiring Request</Link>
            )}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/approvals" className={isActive('/manager/approvals') ? 'active' : ''} aria-current={isActive('/manager/approvals') ? 'page' : undefined}>
                Approvals
                {approvalsCount > 0 && <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: 11 }}>{approvalsCount}</span>}
              </Link>
            )}
            {employee?.role === 'admin' && <Link to="/admin/settings" className={isActive('/admin') ? 'active' : ''} aria-current={isActive('/admin') ? 'page' : undefined}>Admin Panel</Link>}
            {employee?.is_hr && <Link to="/hr" className={isActive('/hr') ? 'active' : ''} aria-current={isActive('/hr') ? 'page' : undefined}>HR Panel</Link>}
          </>
        )}
      </div>
      <div className="nav-user">
        <Link to="/personnel/my-profile" style={{ color: '#fff', textDecoration: 'none', marginRight: 12 }} aria-current={isActive('/personnel/my-profile') ? 'page' : undefined}>{employee?.name}</Link>
        <NotificationBell />
        <button onClick={handleLogout} className="btn btn-sm" style={{ marginLeft: 8 }}>Logout</button>
      </div>
    </nav>
  );
}

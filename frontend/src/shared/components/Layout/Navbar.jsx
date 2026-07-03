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
          <span className="nav-brand-text">WorkTrack</span>
        </Link>
      </div>
      <div className="nav-links">
        {employee?.is_global_ceo ? (
          <>
            <Link to="/ceo" className={`nav-link${isActive('/ceo') ? ' active' : ''}`} aria-current={isActive('/ceo') ? 'page' : undefined}>
              <span className="iconify" data-icon="lucide:building2" /> Company Overview
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`nav-link${isActive('/dashboard') ? ' active' : ''}`} aria-current={isActive('/dashboard') ? 'page' : undefined}>
              <span className="iconify" data-icon="lucide:layout-dashboard" /> Dashboard
            </Link>
            <Link to="/attendance" className={`nav-link${isActive('/attendance') ? ' active' : ''}`} aria-current={isActive('/attendance') ? 'page' : undefined}>
              <span className="iconify" data-icon="lucide:fingerprint" /> Attendance
            </Link>
            <Link to="/personnel/my-tasks" className={`nav-link${isActive('/personnel/my-tasks') ? ' active' : ''}`}>
              <span className="iconify" data-icon="lucide:check-square" /> My Tasks
            </Link>
            <Link to="/personnel/organization-chart" className={`nav-link${isActive('/personnel/organization-chart') ? ' active' : ''}`}>
              <span className="iconify" data-icon="lucide:git-branch" /> Org Chart
            </Link>
            <Link to="/calendar" className={`nav-link${isActive('/calendar') ? ' active' : ''}`} aria-current={isActive('/calendar') ? 'page' : undefined}>
              <span className="iconify" data-icon="lucide:calendar" /> Calendar
            </Link>
            <Link to="/history" className={`nav-link${isActive('/history') ? ' active' : ''}`} aria-current={isActive('/history') ? 'page' : undefined}>
              <span className="iconify" data-icon="lucide:clock" /> History
            </Link>
            {employee?.is_global_ceo !== true && (
              <Link to="/requests" className={`nav-link${isActive('/requests') ? ' active' : ''}`} aria-current={isActive('/requests') ? 'page' : undefined}>
                <span className="iconify" data-icon="lucide:file-text" /> Requests
              </Link>
            )}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/team" className={`nav-link${isActive('/manager/team') ? ' active' : ''}`} aria-current={isActive('/manager/team') ? 'page' : undefined}>
                <span className="iconify" data-icon="lucide:users" /> Team
              </Link>
            )}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/tasks" className={`nav-link${isActive('/manager/tasks') ? ' active' : ''}`}>
                <span className="iconify" data-icon="lucide:list-todo" /> Team Tasks
              </Link>
            )}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/team-requests" className={`nav-link${isActive('/manager/team-requests') ? ' active' : ''}`} aria-current={isActive('/manager/team-requests') ? 'page' : undefined}>
                <span className="iconify" data-icon="lucide:user-plus" /> Hiring Request
              </Link>
            )}
            {employee?.is_global_ceo !== true && serviceManager && (employee?.is_manager || (employee?.role === 'ceo' && !employee?.is_global_ceo)) && (
              <Link to="/manager/approvals" className={`nav-link${isActive('/manager/approvals') ? ' active' : ''}`} aria-current={isActive('/manager/approvals') ? 'page' : undefined}>
                <span className="iconify" data-icon="lucide:clipboard-check" /> Approvals
                {approvalsCount > 0 && <span className="glass-badge glass-badge-warning" style={{ marginLeft: 6, fontSize: 10 }}>{approvalsCount}</span>}
              </Link>
            )}
            {employee?.role === 'admin' && (
              <Link to="/admin/settings" className={`nav-link${isActive('/admin') ? ' active' : ''}`} aria-current={isActive('/admin') ? 'page' : undefined}>
                <span className="iconify" data-icon="lucide:shield" /> Admin Panel
              </Link>
            )}
            {employee?.is_hr && (
              <Link to="/hr" className={`nav-link${isActive('/hr') ? ' active' : ''}`} aria-current={isActive('/hr') ? 'page' : undefined}>
                <span className="iconify" data-icon="lucide:briefcase" /> HR Panel
              </Link>
            )}
          </>
        )}
      </div>
      <div className="nav-user">
        <Link to="/personnel/my-profile" className="nav-user-link" aria-current={isActive('/personnel/my-profile') ? 'page' : undefined}>
          <span className="iconify" data-icon="lucide:user" /> {employee?.name}
        </Link>
        <NotificationBell />
        <button onClick={handleLogout} className="glass-btn glass-btn-sm">
          <span className="iconify" data-icon="lucide:log-out" /> Logout
        </button>
      </div>
    </nav>
  );
}

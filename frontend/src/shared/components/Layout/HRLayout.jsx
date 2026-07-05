// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../Icon';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import HrNotificationBell from '../../../modules/notification/components/HrNotificationBell';
import Footer from '../Footer';

export default function HRLayout({ children }) {
  const { employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logo, setLogo] = useState('');
  const [serviceRecruitment, setServiceRecruitment] = useState(true);
  const [servicePeople, setServicePeople] = useState(true);

  useEffect(() => {
    axios.get('/api/settings/public').then((res) => {
      if (res.data?.logo_data) setLogo(res.data.logo_data);
      setServiceRecruitment(res.data.service_recruitment !== '0');
      setServicePeople(res.data.service_people !== '0');
    }).catch(() => {});
  }, []);

  const isActive = (path) => location.pathname === path ? 'admin-nav-link active' : 'admin-nav-link';
  const prefix = (path) => (location.pathname + '/').startsWith(path + '/') ? 'admin-nav-link active' : 'admin-nav-link';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link to="/hr"><img src={logo || '/logo.svg'} alt="" className="admin-logo" />HR Panel</Link>
        </div>
        <nav className="admin-nav">
          {servicePeople && (
            <>
              <div className="admin-nav-section-label">PEOPLE</div>
              <Link to="/hr/people/employees" className={prefix('/hr/people')}>
                <Icon icon="lucide:users" /> People
              </Link>
            </>
          )}

          {serviceRecruitment && (
            <>
              <div className="admin-nav-section-label">RECRUITMENT</div>
              <Link to="/hr/recruitment/candidates" className={prefix('/hr/recruitment')}>
                <Icon icon="lucide:target" /> Recruitment
              </Link>
            </>
          )}

          <div className="admin-nav-section-label">TIME & ATTENDANCE</div>
          <Link to="/hr/attendance/records" className={prefix('/hr/attendance')}>
            <Icon icon="lucide:clock" /> Time & Attendance
          </Link>

          <div className="admin-nav-section-label">TOOLS</div>
          <Link to="/hr/hr-settings" className={isActive('/hr/hr-settings')}>
            <Icon icon="lucide:settings" /> HR Settings
          </Link>
          <Link to="/hr/audit-log" className={isActive('/hr/audit-log')}>
            <Icon icon="lucide:clipboard-list" /> Balance Audit
          </Link>
          <Link to="/hr/assets" className={isActive('/hr/assets')}>
            <Icon icon="lucide:package" /> Assets
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/dashboard" className="admin-nav-link">
            <Icon icon="lucide:arrow-left" /> Back to App
          </Link>
          <button onClick={handleLogout} className="glass-btn glass-btn-sm glass-btn-ghost" style={{width:'100%'}}>
            <Icon icon="lucide:log-out" /> Logout
          </button>
          <div className="admin-user">
            <Icon icon="lucide:user" style={{fontSize:'0.8rem'}} />
            {employee?.name || employee?.username} <HrNotificationBell />
          </div>
        </div>
      </aside>
      <main className="admin-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

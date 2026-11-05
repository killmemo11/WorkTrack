// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../../shared/context/SessionContext';
import { getCsrfHeader } from '../../../shared/api/session';

export default function AccountStatus() {
  const { session, clear } = useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', headers: getCsrfHeader() });
    } catch {}
    clear();
    navigate('/login', { replace: true });
  };

  const tenantName = session?.tenant?.name;
  const status = session?.tenant?.status;

  return (
    <div className="login-page-modern">
      <div className="login-bg">
        <div className="login-bg-gradient" />
        <div className="login-bg-orb login-orb-1" />
        <div className="login-bg-orb login-orb-2" />
      </div>
      <div className="login-card-modern" style={{ maxWidth: 520 }}>
        <div className="login-modern-header">
          <img src="/logo.svg" alt="WorkTrack" className="login-modern-logo" />
          <h1>Workspace unavailable</h1>
          <p>
            {tenantName ? `${tenantName} is currently ${status || 'inactive'}.` : 'This workspace is not available right now.'}
          </p>
        </div>
        <div className="glass-alert glass-alert-danger" style={{ marginBottom: 16 }}>
          <span>
            Access to this workspace is paused. Ask your administrator or the WorkTrack team to reactivate the
            subscription, then sign in again.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button type="button" className="glass-btn glass-btn-primary" onClick={handleLogout}>
            Sign out
          </button>
          <Link to="/login" className="glass-btn glass-btn-ghost" onClick={clear}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useSession } from '../context/SessionContext';

export default function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  const { session, loading: sessionLoading } = useSession();
  const location = useLocation();

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  if (session?.access?.blocked) return <Navigate to="/account-status" replace />;

  if (!admin) return <Navigate to="/login" replace />;

  // The session context carries the impersonation flag; wait for it before
  // deciding, otherwise a gated admin is redirected before the flag arrives.
  if (admin.must_change_password && sessionLoading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  // Platform staff impersonating this tenant cannot change its password, so the
  // gate would otherwise trap them on the change-password screen.
  const impersonating = session?.impersonation?.active;

  // Force a password change before anything else — but not on the
  // change-password page itself (avoids a redirect loop).
  if (!impersonating && admin.must_change_password && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }

  return children;
}

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminRoute({ children }) {
  const { admin, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  if (!admin) return <Navigate to="/login" replace />;

  // Force a password change before anything else — but not on the
  // change-password page itself (avoids a redirect loop).
  if (admin.must_change_password && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }

  return children;
}

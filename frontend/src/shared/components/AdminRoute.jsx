import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminRoute({ children }) {
  const { admin, loading, recheck } = useAdminAuth();
  const [rechecking, setRechecking] = useState(false);
  const hasToken = localStorage.getItem('adminToken') || localStorage.getItem('token');
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (!initialCheckDone.current && !admin && hasToken) {
      initialCheckDone.current = true;
      setRechecking(true);
      recheck().finally(() => setRechecking(false));
    }
  }, [admin, hasToken, recheck]);

  if (loading || rechecking) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );

  if (!admin) return hasToken ? <Navigate to="/dashboard" /> : <Navigate to="/admin/login" />;

  // Phase 1: if the admin must change their password, force-redirect to the
  // change-password page. The whitelist in the server-side gate
  // (password-gate.middleware.js) ensures /api/admin/auth/change-password and
  // /me remain reachable; the change-password page reads the flag from /me
  // and handles the rest client-side.
  if (admin.must_change_password) return <Navigate to="/admin/change-password" replace />;

  return children;
}
import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminRoute({ children }) {
  const { admin, loading, recheck } = useAdminAuth();
  const [rechecking, setRechecking] = useState(false);
  const location = useLocation();
  const hasToken = document.cookie.includes('access_token=');
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
  // change-password page — but only if we're not already on it (avoids redirect loop).
  if (admin.must_change_password && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }

  return children;
}
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
  return admin ? children : (hasToken ? <Navigate to="/dashboard" /> : <Navigate to="/admin/login" />);
}
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';

export default function ProtectedRoute({ children }) {
  const { employee, loading } = useAuth();
  const { session } = useSession();
  if (loading) return (
    <div className="glass-loading">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  );
  if (session?.access?.blocked) return <Navigate to="/account-status" replace />;
  return employee ? children : <Navigate to="/login" />;
}

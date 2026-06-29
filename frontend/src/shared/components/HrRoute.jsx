// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HrRoute({ children }) {
  const { employee, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!employee) return <Navigate to="/login" />;
  if (!employee.is_hr) return <Navigate to="/dashboard" />;
  return children;
}

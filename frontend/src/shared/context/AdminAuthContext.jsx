import { createContext, useContext, useState, useEffect } from 'react';
import { fetchWithSession, getCsrfHeader } from '../api/session';

const AdminAuthContext = createContext();

const ADMIN_AREA = /^\/(admin|it|audit)(\/|$)/;

const checkAuth = async () => {
  // The provider wraps the whole app; only probe the admin realm while on an
  // admin/IT/audit route so employee pages don't emit a spurious 403.
  if (!ADMIN_AREA.test(window.location.pathname)) return null;
  try {
    const res = await fetchWithSession('/api/admin/auth/me', { realm: 'admin' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const recheck = async () => {
    setLoading(true);
    const data = await checkAuth();
    setAdmin(data);
    setLoading(false);
  };

  useEffect(() => {
    recheck();
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid credentials');
    }
    const data = await res.json();
    setAdmin(data.admin);
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: getCsrfHeader(),
      });
    } catch {}
    setAdmin(null);
    window.location.href = '/admin/login';
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, recheck }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);

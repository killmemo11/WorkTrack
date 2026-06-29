import { createContext, useContext, useState, useEffect } from 'react';

const AdminAuthContext = createContext();

const checkToken = async (token) => {
  try {
    const res = await fetch('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
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
    const adminToken = localStorage.getItem('adminToken');
    const empToken = localStorage.getItem('token');

    let data = null;
    if (adminToken) {
      data = await checkToken(adminToken);
      if (!data) {
        localStorage.removeItem('adminToken');
      }
    }

    if (!data && empToken) {
      data = await checkToken(empToken);
    }

    setAdmin(data);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await recheck();
      if (cancelled) return;
    };

    init();

    const onStorage = (e) => {
      if (e.key === 'token' || e.key === 'adminToken') {
        setLoading(true);
        recheck();
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid credentials');
    }
    const data = await res.json();
    localStorage.setItem('adminToken', data.token);
    setAdmin(data.admin);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
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

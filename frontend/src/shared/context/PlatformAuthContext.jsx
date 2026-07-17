import { createContext, useContext, useState, useEffect } from 'react';

const PlatformAuthContext = createContext();

const checkAuth = async () => {
  try {
    const res = await fetch('/api/platform/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

export function PlatformAuthProvider({ children }) {
  const [platformAdmin, setPlatformAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const recheck = async (redirect = false) => {
    setLoading(true);
    const data = await checkAuth();
    setPlatformAdmin(data);
    setLoading(false);

    if (!data && redirect && !window.location.pathname.startsWith('/platform/login')) {
      window.location.href = '/platform/login';
    }
  };

  useEffect(() => {
    recheck(true);
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/platform/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid credentials');
    }
    const data = await res.json();
    setPlatformAdmin(data.platformAdmin);
    return data;
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setPlatformAdmin(null);
    window.location.href = '/platform/login';
  };

  return (
    <PlatformAuthContext.Provider value={{ platformAdmin, loading, login, logout, recheck }}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

export const usePlatformAuth = () => useContext(PlatformAuthContext);
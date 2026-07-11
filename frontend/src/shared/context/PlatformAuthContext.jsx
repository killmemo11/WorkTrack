import { createContext, useContext, useState, useEffect } from 'react';

const PlatformAuthContext = createContext();

const checkToken = async (token) => {
  try {
    const res = await fetch('/api/platform/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

export function PlatformAuthProvider({ children }) {
  const [platformAdmin, setPlatformAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const recheck = async () => {
    setLoading(true);
    const token = localStorage.getItem('platformToken');

    let data = null;
    if (token) {
      data = await checkToken(token);
      if (!data) {
        localStorage.removeItem('platformToken');
      }
    }

    setPlatformAdmin(data);
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
      if (e.key === 'platformToken') {
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
    const res = await fetch('/api/platform/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Platform-Access': 'worktrack-platform-2026'
      },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Invalid credentials');
    }
    const data = await res.json();
    localStorage.setItem('platformToken', data.token);
    setPlatformAdmin(data.platformAdmin);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('platformToken');
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
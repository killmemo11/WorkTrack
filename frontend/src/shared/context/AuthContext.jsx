// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

function getTokenFromCookie(name) {
  const match = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
  return match ? match.trim().split('=')[1] : null;
}

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setEmployee(data);
        }
      } catch {}
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username, password, rememberMe = false) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe }),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    if (data.employee) setEmployee(data.employee);
    return data;
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setEmployee(null);
  };

  return (
    <AuthContext.Provider value={{ employee, loading, login, logout, setEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

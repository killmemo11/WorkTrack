// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (res.status === 401) {
            if (localStorage.getItem('token') === token) localStorage.removeItem('token');
            return Promise.reject();
          }
          return res.ok ? res.json() : Promise.reject();
        })
        .then((data) => setEmployee(data))
        .catch((err) => console.error('Auth check failed:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    localStorage.setItem('token', data.token);
    if (data.employee) setEmployee(data.employee);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setEmployee(null);
  };

  return (
    <AuthContext.Provider value={{ employee, loading, login, logout, setEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

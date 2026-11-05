// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const SessionContext = createContext(null);

// Single source of truth for "who am I, which workspace, what can I do".
// The server resolves the realm from whichever auth cookie is present.
export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/session/context', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        setSession(null);
        return null;
      }
      const data = await res.json();
      setSession(data);
      return data;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const can = useCallback((permKey) => {
    if (!session) return false;
    const { roles = [], permissions = [] } = session;
    if (roles.includes('owner')) return true;
    return permissions.includes(permKey);
  }, [session]);

  const hasService = useCallback((serviceKey) => {
    if (!session?.services) return true;
    return session.services[serviceKey] !== false;
  }, [session]);

  const clear = useCallback(() => setSession(null), []);

  return (
    <SessionContext.Provider value={{ session, loading, refresh, clear, can, hasService }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);

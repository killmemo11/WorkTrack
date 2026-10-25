// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import axios from 'axios';
import { getTokenFromCookie } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const AUTH_PATHS = /\/(?:auth\/(?:login|refresh|register|verify|forgot-password|reset-password)|magic-link\/)/;

let refreshPromise = null;

// Only one auth realm is active at a time (see clearOtherAuthCookies on the
// server) and refresh tokens rotate, so concurrent refreshes would invalidate
// each other. Every client shares this single in-flight promise.
export function refreshSession(realm) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh', realm ? { realm } : {}, { withCredentials: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export function createApiClient({ baseURL, realm, loginPath = '/login' }) {
  const client = axios.create({
    baseURL,
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    // Access tokens are HttpOnly; the browser attaches them automatically.
    // Only the CSRF cookie is readable and must be mirrored into the header.
    if (!SAFE_METHODS.has((config.method || 'get').toUpperCase())) {
      const csrfToken = getTokenFromCookie('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const original = err.config;
      const retriable =
        err.response?.status === 401 &&
        original &&
        !original._retry &&
        !AUTH_PATHS.test(original.url || '');

      if (!retriable) return Promise.reject(err);

      original._retry = true;
      try {
        await refreshSession(realm);
      } catch (refreshErr) {
        if (!window.location.pathname.startsWith(loginPath)) {
          window.location.href = loginPath;
        }
        return Promise.reject(err);
      }

      return client(original);
    }
  );

  return client;
}

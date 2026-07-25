// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import axios from 'axios';

function getTokenFromCookie(name) {
  const match = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
  return match ? match.trim().split('=')[1] : null;
}

const platformApi = axios.create({
  baseURL: '/api/platform',
  withCredentials: true,
});

platformApi.interceptors.request.use((config) => {
  const token = getTokenFromCookie('platform_access_token') || getTokenFromCookie('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase())) {
    const csrfToken = getTokenFromCookie('csrf_token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

function processQueue(error) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
}

platformApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => platformApi(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        processQueue(null);
        return platformApi(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        window.location.href = '/platform/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default platformApi;

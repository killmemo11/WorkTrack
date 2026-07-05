// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import axios from 'axios';

const hrApi = axios.create({
  baseURL: '/api/hr',
});

hrApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

hrApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Document endpoints
hrApi.get('/my-documents');
hrApi.get('/my-documents/search', { params: { query, type, sortBy, sortOrder } });
hrApi.get('/my-documents/:docId/preview');

export default hrApi;

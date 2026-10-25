// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { createApiClient } from './client';

const platformApi = createApiClient({
  baseURL: '/api/platform',
  realm: 'platform',
  loginPath: '/platform/login',
});

export default platformApi;

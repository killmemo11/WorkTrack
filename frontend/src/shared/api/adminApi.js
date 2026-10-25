// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { createApiClient } from './client';

const adminApi = createApiClient({ baseURL: '/api/admin', loginPath: '/login' });

export default adminApi;

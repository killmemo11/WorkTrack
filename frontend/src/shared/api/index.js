// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { createApiClient } from './client';

const api = createApiClient({ baseURL: '/api', loginPath: '/login' });

export default api;

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { createApiClient } from './client';

// Used by both admin_users (admin realm) and employee admins (employee realm),
// so let the server pick whichever refresh cookie is present.
const hrApi = createApiClient({ baseURL: '/api/hr', loginPath: '/login' });

export default hrApi;

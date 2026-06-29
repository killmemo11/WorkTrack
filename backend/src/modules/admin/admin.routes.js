// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { createRoutes } = require('../../shared/routes.factory');
const { requireITAuth } = require('../../shared/middleware/it-auth.middleware');

module.exports = createRoutes(requireITAuth);

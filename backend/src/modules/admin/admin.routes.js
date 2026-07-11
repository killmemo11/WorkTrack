// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { createRoutes } = require('../../shared/routes.factory');
const { requireITAuth } = require('../../shared/middleware/it-auth.middleware');
const { requirePasswordChangeGate } = require('../../shared/middleware/password-gate.middleware');

module.exports = createRoutes((req, res, next) => requireITAuth(req, res, (err) => {
  if (err) return next(err);
  requirePasswordChangeGate(req, res, next);
}));

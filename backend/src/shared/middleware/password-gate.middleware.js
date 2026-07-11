// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Phase 1 security gate. Chained AFTER requireITAuth / requireAnyActiveToken
// on every admin-portal mount path. If the authenticated admin record has
// must_change_password = true, blocks all routes except a strict whitelist.
//
// Whitelist (always reachable while must_change_password is true):
//   - GET  /api/admin/auth/me            (frontend reads must_change_password flag)
//   - POST /api/admin/auth/change-password (the only write action allowed)
//
// Returns HTTP 428 Precondition Required with a clear code for everything else.
//
// NOTE: Uses req.originalUrl (not req.path) so this works correctly whether
// the middleware is mounted on app.js (originalUrl = full) or inside a
// sub-router via createRoutes() (req.path = relative to sub-router).

const ALLOW_PATHS = new Set([
  '/api/admin/auth/me',
  '/api/admin/auth/change-password',
]);

function requirePasswordChangeGate(req, res, next) {
  if (!req.admin || !req.admin.must_change_password) return next();

  const url = (req.originalUrl || '').split('?')[0].replace(/\/+$/, '').toLowerCase();
  if (ALLOW_PATHS.has(url)) return next();

  return res.status(428).json({
    code: 'PASSWORD_CHANGE_REQUIRED',
    error: 'You must change your password before accessing this resource.'
  });
}

module.exports = { requirePasswordChangeGate };
// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const AUTH_COOKIE_NAMES = [
  'access_token',
  'refresh_token',
  'admin_access_token',
  'admin_refresh_token',
  'platform_access_token',
  'platform_refresh_token',
];

// Keeps exactly one auth realm active at a time; prevents a stale cookie from
// another realm being picked up by refresh or by shared API clients.
function clearOtherAuthCookies(res, keep = []) {
  for (const name of AUTH_COOKIE_NAMES) {
    if (!keep.includes(name)) res.clearCookie(name, { path: '/' });
  }
}

module.exports = { AUTH_COOKIE_NAMES, clearOtherAuthCookies };

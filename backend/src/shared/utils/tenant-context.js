// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function runWithTenant(tenantId, fn) {
  return storage.run({ tenantId: tenantId || null }, fn);
}

function getTenantId() {
  return storage.getStore()?.tenantId || null;
}

module.exports = { runWithTenant, getTenantId };

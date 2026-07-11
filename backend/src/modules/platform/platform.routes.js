// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
const {
  platformLogin,
  platformMe,
  listTenantRequests,
  getTenantRequest,
  approveTenantRequest,
  rejectTenantRequest,
  listTenants,
  getTenant,
  updateTenant,
  suspendTenant,
  activateTenant,
  getPlatformStats,
  getPlatformActivity,
} = require('./platform.controller');

router.post('/auth/login', platformLogin);
router.get('/auth/me', requirePlatformAuth, platformMe);

// Tenant Requests
router.get('/tenant-requests', requirePlatformAuth, listTenantRequests);
router.get('/tenant-requests/:id', requirePlatformAuth, getTenantRequest);
router.post('/tenant-requests/:id/approve', requirePlatformAuth, approveTenantRequest);
router.post('/tenant-requests/:id/reject', requirePlatformAuth, rejectTenantRequest);

// Platform Stats
router.get('/stats', requirePlatformAuth, getPlatformStats);
router.get('/activity', requirePlatformAuth, getPlatformActivity);

// Tenants Management
router.get('/tenants', requirePlatformAuth, listTenants);
router.get('/tenants/:id', requirePlatformAuth, getTenant);
router.put('/tenants/:id', requirePlatformAuth, updateTenant);
router.post('/tenants/:id/suspend', requirePlatformAuth, suspendTenant);
router.post('/tenants/:id/activate', requirePlatformAuth, activateTenant);

module.exports = router;
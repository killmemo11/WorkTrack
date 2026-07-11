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
  createTenant,
  resendMagicLink,
  listPlatformAdmins,
  createPlatformAdmin,
  updatePlatformAdmin,
  resetPlatformAdminPassword,
  deletePlatformAdmin,
  changeOwnPassword,
  listClientAccounts,
  createClientAccount,
  updateClientAccount,
  resetClientAccountPassword,
  deleteClientAccount,
} = require('./platform.controller');

router.post('/auth/login', platformLogin);
router.get('/auth/me', requirePlatformAuth, platformMe);
router.post('/auth/change-password', requirePlatformAuth, changeOwnPassword);

// Platform Admin Accounts
router.get('/admins', requirePlatformAuth, listPlatformAdmins);
router.post('/admins', requirePlatformAuth, createPlatformAdmin);
router.put('/admins/:id', requirePlatformAuth, updatePlatformAdmin);
router.post('/admins/:id/reset-password', requirePlatformAuth, resetPlatformAdminPassword);
router.delete('/admins/:id', requirePlatformAuth, deletePlatformAdmin);

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
router.post('/tenants', requirePlatformAuth, createTenant);
router.put('/tenants/:id', requirePlatformAuth, updateTenant);
router.post('/tenants/:id/suspend', requirePlatformAuth, suspendTenant);
router.post('/tenants/:id/activate', requirePlatformAuth, activateTenant);
router.post('/tenants/admins/:id/resend-magic-link', requirePlatformAuth, resendMagicLink);

// Client Account Management (Tenant Admins)
router.get('/client-accounts', requirePlatformAuth, listClientAccounts);
router.post('/client-accounts', requirePlatformAuth, createClientAccount);
router.put('/client-accounts/:id', requirePlatformAuth, updateClientAccount);
router.post('/client-accounts/:id/reset-password', requirePlatformAuth, resetClientAccountPassword);
router.delete('/client-accounts/:id', requirePlatformAuth, deleteClientAccount);

module.exports = router;
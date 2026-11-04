// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
const { requirePlatformPermission } = require('../../shared/middleware/platform-permission.middleware');
const {
  platformLogin,
  platformMe,
  listTenantRequests,
  getTenantRequest,
  approveTenantRequest,
  rejectTenantRequest,
  verifyPayment,
  rejectPayment,
  listTenants,
  getTenant,
  updateTenant,
  suspendTenant,
  activateTenant,
  deleteTenant,
  getPaymentTransactions,
  verifyPaymentTransaction,
  rejectPaymentTransaction,
  getRevenueAnalytics,
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
router.get('/admins', requirePlatformAuth, requirePlatformPermission('platform.admins.manage'), listPlatformAdmins);
router.post('/admins', requirePlatformAuth, requirePlatformPermission('platform.admins.manage'), createPlatformAdmin);
router.put('/admins/:id', requirePlatformAuth, requirePlatformPermission('platform.admins.manage'), updatePlatformAdmin);
router.post('/admins/:id/reset-password', requirePlatformAuth, requirePlatformPermission('platform.admins.manage'), resetPlatformAdminPassword);
router.delete('/admins/:id', requirePlatformAuth, requirePlatformPermission('platform.admins.manage'), deletePlatformAdmin);

// Tenant Requests
router.get('/tenant-requests', requirePlatformAuth, requirePlatformPermission('platform.requests.view'), listTenantRequests);
router.get('/tenant-requests/:id', requirePlatformAuth, requirePlatformPermission('platform.requests.view'), getTenantRequest);
router.post('/tenant-requests/:id/approve', requirePlatformAuth, requirePlatformPermission('platform.requests.manage'), approveTenantRequest);
router.post('/tenant-requests/:id/reject', requirePlatformAuth, requirePlatformPermission('platform.requests.manage'), rejectTenantRequest);
router.post('/tenant-requests/:id/verify-payment', requirePlatformAuth, requirePlatformPermission('platform.payments.verify'), verifyPayment);
router.post('/tenant-requests/:id/reject-payment', requirePlatformAuth, requirePlatformPermission('platform.payments.verify'), rejectPayment);

// Platform Stats
router.get('/stats', requirePlatformAuth, requirePlatformPermission('platform.tenants.view'), getPlatformStats);
router.get('/activity', requirePlatformAuth, requirePlatformPermission('platform.audit.view'), getPlatformActivity);

// Tenants Management
router.get('/tenants', requirePlatformAuth, requirePlatformPermission('platform.tenants.view'), listTenants);
router.get('/tenants/:id', requirePlatformAuth, requirePlatformPermission('platform.tenants.view'), getTenant);
router.post('/tenants', requirePlatformAuth, requirePlatformPermission('platform.tenants.create'), createTenant);
router.put('/tenants/:id', requirePlatformAuth, requirePlatformPermission('platform.tenants.update'), updateTenant);
router.post('/tenants/:id/suspend', requirePlatformAuth, requirePlatformPermission('platform.tenants.suspend'), suspendTenant);
router.post('/tenants/:id/activate', requirePlatformAuth, requirePlatformPermission('platform.tenants.activate'), activateTenant);
router.delete('/tenants/:id', requirePlatformAuth, requirePlatformPermission('platform.tenants.delete'), deleteTenant);
router.post('/tenants/admins/:id/resend-magic-link', requirePlatformAuth, requirePlatformPermission('platform.support.remediate'), resendMagicLink);

// Payment Transactions
router.get('/payments', requirePlatformAuth, requirePlatformPermission('platform.payments.view'), getPaymentTransactions);
router.post('/payments/:id/verify', requirePlatformAuth, requirePlatformPermission('platform.payments.verify'), verifyPaymentTransaction);
router.post('/payments/:id/reject', requirePlatformAuth, requirePlatformPermission('platform.payments.verify'), rejectPaymentTransaction);

// Revenue Analytics
router.get('/revenue', requirePlatformAuth, requirePlatformPermission('platform.payments.view'), getRevenueAnalytics);

// Client Account Management (Tenant Admins)
router.get('/client-accounts', requirePlatformAuth, requirePlatformPermission('platform.tenants.view'), listClientAccounts);
router.post('/client-accounts', requirePlatformAuth, requirePlatformPermission('platform.tenants.update'), createClientAccount);
router.put('/client-accounts/:id', requirePlatformAuth, requirePlatformPermission('platform.tenants.update'), updateClientAccount);
router.post('/client-accounts/:id/reset-password', requirePlatformAuth, requirePlatformPermission('platform.support.remediate'), resetClientAccountPassword);
router.delete('/client-accounts/:id', requirePlatformAuth, requirePlatformPermission('platform.tenants.update'), deleteClientAccount);

module.exports = router;

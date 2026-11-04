// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
const { requirePlatformPermission } = require('../../shared/middleware/platform-permission.middleware');
const {
  getPublicPlans,
  getPublicSettings,
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  listPlatformSettings,
  updatePlatformSettings,
  testPlatformSmtp,
} = require('./plans.controller');

// Public routes (no auth required)
router.get('/public/plans', getPublicPlans);
router.get('/public/settings', getPublicSettings);

// Admin routes (Super Admin auth required)
router.get('/plans', requirePlatformAuth, requirePlatformPermission('platform.plans.view'), listPlans);
router.get('/plans/:id', requirePlatformAuth, requirePlatformPermission('platform.plans.view'), getPlan);
router.post('/plans', requirePlatformAuth, requirePlatformPermission('platform.plans.manage'), createPlan);
router.put('/plans/:id', requirePlatformAuth, requirePlatformPermission('platform.plans.manage'), updatePlan);
router.delete('/plans/:id', requirePlatformAuth, requirePlatformPermission('platform.plans.manage'), deletePlan);

router.get('/settings', requirePlatformAuth, requirePlatformPermission('platform.settings.manage'), listPlatformSettings);
router.put('/settings', requirePlatformAuth, requirePlatformPermission('platform.settings.manage'), updatePlatformSettings);
router.post('/settings/test-smtp', requirePlatformAuth, requirePlatformPermission('platform.settings.manage'), testPlatformSmtp);

module.exports = router;

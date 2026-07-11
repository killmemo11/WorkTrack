// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
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
router.get('/plans', requirePlatformAuth, listPlans);
router.get('/plans/:id', requirePlatformAuth, getPlan);
router.post('/plans', requirePlatformAuth, createPlan);
router.put('/plans/:id', requirePlatformAuth, updatePlan);
router.delete('/plans/:id', requirePlatformAuth, deletePlan);

router.get('/settings', requirePlatformAuth, listPlatformSettings);
router.put('/settings', requirePlatformAuth, updatePlatformSettings);
router.post('/settings/test-smtp', requirePlatformAuth, testPlatformSmtp);

module.exports = router;

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
const { requirePlatformPermission } = require('../../shared/middleware/platform-permission.middleware');
const {
  listFlags,
  createFlag,
  updateFlag,
  getTenantRelease,
  updateTenantRelease,
} = require('./releases.controller');

router.use(requirePlatformAuth);

router.get('/flags', requirePlatformPermission('platform.releases.view'), listFlags);
router.post('/flags', requirePlatformPermission('platform.releases.manage'), createFlag);
router.put('/flags/:key', requirePlatformPermission('platform.releases.manage'), updateFlag);

router.get('/tenants/:id', requirePlatformPermission('platform.releases.view'), getTenantRelease);
router.put('/tenants/:id', requirePlatformPermission('platform.releases.manage'), updateTenantRelease);

module.exports = router;

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
const { requirePlatformPermission } = require('../../shared/middleware/platform-permission.middleware');
const { listSandboxes, createSandbox, resetSandbox, deleteSandbox } = require('./sandbox.controller');

router.use(requirePlatformAuth);

router.get('/', requirePlatformPermission('platform.sandbox.manage'), listSandboxes);
router.post('/', requirePlatformPermission('platform.sandbox.manage'), createSandbox);
router.post('/:id/reset', requirePlatformPermission('platform.sandbox.manage'), resetSandbox);
router.delete('/:id', requirePlatformPermission('platform.sandbox.manage'), deleteSandbox);

module.exports = router;

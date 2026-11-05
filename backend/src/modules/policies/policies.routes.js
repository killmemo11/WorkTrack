// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { resolveTenant } = require('../../shared/middleware/tenant.middleware');
const { listMyPolicies, acknowledgePolicy } = require('./policies.controller');

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', listMyPolicies);
router.post('/:id/acknowledge', acknowledgePolicy);

module.exports = router;

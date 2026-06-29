// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { requireCeo } = require('../../shared/middleware/ceo-auth.middleware');
const { getCeoDashboard } = require('./ceo.controller');

const router = Router();

router.get('/dashboard', authenticate, requireCeo, getCeoDashboard);

module.exports = router;

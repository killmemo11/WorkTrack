// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { requireITAuth } = require('../../shared/middleware/it-auth.middleware');
const { getSettings, updateSettings, testEmail, testMeeting } = require('./settings.controller');

const router = Router();

router.use(requireITAuth);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/test', testEmail);
router.post('/test-meeting', testMeeting);

module.exports = router;


// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { requireITAuth } = require('../../shared/middleware/it-auth.middleware');
const { login, me } = require('./admin-auth.controller');

const router = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts. Try again later.' } });

router.post('/login', loginLimiter, login);
router.get('/me', requireITAuth, me);

module.exports = router;


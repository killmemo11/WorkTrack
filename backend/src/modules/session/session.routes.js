// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { getSessionContext } = require('./session.controller');

// Single source of truth for "who am I, what can I do, where do I land".
router.get('/context', getSessionContext);

module.exports = router;

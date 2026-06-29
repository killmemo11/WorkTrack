// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { requireReadWrite } = require('../../shared/middleware/readonly.middleware');
const {
  signIn, signOut, status, history, missingSignOut, completeSignOut,
  monthlySummary, calendar, requestSignOut, getMySignOutRequests,
} = require('./attendance.controller');

const router = Router();

router.use(authenticate);

router.post('/sign-in', requireReadWrite, signIn);
router.post('/sign-out', requireReadWrite, signOut);
router.get('/status', status);
router.get('/history', history);
router.get('/missing', missingSignOut);
router.post('/request-signout', requireReadWrite, requestSignOut);
router.get('/my-signout-requests', getMySignOutRequests);
router.post('/complete-signout', requireReadWrite, completeSignOut);
router.get('/monthly-summary', monthlySummary);
router.get('/calendar', calendar);

module.exports = router;


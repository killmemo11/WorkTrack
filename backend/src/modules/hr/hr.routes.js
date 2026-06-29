// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { createRoutes } = require('../../shared/routes.factory');
const { requireService } = require('../../shared/middleware/service.middleware');
const { requireHR } = require('../../shared/middleware/hr.middleware');

const {
  createRequest, getRequests, approveRequest, rejectRequest,
} = require('./headcount-request.controller');

const router = createRoutes(requireHR);

router.post('/headcount-requests', requireService('service_recruitment', 'Recruitment is disabled'), createRequest);
router.get('/headcount-requests', requireService('service_recruitment', 'Recruitment is disabled'), getRequests);
router.put('/headcount-requests/:id/approve', requireService('service_recruitment', 'Recruitment is disabled'), approveRequest);
router.put('/headcount-requests/:id/reject', requireService('service_recruitment', 'Recruitment is disabled'), rejectRequest);

module.exports = router;

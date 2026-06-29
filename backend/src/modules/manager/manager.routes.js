// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { authenticate } = require('../../shared/middleware/auth.middleware');
const { requireManager } = require('../../shared/middleware/manager-auth.middleware');
const { requireLeaveService } = require('../../shared/middleware/leave-service.middleware');
const { getManagerPendingLeaves, managerApproveLeave, managerRejectLeave, getManagerPendingSignoutRequests, managerApproveSignoutRequest, managerRejectSignoutRequest, getManagerApprovalsCount } = require('./manager-leave.controller');
const { getManagerTeamDashboard } = require('./manager.controller');
const { getDepartments } = require('../admin/department.controller');
const { getDepartmentTitles } = require('../personnel/personnel.controller');
const { createRequest, getMyRequests } = require('../hr/headcount-request.controller');
const { getManagerPendingResignations, managerApproveResignation, managerRejectResignation } = require('./manager-resignation.controller');

const router = Router();

router.use(authenticate, requireManager);

router.get('/approvals/count', getManagerApprovalsCount);
router.get('/approvals', requireLeaveService, getManagerPendingLeaves);
router.put('/approvals/:id/approve', requireLeaveService, managerApproveLeave);
router.put('/approvals/:id/reject', requireLeaveService, managerRejectLeave);
router.get('/signout-requests', getManagerPendingSignoutRequests);
router.put('/signout-requests/:id/approve', managerApproveSignoutRequest);
router.put('/signout-requests/:id/reject', managerRejectSignoutRequest);
router.get('/resignations', getManagerPendingResignations);
router.put('/resignations/:id/approve', managerApproveResignation);
router.put('/resignations/:id/reject', managerRejectResignation);
router.get('/team', getManagerTeamDashboard);
router.get('/headcount-requests', getMyRequests);
router.post('/headcount-requests', createRequest);
router.get('/departments', getDepartments);
router.get('/department-titles', getDepartmentTitles);

module.exports = router;

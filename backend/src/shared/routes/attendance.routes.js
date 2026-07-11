// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Attendance domain routes — extracted from routes.factory.js
const {
  getRecords, deleteRecord, exportExcel, getStats, getMonthlyReport,
  getPendingSignoutRequests, adminApproveSignoutRequest, adminRejectSignoutRequest, updateRecordSignOut,
  triggerMissingSignOutCheck,
} = require('../../modules/admin/admin.controller');
const { requireService } = require('../middleware/service.middleware');

function mountAttendanceRoutes(router) {
  router.get('/records', getRecords);
  router.delete('/records/:id', deleteRecord);
  router.get('/export', exportExcel);
  router.get('/stats', getStats);
  router.get('/report/monthly', getMonthlyReport);

  const officeRouter = require('express').Router();
  officeRouter.put('/records/:id/signout', updateRecordSignOut);
  officeRouter.get('/signout-requests', getPendingSignoutRequests);
  officeRouter.put('/signout-requests/:id/approve', adminApproveSignoutRequest);
  officeRouter.put('/signout-requests/:id/reject', adminRejectSignoutRequest);
  officeRouter.post('/reminders/missing-signout', triggerMissingSignOutCheck);
  router.use(requireService('service_office_attendance', 'Office attendance is disabled'), officeRouter);
}

module.exports = { mountAttendanceRoutes };

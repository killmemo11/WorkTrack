// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Attendance domain routes — extracted from routes.factory.js
const {
  getRecords, deleteRecord, exportExcel, getStats, getMonthlyReport,
  getPendingSignoutRequests, adminApproveSignoutRequest, adminRejectSignoutRequest, updateRecordSignOut,
  triggerMissingSignOutCheck,
} = require('../../modules/admin/admin.controller');

function mountAttendanceRoutes(router) {
  router.get('/records', getRecords);
  router.delete('/records/:id', deleteRecord);
  router.put('/records/:id/signout', updateRecordSignOut);
  router.get('/export', exportExcel);
  router.get('/signout-requests', getPendingSignoutRequests);
  router.put('/signout-requests/:id/approve', adminApproveSignoutRequest);
  router.put('/signout-requests/:id/reject', adminRejectSignoutRequest);
  router.get('/stats', getStats);
  router.get('/report/monthly', getMonthlyReport);
  router.post('/reminders/missing-signout', triggerMissingSignOutCheck);
}

module.exports = { mountAttendanceRoutes };

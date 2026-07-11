// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Leave & Holiday domain routes — extracted from routes.factory.js
const {
  getHolidays, createHoliday, deleteHoliday,
} = require('../../modules/admin/holiday.controller');
const {
  getAllLeaves, approveLeave, rejectLeave, updateLeaveBalance,
} = require('../../modules/admin/admin-leave.controller');
const {
  getLeaveTypes, updateLeaveType, resetLeaveBalances,
} = require('../../modules/admin/leave-type.controller');

function mountLeaveRoutes(router) {
  router.get('/holidays', getHolidays);
  router.post('/holidays', createHoliday);
  router.delete('/holidays/:id', deleteHoliday);

  router.get('/leaves', getAllLeaves);
  router.put('/leaves/:id/approve', approveLeave);
  router.put('/leaves/:id/reject', rejectLeave);
  router.put('/employees/:id/balance', updateLeaveBalance);

  router.get('/leave-types', getLeaveTypes);
  router.put('/leave-types/:id', updateLeaveType);
  router.post('/leave-balances/reset', resetLeaveBalances);
}

module.exports = { mountLeaveRoutes };

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { exportKayanReport, exportAttendanceReport, exportLeaveReport, exportEmployeeSummary } = require('./reports.controller');

const router = Router();

router.get('/kayan', exportKayanReport);
router.get('/attendance', exportAttendanceReport);
router.get('/leaves', exportLeaveReport);
router.get('/summary', exportEmployeeSummary);

module.exports = router;

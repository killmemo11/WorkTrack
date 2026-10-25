// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { exportKayanReport, exportAttendanceReport, exportLeaveReport, exportEmployeeSummary } = require('./reports.controller');
const { getHeadcount } = require('../personnel/personnel.controller');
const exportLimiter = require('../../shared/middleware/export-limit.middleware');

const router = Router();

router.get('/kayan', exportLimiter, exportKayanReport);
router.get('/attendance', exportLimiter, exportAttendanceReport);
router.get('/leaves', exportLimiter, exportLeaveReport);
router.get('/summary', exportLimiter, exportEmployeeSummary);
router.get('/headcount', getHeadcount);

module.exports = router;

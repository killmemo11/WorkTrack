// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
const { requirePlatformPermission } = require('../../shared/middleware/platform-permission.middleware');
const {
  listInvoices,
  getInvoice,
  createInvoice,
  sendInvoice,
  remindInvoice,
  markInvoicePaid,
  voidInvoice,
  getBillingSummary,
} = require('./billing.controller');

router.use(requirePlatformAuth);

router.get('/summary', requirePlatformPermission('platform.billing.view'), getBillingSummary);
router.get('/invoices', requirePlatformPermission('platform.billing.view'), listInvoices);
router.get('/invoices/:id', requirePlatformPermission('platform.billing.view'), getInvoice);
router.post('/invoices', requirePlatformPermission('platform.billing.manage'), createInvoice);
router.post('/invoices/:id/send', requirePlatformPermission('platform.billing.manage'), sendInvoice);
router.post('/invoices/:id/remind', requirePlatformPermission('platform.billing.manage'), remindInvoice);
router.post('/invoices/:id/paid', requirePlatformPermission('platform.billing.manage'), markInvoicePaid);
router.post('/invoices/:id/void', requirePlatformPermission('platform.billing.manage'), voidInvoice);

module.exports = router;

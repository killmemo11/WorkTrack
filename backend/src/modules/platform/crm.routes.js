// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const express = require('express');
const router = express.Router();
const { requirePlatformAuth } = require('../../shared/middleware/platform-auth.middleware');
const { requirePlatformPermission } = require('../../shared/middleware/platform-permission.middleware');
const {
  getOverview,
  listContacts,
  getContact,
  createContact,
  updateContact,
  addActivity,
  deleteContact,
} = require('./crm.controller');

router.use(requirePlatformAuth);

router.get('/overview', requirePlatformPermission('platform.crm.view'), getOverview);

router.get('/contacts', requirePlatformPermission('platform.crm.view'), listContacts);
router.get('/contacts/:id', requirePlatformPermission('platform.crm.view'), getContact);
router.post('/contacts', requirePlatformPermission('platform.crm.manage'), createContact);
router.put('/contacts/:id', requirePlatformPermission('platform.crm.manage'), updateContact);
router.delete('/contacts/:id', requirePlatformPermission('platform.crm.manage'), deleteContact);
router.post('/contacts/:id/activities', requirePlatformPermission('platform.crm.manage'), addActivity);

module.exports = router;

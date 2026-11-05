// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const { requirePermission } = require('../../shared/middleware/rbac.middleware');
const {
  listPolicies,
  createPolicy,
  updatePolicy,
  publishPolicy,
  createNewVersion,
  deletePolicy,
  listPolicyAcknowledgements,
} = require('../policies/policies.controller');

const router = Router();
const manage = requirePermission('admin.manage_policies');

router.get('/', manage, listPolicies);
router.post('/', manage, createPolicy);
router.put('/:id', manage, updatePolicy);
router.post('/:id/publish', manage, publishPolicy);
router.post('/:id/new-version', manage, createNewVersion);
router.delete('/:id', manage, deletePolicy);
router.get('/:id/acknowledgements', manage, listPolicyAcknowledgements);

module.exports = router;

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate: requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireReadWrite } = require('../../shared/middleware/readonly.middleware');
const { resolveTenant } = require('../../shared/middleware/tenant.middleware');
const { getPersonnelDir } = require('../../shared/config/storage');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getPersonnelDir()),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP images and PDF files are allowed.'));
  },
});

const router = Router();

const requireAuthAndTenant = (req, res, next) => requireAuth(req, res, (err) => {
  if (err) return next(err);
  resolveTenant(req, res, next);
});

const {
  getMyProfile, updateMyProfile, getMyDocuments,
  getOrganization,
  uploadAvatar,
  submitResignation,
  getEmployeeDashboard,
  updateGoalProgress,
  searchDocuments,
  getDocumentPreview,
} = require('./personnel.controller');
const {
  getMyAssets, getMyAssetHistory,
} = require('../admin/admin-asset.controller');
const {
  getMyContracts, getMyContractContent, downloadContractPdf,
} = require('../admin/admin-contract.controller');
const {
  getMyPendingTasks,
} = require('../admin/admin-checklist.controller');

router.get('/my-profile', requireAuthAndTenant, getMyProfile);
router.put('/my-profile', requireAuthAndTenant, requireReadWrite, updateMyProfile);
router.get('/my-documents', requireAuthAndTenant, getMyDocuments);
router.get('/my-documents/search', requireAuthAndTenant, searchDocuments);
router.get('/my-documents/:docId/preview', requireAuthAndTenant, getDocumentPreview);
router.get('/organization-chart', requireAuthAndTenant, getOrganization);
router.post('/my-avatar', requireAuthAndTenant, upload.single('file'), (req, res, next) => { req.params.id = req.employee.id; next(); }, uploadAvatar);
router.post('/resignation', requireAuthAndTenant, requireReadWrite, submitResignation);
router.get('/my-assets', requireAuthAndTenant, getMyAssets);
router.get('/dashboard', requireAuthAndTenant, getEmployeeDashboard);
router.get('/my-assets/history', requireAuthAndTenant, getMyAssetHistory);
router.get('/my-contracts', requireAuthAndTenant, getMyContracts);
router.get('/my-contracts/:id/content', requireAuthAndTenant, getMyContractContent);
router.get('/my-contracts/:cid/pdf', requireAuthAndTenant, (req, res, next) => { req.params.id = req.employee.id; next(); }, downloadContractPdf);
router.get('/my-pending-tasks', requireAuthAndTenant, getMyPendingTasks);
router.patch('/goals/:goalId/progress', requireAuthAndTenant, requireReadWrite, updateGoalProgress);

module.exports = router;

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { authenticate: requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireReadWrite } = require('../../shared/middleware/readonly.middleware');
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

const {
  getMyProfile, updateMyProfile, getMyDocuments,
  getOrganization,
  uploadAvatar,
  submitResignation,
  getEmployeeDashboard,
  updateGoalProgress,
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

router.get('/my-profile', requireAuth, getMyProfile);
router.put('/my-profile', requireAuth, requireReadWrite, updateMyProfile);
router.get('/my-documents', requireAuth, getMyDocuments);
router.get('/organization-chart', requireAuth, getOrganization);
router.post('/my-avatar', requireAuth, upload.single('file'), (req, res, next) => { req.params.id = req.employee.id; next(); }, uploadAvatar);
router.post('/resignation', requireAuth, requireReadWrite, submitResignation);
router.get('/my-assets', requireAuth, getMyAssets);
router.get('/dashboard', requireAuth, getEmployeeDashboard);
router.get('/my-assets/history', requireAuth, getMyAssetHistory);
router.get('/my-contracts', requireAuth, getMyContracts);
router.get('/my-contracts/:id/content', requireAuth, getMyContractContent);
router.get('/my-contracts/:cid/pdf', requireAuth, (req, res, next) => { req.params.id = req.employee.id; next(); }, downloadContractPdf);
router.get('/my-pending-tasks', requireAuth, getMyPendingTasks);
router.patch('/goals/:goalId/progress', requireAuth, requireReadWrite, updateGoalProgress);

module.exports = router;

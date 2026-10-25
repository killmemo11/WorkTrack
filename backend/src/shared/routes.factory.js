// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const multer = require('multer');
const { getPersonnelDir } = require('./config/storage');
const {
  PERSONNEL_EXTENSIONS, SPREADSHEET_EXTENSIONS,
  extensionAllowed, invalidFileType, safeExtension,
} = require('./utils/upload-security');

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (extensionAllowed(file.originalname, SPREADSHEET_EXTENSIONS)) return cb(null, true);
    cb(invalidFileType(SPREADSHEET_EXTENSIONS));
  },
});

const crypto = require('crypto');
const personnelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getPersonnelDir()),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExtension(file.originalname)}`);
  },
});
const personnelUpload = multer({
  storage: personnelStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (extensionAllowed(file.originalname, PERSONNEL_EXTENSIONS)) return cb(null, true);
    cb(invalidFileType(PERSONNEL_EXTENSIONS));
  },
});

const { mountAttendanceRoutes } = require('./routes/attendance.routes');
const { mountDepartmentRoutes } = require('./routes/department.routes');
const { mountLeaveRoutes } = require('./routes/leave.routes');
const { mountEmployeeRoutes } = require('./routes/employee.routes');
const { mountDocumentRoutes } = require('./routes/document.routes');
const { mountAssetRoutes } = require('./routes/asset.routes');
const { requireService } = require('./middleware/service.middleware');
const { resolveTenant, requireEmployeeInTenant } = require('./middleware/tenant.middleware');

function createRoutes(requireAuth) {
  const router = Router();
  router.use(requireAuth);
  router.use(resolveTenant);

  mountAttendanceRoutes(router);

  const peopleRouter = Router();
  // Every /employees/:id/* route must reference an employee owned by the caller's tenant.
  peopleRouter.use('/employees/:id', requireEmployeeInTenant);
  mountDepartmentRoutes(peopleRouter, memoryUpload);
  mountEmployeeRoutes(peopleRouter, personnelUpload);
  mountDocumentRoutes(peopleRouter);
  router.use(requireService('service_people', 'People management is disabled'), peopleRouter);

  const leaveRouter = Router();
  mountLeaveRoutes(leaveRouter);
  router.use(requireService('service_leaves', 'Leave management is disabled'), leaveRouter);

  const assetRouter = Router();
  mountAssetRoutes(assetRouter);
  router.use(requireService('service_assets', 'Assets module is disabled'), assetRouter);

  return router;
}

module.exports = { createRoutes, memoryUpload, personnelUpload };

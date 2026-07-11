// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { getPersonnelDir } = require('./config/storage');

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const memoryUpload = multer({ storage: multer.memoryStorage() });

const personnelStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, getPersonnelDir()),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const personnelUpload = multer({
  storage: personnelStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX files are allowed.'));
  },
});

const { mountAttendanceRoutes } = require('./routes/attendance.routes');
const { mountDepartmentRoutes } = require('./routes/department.routes');
const { mountLeaveRoutes } = require('./routes/leave.routes');
const { mountEmployeeRoutes } = require('./routes/employee.routes');
const { mountDocumentRoutes } = require('./routes/document.routes');
const { mountAssetRoutes } = require('./routes/asset.routes');

function createRoutes(requireAuth) {
  const router = Router();
  router.use(requireAuth);

  mountAttendanceRoutes(router);
  mountDepartmentRoutes(router, memoryUpload);
  mountLeaveRoutes(router);
  mountEmployeeRoutes(router, personnelUpload);
  mountDocumentRoutes(router);
  mountAssetRoutes(router);

  return router;
}

module.exports = { createRoutes, memoryUpload, personnelUpload };

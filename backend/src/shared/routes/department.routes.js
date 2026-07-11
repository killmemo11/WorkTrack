// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Department domain routes — extracted from routes.factory.js
const {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  downloadTemplate, importDepartments,
} = require('../../modules/admin/department.controller');

function mountDepartmentRoutes(router, memoryUpload) {
  router.get('/departments', getDepartments);
  router.post('/departments', createDepartment);
  router.put('/departments/:id', updateDepartment);
  router.delete('/departments/:id', deleteDepartment);
  router.get('/departments/template', downloadTemplate);
  router.post('/departments/import', memoryUpload.single('file'), importDepartments);
}

module.exports = { mountDepartmentRoutes };

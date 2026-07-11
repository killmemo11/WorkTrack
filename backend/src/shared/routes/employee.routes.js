// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Employee & Personnel domain routes — extracted from routes.factory.js
const {
  getEmployees, getEmployee, updateEmployee, deleteEmployee,
} = require('../../modules/admin/admin.controller');
const {
  getPositions, createPosition, updatePosition, deletePosition,
  getEmployeeProfile, updateEmployeeProfile,
  uploadDocument, deleteDocument,
  uploadInsuranceCard,
  uploadAvatar,
  addMedicalFamily, updateMedicalFamily, deleteMedicalFamily, uploadMedicalFamilyCard,
  addEducation, updateEducation, deleteEducation,
  addWorkHistory, updateWorkHistory, deleteWorkHistory,
  addCertification, deleteCertification,
  changeEmployeeStatus, getEmployeeTimeline,
  getOrganization, getHeadcount,
  exportProfiles, importProfiles,
  renewContract,
  getGrades, createGrade, updateGrade, deleteGrade,
  getDepartmentTitles, createDepartmentTitle, updateDepartmentTitle, deleteDepartmentTitle,
  getEvaluationCriteria, saveEvaluationCriteria,
  getEmployeeGoals, createEmployeeGoal, updateEmployeeGoal, deleteEmployeeGoal,
} = require('../../modules/personnel/personnel.controller');
const {
  getSalaryComponents, addSalaryComponent, updateSalaryComponent, deleteSalaryComponent,
} = require('../../modules/admin/salary.controller');

function mountEmployeeRoutes(router, personnelUpload) {
  router.get('/employees', getEmployees);
  router.get('/employees/:id', getEmployee);
  router.put('/employees/:id', updateEmployee);
  router.delete('/employees/:id', deleteEmployee);

  router.get('/employees/:id/profile', getEmployeeProfile);
  router.put('/employees/:id/profile', updateEmployeeProfile);
  router.post('/employees/:id/documents', personnelUpload.single('file'), uploadDocument);
  router.post('/employees/:id/insurance-card', personnelUpload.single('file'), uploadInsuranceCard);
  router.post('/employees/:id/avatar', personnelUpload.single('file'), uploadAvatar);
  router.delete('/employees/:id/documents/:docId', deleteDocument);
  router.post('/employees/:id/education', addEducation);
  router.put('/employees/:id/education/:eduId', updateEducation);
  router.delete('/employees/:id/education/:eduId', deleteEducation);
  router.post('/employees/:id/work-history', addWorkHistory);
  router.put('/employees/:id/work-history/:whId', updateWorkHistory);
  router.delete('/employees/:id/work-history/:whId', deleteWorkHistory);
  router.post('/employees/:id/certifications', addCertification);
  router.delete('/employees/:id/certifications/:certId', deleteCertification);
  router.post('/employees/:id/medical-family', personnelUpload.single('card_image'), addMedicalFamily);
  router.put('/employees/:id/medical-family/:famId', personnelUpload.single('card_image'), updateMedicalFamily);
  router.delete('/employees/:id/medical-family/:famId', deleteMedicalFamily);
  router.post('/employees/:id/medical-family/:famId/upload-card', personnelUpload.single('file'), uploadMedicalFamilyCard);
  router.post('/employees/:id/status-change', changeEmployeeStatus);
  router.get('/employees/:id/timeline', getEmployeeTimeline);
  router.post('/employees/:id/renew-contract', renewContract);

  router.get('/employees/:id/salary', getSalaryComponents);
  router.post('/employees/:id/salary', addSalaryComponent);
  router.put('/employees/:id/salary/:compId', updateSalaryComponent);
  router.delete('/employees/:id/salary/:compId', deleteSalaryComponent);

  router.get('/employees/:id/goals', getEmployeeGoals);
  router.post('/employees/:id/goals', createEmployeeGoal);
  router.put('/employees/:id/goals/:goalId', updateEmployeeGoal);
  router.delete('/employees/:id/goals/:goalId', deleteEmployeeGoal);

  router.get('/positions', getPositions);
  router.post('/positions', createPosition);
  router.put('/positions/:id', updatePosition);
  router.delete('/positions/:id', deletePosition);

  router.get('/grades', getGrades);
  router.post('/grades', createGrade);
  router.put('/grades/:id', updateGrade);
  router.delete('/grades/:id', deleteGrade);

  router.get('/department-titles', getDepartmentTitles);
  router.post('/department-titles', createDepartmentTitle);
  router.put('/department-titles/:id', updateDepartmentTitle);
  router.delete('/department-titles/:id', deleteDepartmentTitle);

  router.get('/evaluation-criteria', getEvaluationCriteria);
  router.post('/evaluation-criteria', saveEvaluationCriteria);

  router.get('/organization-chart', getOrganization);
  router.get('/reports/headcount', getHeadcount);

  router.get('/profiles/export', exportProfiles);
  router.post('/profiles/import', personnelUpload.single('file'), importProfiles);
}

module.exports = { mountEmployeeRoutes };

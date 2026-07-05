// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { getPersonnelDir } = require('./config/storage');

const {
  getEmployees, getEmployee, updateEmployee, deleteEmployee,
  getRecords, deleteRecord, exportExcel, getStats, getMonthlyReport,
  getPendingSignoutRequests, adminApproveSignoutRequest, adminRejectSignoutRequest, updateRecordSignOut,
  triggerMissingSignOutCheck,
} = require('../modules/admin/admin.controller');
const {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  downloadTemplate, importDepartments,
} = require('../modules/admin/department.controller');
const {
  getHolidays, createHoliday, deleteHoliday,
} = require('../modules/admin/holiday.controller');
const {
  getAllLeaves, approveLeave, rejectLeave, updateLeaveBalance,
} = require('../modules/admin/admin-leave.controller');
const {
  getAllResignations, adminApproveResignation, adminRejectResignation,
} = require('../modules/admin/admin-resignation.controller');
const {
  getLeaveTypes, updateLeaveType, resetLeaveBalances,
} = require('../modules/admin/leave-type.controller');
const {
  getAdminNotifications, getAdminUnreadCount, markAdminAsRead, markAllAdminAsRead,
} = require('../modules/notification/notification.controller');
const {
  getAssets, getAsset, createAsset, updateAsset, deleteAsset,
  assignAsset, returnAsset, markDamaged, disposeAsset,
  getAssetHistory,
} = require('../modules/admin/admin-asset.controller');
const {
  getPendingDocuments, getAllDocuments, verifyDocument, rejectDocument,
} = require('../modules/admin/admin-document.controller');
const { getIdCard } = require('../modules/admin/admin-idcard.controller');
const {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  generateContract, signContract, getEmployeeContracts, downloadContractPdf,
} = require('../modules/admin/admin-contract.controller');
const {
  getSalaryComponents, addSalaryComponent, updateSalaryComponent, deleteSalaryComponent,
} = require('../modules/admin/salary.controller');
const {
  getChecklistTemplates, createChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
  startEmployeeChecklist, getEmployeeChecklists, getChecklistDetail, completeTask,
} = require('../modules/admin/admin-checklist.controller');
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
} = require('../modules/personnel/personnel.controller');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

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
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP images and PDF files are allowed.'));
  },
});

function createRoutes(requireAuth) {
  const router = Router();
  router.use(requireAuth);

  router.get('/employees', getEmployees);
  router.get('/employees/:id', getEmployee);
  router.put('/employees/:id', updateEmployee);
  router.delete('/employees/:id', deleteEmployee);
  router.put('/employees/:id/balance', updateLeaveBalance);
  router.get('/records', getRecords);
  router.delete('/records/:id', deleteRecord);
  router.put('/records/:id/signout', updateRecordSignOut);
  router.get('/export', exportExcel);
  router.get('/signout-requests', getPendingSignoutRequests);
  router.put('/signout-requests/:id/approve', adminApproveSignoutRequest);
  router.put('/signout-requests/:id/reject', adminRejectSignoutRequest);
  router.get('/stats', getStats);
  router.get('/report/monthly', getMonthlyReport);
  router.post('/reminders/missing-signout', triggerMissingSignOutCheck);

  router.get('/departments', getDepartments);
  router.post('/departments', createDepartment);
  router.put('/departments/:id', updateDepartment);
  router.delete('/departments/:id', deleteDepartment);
  router.get('/departments/template', downloadTemplate);
  router.post('/departments/import', memoryUpload.single('file'), importDepartments);

  router.get('/holidays', getHolidays);
  router.post('/holidays', createHoliday);
  router.delete('/holidays/:id', deleteHoliday);

  router.get('/leaves', getAllLeaves);
  router.put('/leaves/:id/approve', approveLeave);
  router.put('/leaves/:id/reject', rejectLeave);

  router.get('/leave-types', getLeaveTypes);
  router.put('/leave-types/:id', updateLeaveType);
  router.post('/leave-balances/reset', resetLeaveBalances);

  router.get('/notifications', getAdminNotifications);
  router.get('/notifications/unread-count', getAdminUnreadCount);
  router.put('/notifications/read-all', markAllAdminAsRead);
  router.put('/notifications/:id/read', markAdminAsRead);

  router.get('/assets', getAssets);
  router.get('/assets/:id', getAsset);
  router.post('/assets', createAsset);
  router.put('/assets/:id', updateAsset);
  router.delete('/assets/:id', deleteAsset);
  router.post('/assets/:id/assign', assignAsset);
  router.post('/assets/:id/return', returnAsset);
  router.post('/assets/:id/damaged', markDamaged);
  router.post('/assets/:id/dispose', disposeAsset);
  router.get('/assets/:id/history', getAssetHistory);

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

  router.get('/employees/:id/goals', getEmployeeGoals);
  router.post('/employees/:id/goals', createEmployeeGoal);
  router.put('/employees/:id/goals/:goalId', updateEmployeeGoal);
  router.delete('/employees/:id/goals/:goalId', deleteEmployeeGoal);

  router.get('/employees/:id/salary', getSalaryComponents);
  router.post('/employees/:id/salary', addSalaryComponent);
  router.put('/employees/:id/salary/:compId', updateSalaryComponent);
  router.delete('/employees/:id/salary/:compId', deleteSalaryComponent);

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

  router.get('/resignations', getAllResignations);
  router.put('/resignations/:id/approve', adminApproveResignation);
  router.put('/resignations/:id/reject', adminRejectResignation);

  router.get('/organization-chart', getOrganization);
  router.get('/reports/headcount', getHeadcount);

  router.get('/profiles/export', exportProfiles);
  router.post('/profiles/import', memoryUpload.single('file'), importProfiles);

  router.get('/documents/pending', getPendingDocuments);
  router.get('/documents', getAllDocuments);
  router.put('/documents/:id/verify', verifyDocument);
  router.put('/documents/:id/reject', rejectDocument);

  router.get('/employees/:id/id-card', getIdCard);

  router.get('/contract-templates', getTemplates);
  router.post('/contract-templates', createTemplate);
  router.put('/contract-templates/:id', updateTemplate);
  router.delete('/contract-templates/:id', deleteTemplate);
  router.post('/employees/:id/contracts/generate', generateContract);
  router.post('/employees/:id/contracts/:cid/sign', signContract);
  router.get('/employees/:id/contracts', getEmployeeContracts);
  router.get('/employees/:id/contracts/:cid/pdf', downloadContractPdf);

  router.get('/checklist-templates', getChecklistTemplates);
  router.post('/checklist-templates', createChecklistTemplate);
  router.put('/checklist-templates/:id', updateChecklistTemplate);
  router.delete('/checklist-templates/:id', deleteChecklistTemplate);
  router.post('/checklist-templates/:template_id/items', addChecklistItem);
  router.put('/checklist-items/:item_id', updateChecklistItem);
  router.delete('/checklist-items/:item_id', deleteChecklistItem);
  router.post('/employees/:id/checklists/start', startEmployeeChecklist);
  router.get('/employees/:id/checklists', getEmployeeChecklists);
  router.get('/checklists/:checklist_id', getChecklistDetail);
  router.put('/checklists/:checklist_id/tasks/:task_id/complete', completeTask);

  return router;
}

module.exports = { createRoutes, memoryUpload, personnelUpload }; 

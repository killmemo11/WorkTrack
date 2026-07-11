// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

// Documents, Contracts, Checklists domain routes — extracted from routes.factory.js
const {
  getPendingDocuments, getAllDocuments, verifyDocument, rejectDocument,
} = require('../../modules/admin/admin-document.controller');
const { getIdCard } = require('../../modules/admin/admin-idcard.controller');
const {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  generateContract, signContract, getEmployeeContracts, downloadContractPdf,
} = require('../../modules/admin/admin-contract.controller');
const {
  getChecklistTemplates, createChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate,
  addChecklistItem, updateChecklistItem, deleteChecklistItem,
  startEmployeeChecklist, getEmployeeChecklists, getChecklistDetail, completeTask,
} = require('../../modules/admin/admin-checklist.controller');

function mountDocumentRoutes(router) {
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
}

module.exports = { mountDocumentRoutes };

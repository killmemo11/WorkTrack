// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const multer = require('multer');
const { requireITAuth } = require('../../shared/middleware/it-auth.middleware');
const { requirePasswordChangeGate } = require('../../shared/middleware/password-gate.middleware');
const { requireHR } = require('../../shared/middleware/hr.middleware');

const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const {
  listJobs, createJob, updateJob, deleteJob,
  listCandidates, getCandidate, createCandidate, updateCandidate, deleteCandidate,
  moveCandidate, uploadCv, attachCv,
  getScorecards, addScorecard, createOffer,
  exportCandidates, hireCandidate,
  listOffers, updateOffer,
  listInterviews, createInterview, updateInterview,
  getRecruitmentStats,
  listHRStaff, getMeetingStatus,
} = require('./recruitment.controller');

const {
  getPhoneScreening, logCallAttempt, submitEvaluation, checkAutoReject,
  listTemplates: listPSTemplates, getTemplate: getPSTemplate,
  createTemplate: createPSTemplate, updateTemplate: updatePSTemplate, deleteTemplate: deletePSTemplate,
  addQuestion, updateQuestion, deleteQuestion, deleteCallLogEntry,
} = require('./phoneScreening.controller');

const {
  listTemplates: listWfTemplates, getTemplate: getWfTemplate,
  createTemplate: createWfTemplate, updateTemplate: updateWfTemplate, deleteTemplate: deleteWfTemplate,
  listStages, createStage, updateStage, deleteStage,
  listRules, createRule, updateRule, deleteRule,
  listEvents,
  getAvailability, upsertWeeklySlot, deleteWeeklySlot, blockDate, unblockDate,
} = require('./workflow.controller');

const {
  listTemplates: listMsgTemplates, getTemplate: getMsgTemplate,
  createTemplate: createMsgTemplate, updateTemplate: updateMsgTemplate, deleteTemplate: deleteMsgTemplate,
  renderPreview,
} = require('./message-template.controller');

const {
  listInterviewStages, getInterviewStage, createInterviewStage, updateInterviewStage, deleteInterviewStage,
  listEvaluations, createEvaluation, updateEvaluation, deleteEvaluation,
  migrateInterviews, migrateCandidateWorkflows,
} = require('./interview-stages.controller');

const adminRouter = Router();
adminRouter.use(requireITAuth);
adminRouter.use(requirePasswordChangeGate);

const hrRouter = Router();
hrRouter.use(requireHR);

// ── Admin routes ───────────────────────────────────────────────
adminRouter.get('/jobs', listJobs);
adminRouter.post('/jobs', createJob);
adminRouter.put('/jobs/:id', updateJob);
adminRouter.delete('/jobs/:id', deleteJob);

adminRouter.get('/candidates', listCandidates);
adminRouter.get('/candidates/:id', getCandidate);
adminRouter.post('/candidates', createCandidate);
adminRouter.put('/candidates/:id', updateCandidate);
adminRouter.delete('/candidates/:id', deleteCandidate);
adminRouter.post('/candidates/:id/move', moveCandidate);
adminRouter.post('/candidates/:id/cv', attachCv);
adminRouter.get('/candidates/:id/scorecards', getScorecards);
adminRouter.post('/candidates/:id/scorecards', addScorecard);
adminRouter.post('/candidates/:id/offer', createOffer);
adminRouter.post('/candidates/:id/hire', hireCandidate);
adminRouter.get('/candidates/export', exportCandidates);
adminRouter.get('/offers', listOffers);
adminRouter.put('/offers/:id', updateOffer);
adminRouter.get('/interviews', listInterviews);
adminRouter.post('/interviews', createInterview);
adminRouter.put('/interviews/:id', updateInterview);

adminRouter.get('/hr-staff', listHRStaff);
adminRouter.get('/meeting-status', getMeetingStatus);
adminRouter.post('/upload/cv', memoryUpload.single('file'), uploadCv);
adminRouter.get('/stats', getRecruitmentStats);

// ── Phone Screening routes (admin) ───────────────────────────
adminRouter.get('/candidates/:id/phone-screening', getPhoneScreening);
adminRouter.post('/candidates/:id/phone-screening/log', logCallAttempt);
adminRouter.post('/candidates/:id/phone-screening/evaluate', submitEvaluation);
adminRouter.get('/candidates/:id/phone-screening/auto-reject', checkAutoReject);
adminRouter.get('/phone-screening/templates', listPSTemplates);
adminRouter.get('/phone-screening/templates/:id', getPSTemplate);
adminRouter.post('/phone-screening/templates', createPSTemplate);
adminRouter.put('/phone-screening/templates/:id', updatePSTemplate);
adminRouter.delete('/phone-screening/templates/:id', deletePSTemplate);
adminRouter.post('/phone-screening/templates/:id/questions', addQuestion);
adminRouter.put('/phone-screening/questions/:id', updateQuestion);
adminRouter.delete('/phone-screening/questions/:id', deleteQuestion);
adminRouter.delete('/phone-screening/call-log/:id', deleteCallLogEntry);

// ── Interview Stages routes (admin) ─────────────────────────
adminRouter.get('/interview-stages', listInterviewStages);
adminRouter.get('/interview-stages/:id', getInterviewStage);
adminRouter.post('/interview-stages', createInterviewStage);
adminRouter.put('/interview-stages/:id', updateInterviewStage);
adminRouter.delete('/interview-stages/:id', deleteInterviewStage);
adminRouter.get('/interview-stages/:interview_stage_id/evaluations', listEvaluations);
adminRouter.post('/interview-stages/:interview_stage_id/evaluations', createEvaluation);
adminRouter.put('/evaluations/:id', updateEvaluation);
adminRouter.delete('/evaluations/:id', deleteEvaluation);

// ── Interview Migration (admin) ──────────────────────────────
adminRouter.post('/interview-stages/migrate', migrateInterviews);
adminRouter.post('/interview-stages/migrate-workflows', migrateCandidateWorkflows);

// ── Workflow Template routes (admin) ─────────────────────────
adminRouter.get('/workflows', listWfTemplates);
adminRouter.get('/workflows/:id', getWfTemplate);
adminRouter.post('/workflows', createWfTemplate);
adminRouter.put('/workflows/:id', updateWfTemplate);
adminRouter.delete('/workflows/:id', deleteWfTemplate);

// ── Workflow Stage routes (admin) ────────────────────────────
adminRouter.get('/workflow-stages', listStages);
adminRouter.post('/workflow-stages', createStage);
adminRouter.put('/workflow-stages/:id', updateStage);
adminRouter.delete('/workflow-stages/:id', deleteStage);

// ── Workflow Rule routes (admin) ─────────────────────────────
adminRouter.get('/workflow-rules', listRules);
adminRouter.post('/workflow-rules', createRule);
adminRouter.put('/workflow-rules/:id', updateRule);
adminRouter.delete('/workflow-rules/:id', deleteRule);

// ── Workflow Events (admin) ──────────────────────────────────
adminRouter.get('/workflow-events', listEvents);

// ── Message Template routes (admin) ──────────────────────────
adminRouter.get('/message-templates', listMsgTemplates);
adminRouter.get('/message-templates/:id', getMsgTemplate);
adminRouter.post('/message-templates', createMsgTemplate);
adminRouter.put('/message-templates/:id', updateMsgTemplate);
adminRouter.delete('/message-templates/:id', deleteMsgTemplate);
adminRouter.post('/message-templates/:id/preview', renderPreview);

// ── Manager Availability routes (admin) ──────────────────────
adminRouter.get('/availability/:employee_id', getAvailability);
adminRouter.post('/availability/:employee_id/weekly', upsertWeeklySlot);
adminRouter.delete('/availability/:employee_id/weekly/:slot_id', deleteWeeklySlot);
adminRouter.post('/availability/:employee_id/block', blockDate);
adminRouter.post('/availability/:employee_id/unblock', unblockDate);

// ── HR routes (mirror admin) ───────────────────────────────────
hrRouter.get('/jobs', listJobs);
hrRouter.post('/jobs', createJob);
hrRouter.put('/jobs/:id', updateJob);
hrRouter.delete('/jobs/:id', deleteJob);

hrRouter.get('/candidates', listCandidates);
hrRouter.get('/candidates/:id', getCandidate);
hrRouter.post('/candidates', createCandidate);
hrRouter.put('/candidates/:id', updateCandidate);
hrRouter.delete('/candidates/:id', deleteCandidate);
hrRouter.post('/candidates/:id/move', moveCandidate);
hrRouter.post('/candidates/:id/cv', attachCv);
hrRouter.get('/candidates/:id/scorecards', getScorecards);
hrRouter.post('/candidates/:id/scorecards', addScorecard);
hrRouter.post('/candidates/:id/offer', createOffer);
hrRouter.post('/candidates/:id/hire', hireCandidate);
hrRouter.get('/candidates/export', exportCandidates);

hrRouter.get('/hr-staff', listHRStaff);
hrRouter.get('/meeting-status', getMeetingStatus);
hrRouter.post('/upload/cv', memoryUpload.single('file'), uploadCv);
hrRouter.get('/stats', getRecruitmentStats);
hrRouter.get('/offers', listOffers);
hrRouter.put('/offers/:id', updateOffer);
hrRouter.get('/interviews', listInterviews);
hrRouter.post('/interviews', createInterview);
hrRouter.put('/interviews/:id', updateInterview);

// ── Phone Screening routes (hr) ─────────────────────────────
hrRouter.get('/candidates/:id/phone-screening', getPhoneScreening);
hrRouter.post('/candidates/:id/phone-screening/log', logCallAttempt);
hrRouter.post('/candidates/:id/phone-screening/evaluate', submitEvaluation);
hrRouter.get('/candidates/:id/phone-screening/auto-reject', checkAutoReject);
hrRouter.get('/phone-screening/templates', listPSTemplates);
hrRouter.get('/phone-screening/templates/:id', getPSTemplate);
hrRouter.post('/phone-screening/templates', createPSTemplate);
hrRouter.put('/phone-screening/templates/:id', updatePSTemplate);
hrRouter.delete('/phone-screening/templates/:id', deletePSTemplate);
hrRouter.post('/phone-screening/templates/:id/questions', addQuestion);
hrRouter.put('/phone-screening/questions/:id', updateQuestion);
hrRouter.delete('/phone-screening/questions/:id', deleteQuestion);
hrRouter.delete('/phone-screening/call-log/:id', deleteCallLogEntry);

// ── Interview Stages routes (hr) ─────────────────────────
hrRouter.get('/interview-stages', listInterviewStages);
hrRouter.get('/interview-stages/:id', getInterviewStage);
hrRouter.post('/interview-stages', createInterviewStage);
hrRouter.put('/interview-stages/:id', updateInterviewStage);
hrRouter.delete('/interview-stages/:id', deleteInterviewStage);
hrRouter.get('/interview-stages/:interview_stage_id/evaluations', listEvaluations);
hrRouter.post('/interview-stages/:interview_stage_id/evaluations', createEvaluation);
hrRouter.put('/evaluations/:id', updateEvaluation);
hrRouter.delete('/evaluations/:id', deleteEvaluation);

// ── Interview Migration (hr) ──────────────────────────────
hrRouter.post('/interview-stages/migrate', migrateInterviews);
hrRouter.post('/interview-stages/migrate-workflows', migrateCandidateWorkflows);

// ── Workflow Templates (hr) ──────────────────────────────────
hrRouter.get('/workflows', listWfTemplates);
hrRouter.get('/workflows/:id', getWfTemplate);
hrRouter.post('/workflows', createWfTemplate);
hrRouter.put('/workflows/:id', updateWfTemplate);
hrRouter.delete('/workflows/:id', deleteWfTemplate);

// ── Workflow Stages (hr) ─────────────────────────────────────
hrRouter.get('/workflow-stages', listStages);
hrRouter.post('/workflow-stages', createStage);
hrRouter.put('/workflow-stages/:id', updateStage);
hrRouter.delete('/workflow-stages/:id', deleteStage);

// ── Workflow Rules (hr) ──────────────────────────────────────
hrRouter.get('/workflow-rules', listRules);
hrRouter.post('/workflow-rules', createRule);
hrRouter.put('/workflow-rules/:id', updateRule);
hrRouter.delete('/workflow-rules/:id', deleteRule);

// ── Message Templates (hr) ───────────────────────────────────
hrRouter.get('/message-templates', listMsgTemplates);
hrRouter.get('/message-templates/:id', getMsgTemplate);
hrRouter.post('/message-templates', createMsgTemplate);
hrRouter.put('/message-templates/:id', updateMsgTemplate);
hrRouter.delete('/message-templates/:id', deleteMsgTemplate);
hrRouter.post('/message-templates/:id/preview', renderPreview);

// ── Workflow Events (hr — read-only) ─────────────────────────
hrRouter.get('/workflow-events', listEvents);

// ── Manager Availability routes (hr) ─────────────────────────
hrRouter.get('/availability/:employee_id', getAvailability);
hrRouter.post('/availability/:employee_id/weekly', upsertWeeklySlot);
hrRouter.delete('/availability/:employee_id/weekly/:slot_id', deleteWeeklySlot);
hrRouter.post('/availability/:employee_id/block', blockDate);
hrRouter.post('/availability/:employee_id/unblock', unblockDate);

module.exports = { adminRouter, hrRouter };

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const { Router } = require('express');
const multer = require('multer');
const { requireITAuth } = require('../../shared/middleware/it-auth.middleware');
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
} = require('./recruitment.controller');

const adminRouter = Router();
adminRouter.use(requireITAuth);

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

adminRouter.post('/upload/cv', memoryUpload.single('file'), uploadCv);
adminRouter.get('/stats', getRecruitmentStats);

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

hrRouter.post('/upload/cv', memoryUpload.single('file'), uploadCv);
hrRouter.get('/stats', getRecruitmentStats);
hrRouter.get('/offers', listOffers);
hrRouter.put('/offers/:id', updateOffer);
hrRouter.get('/interviews', listInterviews);
hrRouter.post('/interviews', createInterview);
hrRouter.put('/interviews/:id', updateInterview);

module.exports = { adminRouter, hrRouter };

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

require('express-async-errors');
const express = require('express');
const path = require('path');
const logger = require('./shared/utils/logger');
const pinoHttp = require('pino-http');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const pool = require('./shared/config/database');

const authRoutes = require('./modules/auth/auth.routes');
const refreshRoutes = require('./modules/auth/refresh.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const managerRoutes = require('./modules/manager/manager.routes');
const ceoRoutes = require('./modules/ceo/ceo.routes');
const personnelRoutes = require('./modules/personnel/personnel.routes');
const adminAuthRoutes = require('./modules/admin/admin-auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const settingsRoutes = require('./modules/admin/settings.routes');
const hrRoutes = require('./modules/hr/hr.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const tasksRoutes = require('./modules/tasks/tasks.routes');
const platformRoutes = require('./modules/platform/platform.routes');
const platformPlansRoutes = require('./modules/platform/plans.routes');
const magicLinkRoutes = require('./modules/auth/magic-link.routes');
const publicSignupRoutes = require('./modules/auth/public-signup.routes');
const itRoutes = require('./modules/it/it.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const rbacRoutes = require('./modules/admin/rbac.routes');
const { requireHR } = require('./shared/middleware/hr.middleware');
const { requireITAuth, requireAnyActiveToken } = require('./shared/middleware/it-auth.middleware');
const { requirePasswordChangeGate } = require('./shared/middleware/password-gate.middleware');
const { requireService } = require('./shared/middleware/service.middleware');
const { resolveTenant } = require('./shared/middleware/tenant.middleware');
const { STORAGE_DIR } = require('./shared/config/storage');
const multer = require('multer');
const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'].includes(ext)) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, PNG, JPG'));
  },
});
const { adminRouter: recAdminRouter, hrRouter: recHrRouter } = require('./modules/recruitment/recruitment.routes');
const { publicApply, publicTrack, getActiveJobs, listPublicInterviews, respondToInterview } = require('./modules/recruitment/recruitment.controller');
const { listSkills, createSkill, updateSkill, deleteSkill, listCertifications, createCertification, updateCertification, deleteCertification } = require('./modules/admin/master-lists.controller');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const app = express();

app.set('trust proxy', 1);

// Request logging + X-Request-Id
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || require('crypto').randomUUID(),
  customLogLevel: (req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  morganConfig: { immediate: false },
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://meet.jit.si"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting — auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const platformLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts. Account locked for 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many contact form submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const jobApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many applications. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Parse cookies before CORS/auth so refresh_token cookie is available
app.use(cookieParser());

// CORS — in development allow any origin (ngrok, localhost, etc.); in production restrict to FRONTEND_URL
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProd || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Serve uploaded files — requires authentication
const { authenticate } = require('./shared/middleware/auth.middleware');
app.use('/uploads', authenticate, express.static(STORAGE_DIR));
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api/admin/auth', authLimiter);
app.use('/api/magic-link', authLimiter);
app.use('/api/platform/auth/login', platformLoginLimiter);
app.use('/api/platform/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/auth', refreshRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/settings', requireITAuth, requirePasswordChangeGate, resolveTenant, settingsRoutes);

app.use('/api/admin/reports', requireITAuth, requirePasswordChangeGate, resolveTenant, reportsRoutes);
app.use('/api/hr/reports', requireHR, resolveTenant, reportsRoutes);

app.get('/api/admin/balance-audit', requireITAuth, requirePasswordChangeGate, resolveTenant, async (req, res) => {
  const { getBalanceAudit } = require('./modules/reports/reports.controller');
  return getBalanceAudit(req, res);
});

app.get('/api/admin/activity-log', requireITAuth, requirePasswordChangeGate, resolveTenant, async (req, res) => {
  const { getActivityLog } = require('./modules/reports/reports.controller');
  return getActivityLog(req, res);
});

app.get('/api/hr/balance-audit', requireHR, resolveTenant, async (req, res) => {
  const { getBalanceAudit } = require('./modules/reports/reports.controller');
  return getBalanceAudit(req, res);
});

app.get('/api/hr/activity-log', requireHR, resolveTenant, async (req, res) => {
  const { getActivityLog } = require('./modules/reports/reports.controller');
  return getActivityLog(req, res);
});

app.get('/api/hr/settings/work-week', requireHR, resolveTenant, async (req, res) => {
  const keys = ['work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'ceo_email'];
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${placeholders})`, keys);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

app.get('/api/hr/settings/company', requireHR, resolveTenant, async (req, res) => {
  const keys = ['company_name', 'company_address', 'company_representative', 'company_representative_title', 'company_phone', 'company_fax', 'company_commercial_register', 'company_tax_card', 'company_location_url'];
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${placeholders})`, keys);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

app.put('/api/hr/settings/company', requireHR, resolveTenant, async (req, res) => {
  const { error } = companySettingsBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const allowed = ['company_name', 'company_address', 'company_representative', 'company_representative_title', 'company_phone', 'company_fax', 'company_commercial_register', 'company_tax_card', 'company_location_url'];
  const entries = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  if (entries.length > 0) {
    const values = entries.map(() => '(?, ?)').join(',');
    const params = entries.flatMap(([k, v]) => [k, String(v)]);
    await pool.query(
      `INSERT INTO settings (\`key\`, \`value\`) VALUES ${values} ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      params
    );
  }
  const keys = allowed;
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${placeholders})`, keys);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

app.put('/api/hr/settings/work-week', requireHR, resolveTenant, async (req, res) => {
  const { error } = workWeekSettingsBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const allowed = ['work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'ceo_email'];
  const updates = req.body;

  let oldCeoEmail = '';
  if (updates.ceo_email !== undefined) {
    const [oldSetting] = await pool.query("SELECT \`value\` FROM settings WHERE \`key\` = 'ceo_email'");
    oldCeoEmail = oldSetting.length > 0 ? oldSetting[0].value.trim().toLowerCase() : '';
  }

  const entries = Object.entries(updates).filter(([key]) => allowed.includes(key));
  if (entries.length > 0) {
    const values = entries.map(() => '(?, ?)').join(',');
    const params = entries.flatMap(([k, v]) => [k, String(v)]);
    await pool.query(
      `INSERT INTO settings (\`key\`, \`value\`) VALUES ${values} ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
      params
    );
  }

  if (updates.ceo_email !== undefined) {
    const newCeoEmail = (updates.ceo_email || '').trim().toLowerCase();

    if (newCeoEmail) {
      await pool.query(
        "UPDATE employees SET role = 'ceo', department_id = NULL WHERE email = ? AND role != 'admin'",
        [newCeoEmail]
      );
    }

    if (oldCeoEmail && oldCeoEmail !== newCeoEmail) {
      const [cleDepts] = await pool.query('SELECT id FROM departments WHERE c_level_email = ?', [oldCeoEmail]);
      const [mgrDepts] = await pool.query('SELECT id FROM departments WHERE manager_email = ?', [oldCeoEmail]);
      if (cleDepts.length === 0 && mgrDepts.length === 0) {
        await pool.query(
          "UPDATE employees SET role = 'employee' WHERE email = ? AND role = 'ceo'",
          [oldCeoEmail]
        );
      } else if (mgrDepts.length > 0) {
        await pool.query(
          "UPDATE employees SET role = 'manager' WHERE email = ? AND role = 'ceo'",
          [oldCeoEmail]
        );
      }
    }
  }

  const [rows] = await pool.query('SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (?,?,?,?,?)', ['work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'ceo_email']);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

// Platform routes (super-admin only)
app.use('/api/platform', platformRoutes);
app.use('/api/platform', platformPlansRoutes);

// Magic link & public signup (no auth required for these)
app.use('/api/magic-link', magicLinkRoutes);
app.use('/api/public', publicSignupRoutes);

// IT Portal (IT admins / any active token — RBAC enforced per-route)
app.use('/api/it', requireAnyActiveToken, requirePasswordChangeGate, resolveTenant, itRoutes);

// Audit Portal (audit officers / any active token — RBAC enforced per-route)
app.use('/api/audit', requireAnyActiveToken, requirePasswordChangeGate, resolveTenant, auditRoutes);

// Admin RBAC management (tenant admin)
app.use('/api/admin/rbac', requireITAuth, requirePasswordChangeGate, resolveTenant, rbacRoutes);

// HR master lists CRUD
app.get('/api/hr/master-skills', requireHR, resolveTenant, listSkills);
app.post('/api/hr/master-skills', requireHR, resolveTenant, createSkill);
app.put('/api/hr/master-skills/:id', requireHR, resolveTenant, updateSkill);
app.delete('/api/hr/master-skills/:id', requireHR, resolveTenant, deleteSkill);
app.get('/api/hr/master-certifications', requireHR, resolveTenant, listCertifications);
app.post('/api/hr/master-certifications', requireHR, resolveTenant, createCertification);
app.put('/api/hr/master-certifications/:id', requireHR, resolveTenant, updateCertification);
app.delete('/api/hr/master-certifications/:id', requireHR, resolveTenant, deleteCertification);

app.use('/api/admin', adminRoutes);
app.use('/api/admin/recruitment', requireService('service_recruitment', 'Recruitment is disabled'), recAdminRouter);
app.use('/api/hr', requireHR, hrRoutes);
app.use('/api/hr/recruitment', requireService('service_recruitment', 'Recruitment is disabled'), recHrRouter);
app.use('/api/manager', requireService('service_manager', 'Manager tools are disabled'), managerRoutes);
app.use('/api/ceo', ceoRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/tasks', tasksRoutes);

app.get('/api/departments', authenticate, resolveTenant, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const [rows] = await pool.query(
      'SELECT id, name FROM departments WHERE tenant_id = ? ORDER BY name ASC',
      [tenantId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

app.get('/api/settings/public', async (req, res) => {
  const { getPublicSettings } = require('./modules/admin/settings.controller');
  return getPublicSettings(req, res);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public contact form endpoint (from landing page)
const { contactBody, companySettingsBody, workWeekSettingsBody } = require('./shared/validations/schemas');
app.post('/api/contact', contactLimiter, async (req, res) => {
  const { error } = contactBody.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const { name, email, company, message } = req.body;
  try {
    await pool.query(
      'INSERT INTO contacts (name, email, company, message) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim(), (company || '').trim(), message.trim()]
    );
    const { sendEmail } = require('./shared/services/email.service');
    const [settings] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email' LIMIT 1");
    const adminEmail = settings.length > 0 ? settings[0].value : null;
    if (adminEmail) {
      const { mailLayout } = require('./shared/services/email.service');
      await sendEmail(adminEmail, `New Contact: ${name}`, mailLayout(`
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || '—')}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message)}</p>
      `)).catch(() => {});
    }
    res.status(201).json({ message: 'Message received. We\'ll get back to you within 24 hours.' });
  } catch (err) {
    logger.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to save message. Please try again.' });
  }
});

// Public recruitment routes
app.post('/api/apply', jobApplyLimiter, cvUpload.single('cv'), publicApply);
app.get('/api/track/:email', publicTrack);
app.get('/api/jobs/active', getActiveJobs);
app.get('/api/interviews/:email', listPublicInterviews);
app.put('/api/interviews/respond', respondToInterview);

// Master Lists (read for HR/Public, CRUD for Admin)
app.get('/api/master-skills', listSkills);
app.get('/api/master-certifications', listCertifications);
app.get('/api/admin/master-skills', requireITAuth, requirePasswordChangeGate, resolveTenant, listSkills);
app.post('/api/admin/master-skills', requireITAuth, requirePasswordChangeGate, resolveTenant, createSkill);
app.put('/api/admin/master-skills/:id', requireITAuth, requirePasswordChangeGate, resolveTenant, updateSkill);
app.delete('/api/admin/master-skills/:id', requireITAuth, requirePasswordChangeGate, resolveTenant, deleteSkill);
app.get('/api/admin/master-certifications', requireITAuth, requirePasswordChangeGate, resolveTenant, listCertifications);
app.post('/api/admin/master-certifications', requireITAuth, requirePasswordChangeGate, resolveTenant, createCertification);
app.put('/api/admin/master-certifications/:id', requireITAuth, requirePasswordChangeGate, resolveTenant, updateCertification);
app.delete('/api/admin/master-certifications/:id', requireITAuth, requirePasswordChangeGate, resolveTenant, deleteCertification);

// SPA fallback for production — serve index.html for non-API, non-static routes
if (fs.existsSync(frontendDist)) {
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
const isProd = process.env.NODE_ENV === 'production';
  if (!isDev) logger.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: isDev ? (err.message || 'Internal server error') : 'Internal server error',
  });
});

module.exports = app;

// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

require('express-async-errors');
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./shared/config/database');

const authRoutes = require('./modules/auth/auth.routes');
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
const { requireHR } = require('./shared/middleware/hr.middleware');
const { requireITAuth } = require('./shared/middleware/it-auth.middleware');
const { requireService } = require('./shared/middleware/service.middleware');
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

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet());

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

// CORS — in development allow any origin (ngrok, localhost, etc.); in production restrict to FRONTEND_URL
const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isDev || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(STORAGE_DIR));
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Apply rate limiters
app.use('/api/auth', authLimiter);
app.use('/api/admin/auth', authLimiter);
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/settings', requireITAuth, settingsRoutes);

app.use('/api/admin/reports', requireITAuth, reportsRoutes);
app.use('/api/hr/reports', requireHR, reportsRoutes);

app.get('/api/admin/balance-audit', requireITAuth, async (req, res) => {
  const { getBalanceAudit } = require('./modules/reports/reports.controller');
  return getBalanceAudit(req, res);
});

app.get('/api/admin/activity-log', requireITAuth, async (req, res) => {
  const { getActivityLog } = require('./modules/reports/reports.controller');
  return getActivityLog(req, res);
});

app.get('/api/hr/balance-audit', requireHR, async (req, res) => {
  const { getBalanceAudit } = require('./modules/reports/reports.controller');
  return getBalanceAudit(req, res);
});

app.get('/api/hr/activity-log', requireHR, async (req, res) => {
  const { getActivityLog } = require('./modules/reports/reports.controller');
  return getActivityLog(req, res);
});

app.get('/api/hr/settings/work-week', requireHR, async (req, res) => {
  const keys = ['work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'ceo_email'];
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${placeholders})`, keys);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

app.get('/api/hr/settings/company', requireHR, async (req, res) => {
  const keys = ['company_name', 'company_address', 'company_representative', 'company_representative_title', 'company_phone', 'company_fax', 'company_commercial_register', 'company_tax_card'];
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM settings WHERE \`key\` IN (${placeholders})`, keys);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

app.put('/api/hr/settings/company', requireHR, async (req, res) => {
  const allowed = ['company_name', 'company_address', 'company_representative', 'company_representative_title', 'company_phone', 'company_fax', 'company_commercial_register', 'company_tax_card'];
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

app.put('/api/hr/settings/work-week', requireHR, async (req, res) => {
  const allowed = ['work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'ceo_email'];
  const updates = req.body;

  let oldCeoEmail = '';
  if (updates.ceo_email !== undefined) {
    const [oldSetting] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'ceo_email'");
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

  const [rows] = await pool.query('SELECT `key`, `value` FROM settings WHERE `key` IN (?,?,?,?,?)', ['work_week_start', 'work_week_end', 'period_start_day', 'period_end_day', 'ceo_email']);
  const settings = {};
  for (const row of rows) settings[row.key] = row.value;
  res.json(settings);
});

// HR master lists CRUD
app.get('/api/hr/master-skills', requireHR, listSkills);
app.post('/api/hr/master-skills', requireHR, createSkill);
app.put('/api/hr/master-skills/:id', requireHR, updateSkill);
app.delete('/api/hr/master-skills/:id', requireHR, deleteSkill);
app.get('/api/hr/master-certifications', requireHR, listCertifications);
app.post('/api/hr/master-certifications', requireHR, createCertification);
app.put('/api/hr/master-certifications/:id', requireHR, updateCertification);
app.delete('/api/hr/master-certifications/:id', requireHR, deleteCertification);

app.use('/api/admin', adminRoutes);
app.use('/api/admin/recruitment', requireService('service_recruitment', 'Recruitment is disabled'), recAdminRouter);
app.use('/api/hr', requireHR, hrRoutes);
app.use('/api/hr/recruitment', requireService('service_recruitment', 'Recruitment is disabled'), recHrRouter);
app.use('/api/manager', requireService('service_manager', 'Manager tools are disabled'), managerRoutes);
app.use('/api/ceo', ceoRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/tasks', tasksRoutes);

app.get('/api/departments', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM departments ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/public', async (req, res) => {
  const { getPublicSettings } = require('./modules/admin/settings.controller');
  return getPublicSettings(req, res);
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public contact form endpoint (from landing page)
app.post('/api/contact', async (req, res) => {
  const { name, email, company, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }
  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return res.status(400).json({ error: 'Invalid input format.' });
  }
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
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Company:</strong> ${company || '—'}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `)).catch(() => {});
    }
    res.status(201).json({ message: 'Message received. We\'ll get back to you within 24 hours.' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to save message. Please try again.' });
  }
});

// Public recruitment routes
app.post('/api/apply', cvUpload.single('cv'), publicApply);
app.get('/api/track/:email', publicTrack);
app.get('/api/jobs/active', getActiveJobs);
app.get('/api/interviews/:email', listPublicInterviews);
app.put('/api/interviews/respond', respondToInterview);

// Master Lists (read for HR/Public, CRUD for Admin)
app.get('/api/master-skills', listSkills);
app.get('/api/master-certifications', listCertifications);
app.get('/api/admin/master-skills', requireITAuth, listSkills);
app.post('/api/admin/master-skills', requireITAuth, createSkill);
app.put('/api/admin/master-skills/:id', requireITAuth, updateSkill);
app.delete('/api/admin/master-skills/:id', requireITAuth, deleteSkill);
app.get('/api/admin/master-certifications', requireITAuth, listCertifications);
app.post('/api/admin/master-certifications', requireITAuth, createCertification);
app.put('/api/admin/master-certifications/:id', requireITAuth, updateCertification);
app.delete('/api/admin/master-certifications/:id', requireITAuth, deleteCertification);

// SPA fallback for production — serve index.html for non-API, non-static routes
if (fs.existsSync(frontendDist)) {
  app.get(/^\/(?!api\/|uploads\/).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  if (!isDev) console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

module.exports = app;

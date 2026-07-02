// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { checkHeadcountCapacity } = require('../../shared/utils/headcount.util');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { getRecruitmentDir } = require('../../shared/config/storage');

const UPLOAD_FOLDER = getRecruitmentDir();

const allowedFile = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'].includes(ext);
};

// ── Jobs ───────────────────────────────────────────────────────
async function listJobs(req, res) {
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
  const offset = (page - 1) * perPage;

  const [rows] = await pool.query(
    `SELECT j.*,
            COUNT(c.id) AS applicants,
            hcr.id AS hc_request_id,
            hcr.requester_name AS hc_requester_name,
            hcr.status AS hc_status
     FROM recruitment_jobs j
     LEFT JOIN recruitment_candidates c ON c.job_id = j.id OR c.job_title = j.title
     LEFT JOIN (SELECT hcr2.id, hcr2.requester_id, hcr2.status, e.name AS requester_name
                FROM headcount_requests hcr2
                JOIN employees e ON hcr2.requester_id = e.id) hcr ON hcr.id = j.headcount_request_id
     GROUP BY j.id
     ORDER BY j.created_at DESC
     LIMIT ? OFFSET ?`,
    [perPage, offset]
  );
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM recruitment_jobs');

  res.json({
    data: rows,
    pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
  });
}

async function createJob(req, res) {
  const { title, department, type, technical, status, description, position_id, title_id, key_responsibilities, qualifications, technical_skills, core_competencies } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const [result] = await pool.query(
    'INSERT INTO recruitment_jobs (position_id,title_id,title,department,type,technical,status,description,key_responsibilities,qualifications,technical_skills,core_competencies) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [position_id || null, title_id || null, title, department || '', type || 'Full-Time', technical ? 1 : 0, status || 'active', description || null, key_responsibilities || null, qualifications || null, technical_skills || null, core_competencies || null]
  );
  const [[job]] = await pool.query('SELECT * FROM recruitment_jobs WHERE id = ?', [result.insertId]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'job_created', `Created job: ${title}`);
  res.status(201).json(job);
}

async function updateJob(req, res) {
  const { id } = req.params;
  const { title, department, type, technical, status, description, position_id, title_id, key_responsibilities, qualifications, technical_skills, core_competencies } = req.body;
  await pool.query(
    'UPDATE recruitment_jobs SET position_id=?, title_id=?, title=?, department=?, type=?, technical=?, status=?, description=?, key_responsibilities=?, qualifications=?, technical_skills=?, core_competencies=? WHERE id=?',
    [position_id || null, title_id || null, title, department, type, technical ? 1 : 0, status, description || null, key_responsibilities || null, qualifications || null, technical_skills || null, core_competencies || null, id]
  );
  const [[job]] = await pool.query('SELECT * FROM recruitment_jobs WHERE id = ?', [id]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'job_updated', `Updated job: ${title}`);
  res.json(job);
}

async function deleteJob(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM recruitment_jobs WHERE id = ?', [id]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'job_deleted', `Deleted job #${id}`);
  res.json({ deleted: parseInt(id) });
}

// ── Candidates ─────────────────────────────────────────────────
async function listCandidates(req, res) {
  const stage = req.query.stage;
  const search = (req.query.q || '').trim();
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
  const offset = (page - 1) * perPage;

  let sql = `SELECT c.*, (SELECT hh.note FROM recruitment_history hh WHERE hh.candidate_id = c.id ORDER BY hh.created_at DESC LIMIT 1) AS last_note, (SELECT sr.overall_status FROM screening_results sr WHERE sr.candidate_id = c.id ORDER BY sr.created_at DESC LIMIT 1) AS screening_status FROM recruitment_candidates c WHERE 1=1`;
  let countSql = 'SELECT COUNT(*) AS total FROM recruitment_candidates WHERE 1=1';
  const args = [];
  const countArgs = [];

  if (stage && stage !== 'all') {
    sql += ' AND c.stage = ?';
    countSql += ' AND stage = ?';
    args.push(stage);
    countArgs.push(stage);
  }
  if (search) {
    sql += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.job_title LIKE ?)';
    countSql += ' AND (name LIKE ? OR email LIKE ? OR job_title LIKE ?)';
    const term = `%${search}%`;
    args.push(term, term, term);
    countArgs.push(term, term, term);
  }

  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  args.push(perPage, offset);

  const [rows] = await pool.query(sql, args);
  const [[{ total }]] = await pool.query(countSql, countArgs);

  res.json({
    data: rows,
    pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
  });
}

async function getCandidate(req, res) {
  const { id } = req.params;
  const [[candidate]] = await pool.query('SELECT * FROM recruitment_candidates WHERE id = ?', [id]);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const [history] = await pool.query('SELECT * FROM recruitment_history WHERE candidate_id = ? ORDER BY created_at', [id]);
  const [scorecards] = await pool.query('SELECT * FROM recruitment_scorecards WHERE candidate_id = ? ORDER BY created_at', [id]);
  const [offers] = await pool.query('SELECT * FROM recruitment_offers WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
  const [screening] = await pool.query('SELECT * FROM screening_results WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1', [id]);

  // Resolve skill/cert IDs to names from master lists
  let screeningResult = screening[0] || null;
  if (screeningResult) {
    if (screeningResult.details && typeof screeningResult.details === 'string') screeningResult.details = JSON.parse(screeningResult.details);
    if (screeningResult.requirement_results && typeof screeningResult.requirement_results === 'string') screeningResult.requirement_results = JSON.parse(screeningResult.requirement_results);
  }
  // Resolve skill/cert IDs to names for candidate and screening
  const [allSkills] = await pool.query('SELECT id, name FROM master_skills');
  const [allCerts] = await pool.query('SELECT id, name FROM master_certifications');
  const skillMap = Object.fromEntries(allSkills.map(s => [s.id, s.name]));
  const certMap = Object.fromEntries(allCerts.map(c => [c.id, c.name]));

  if (candidate.skills) {
    const ids = typeof candidate.skills === 'string' ? JSON.parse(candidate.skills) : candidate.skills;
    candidate.skills_display = Array.isArray(ids) ? ids.map(id => skillMap[parseInt(id, 10)] || `#${id}`).filter(Boolean) : [];
  }
  if (candidate.certifications) {
    const ids = typeof candidate.certifications === 'string' ? JSON.parse(candidate.certifications) : candidate.certifications;
    candidate.certs_display = Array.isArray(ids) ? ids.map(id => certMap[parseInt(id, 10)] || `#${id}`).filter(Boolean) : [];
  }

  if (screeningResult && screeningResult.requirement_results) {
    for (const rr of screeningResult.requirement_results) {
      if (rr.requirement === 'required_skills' && Array.isArray(rr.skill_details)) {
        for (const sd of rr.skill_details) sd.skill_name = skillMap[parseInt(sd.skill_id, 10)] || `#${sd.skill_id}`;
      }
    }
  }

  res.json({ ...candidate, history, scorecards, offers, screening: screeningResult });
}

async function createCandidate(req, res) {
  const { name, email, phone, job_id, job_title, stage, technical, notes, source, education_level, experience_years, skills, certifications } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

  const [result] = await pool.query(
    `INSERT INTO recruitment_candidates (name,email,phone,job_id,job_title,stage,technical,notes,source,education_level,experience_years,skills,certifications)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [name, email, phone || '', job_id || null, job_title || '', stage || 'applied', technical ? 1 : 0, notes || '', source || 'Manual', education_level || null, experience_years || null, skills ? JSON.stringify(skills) : null, certifications ? JSON.stringify(certifications) : null]
  );
  await pool.query(
    'INSERT INTO recruitment_history (candidate_id,stage,note,created_by) VALUES (?,?,?,?)',
    [result.insertId, stage || 'applied', 'Candidate added manually', req.admin?.username || 'HR']
  );
  const [[candidate]] = await pool.query('SELECT * FROM recruitment_candidates WHERE id = ?', [result.insertId]);

  try {
    const { autoScreen } = require('../../shared/services/screening.service');
    if (job_id) {
      const [jobs] = await pool.query('SELECT title_id FROM recruitment_jobs WHERE id = ?', [job_id]);
      if (jobs.length > 0 && jobs[0].title_id) {
        await autoScreen(result.insertId, jobs[0].title_id, job_id);
      }
    }
  } catch (e) { console.error('Auto-screening error:', e); }

  logActivity(null, req.admin?.id || req.hr?.id || null, 'candidate_created', `Created candidate: ${name}`);
  res.status(201).json(candidate);
}

async function updateCandidate(req, res) {
  const { id } = req.params;
  const allowed = ['name', 'email', 'phone', 'job_id', 'job_title', 'stage', 'notes', 'score_comm', 'score_tech', 'score_fit', 'test_done', 'education_level', 'experience_years', 'skills', 'certifications'];
  const updates = [];
  const args = [];
  for (const col of allowed) {
    if (req.body[col] !== undefined) {
      updates.push(`${col} = ?`);
      args.push(req.body[col]);
    }
  }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  args.push(id);
  await pool.query(`UPDATE recruitment_candidates SET ${updates.join(', ')} WHERE id = ?`, args);
  const [[candidate]] = await pool.query('SELECT * FROM recruitment_candidates WHERE id = ?', [id]);
  res.json(candidate);
}

async function deleteCandidate(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM recruitment_candidates WHERE id = ?', [id]);
  logActivity(null, req.admin?.id || req.hr?.id || null, 'candidate_deleted', `Deleted candidate #${id}`);
  res.json({ deleted: parseInt(id) });
}

// ── Stage Move ────────────────────────────────────────────────
async function moveCandidate(req, res) {
  const { id } = req.params;
  const { stage, note } = req.body;
  if (!stage) return res.status(400).json({ error: 'stage is required' });

  const adminName = req.admin?.username || req.admin?.name || 'HR';
  await pool.query('UPDATE recruitment_candidates SET stage = ? WHERE id = ?', [stage, id]);
  await pool.query(
    'INSERT INTO recruitment_history (candidate_id,stage,note,created_by) VALUES (?,?,?,?)',
    [id, stage, note || `Moved to ${stage}`, adminName]
  );

  if (stage === 'rejected') {
    const [[c]] = await pool.query('SELECT * FROM recruitment_candidates WHERE id = ?', [id]);
    if (c) {
      try {
        const emailService = require('../../shared/services/email.service');
        await emailService.sendEmail(
          c.email,
          `Update on Your Application — ${c.job_title}`,
          `Dear ${c.name},<br><br>Thank you for your interest in the <strong>${c.job_title}</strong> position. After careful consideration, we have decided to move forward with other candidates.<br><br>We wish you the best in your career journey.`
        );
      } catch (e) { console.error('Rejection email error:', e); }
    }
  }

  logActivity(null, req.admin?.id || req.hr?.id || null, 'candidate_moved', `Moved candidate #${id} to ${stage}`);
  res.json({ stage });
}

// ── CV Upload ─────────────────────────────────────────────────
async function uploadCv(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  if (!allowedFile(req.file.originalname)) return res.status(400).json({ error: 'Invalid file type. Allowed: PDF, DOC, DOCX' });
  const filename = `${Date.now()}_${req.file.originalname}`;
  const fpath = path.join(UPLOAD_FOLDER, filename);
  fs.writeFileSync(fpath, req.file.buffer);
  const sizeKb = Math.ceil(fs.statSync(fpath).size / 1024);
  res.json({ filename, path: `/uploads/recruitment/${filename}`, size_kb: sizeKb });
}

async function attachCv(req, res) {
  const { id } = req.params;
  const { filename, path: cvPath } = req.body;
  await pool.query('UPDATE recruitment_candidates SET cv_filename=?, cv_path=? WHERE id=?', [filename, cvPath, id]);
  res.json({ cv_path: cvPath });
}

// ── Scorecards ────────────────────────────────────────────────
async function getScorecards(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM recruitment_scorecards WHERE candidate_id = ? ORDER BY created_at', [id]);
  res.json(rows);
}

async function addScorecard(req, res) {
  const { id } = req.params;
  const { interview, comm, technical, fit, overall, notes, decision } = req.body;
  const interviewer = req.admin?.username || req.admin?.name || 'HR';
  const [result] = await pool.query(
    'INSERT INTO recruitment_scorecards (candidate_id,interview,interviewer,comm,technical,fit,overall,notes,decision) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, interview || '1st Interview', interviewer, comm || 0, technical || 0, fit || 0, overall || 0, notes || '', decision || 'pending']
  );

  const [[sc]] = await pool.query(
    'SELECT AVG(comm) ac, AVG(technical) at, AVG(fit) af FROM recruitment_scorecards WHERE candidate_id = ?',
    [id]
  );
  await pool.query(
    'UPDATE recruitment_candidates SET score_comm=?, score_tech=?, score_fit=? WHERE id=?',
    [Math.round(sc.ac || 0), Math.round(sc.at || 0), Math.round(sc.af || 0), id]
  );
  logActivity(null, req.admin?.id || req.hr?.id || null, 'scorecard_added', `Added scorecard for candidate #${id}`);
  res.status(201).json({ id: result.insertId });
}

// ── Offers ─────────────────────────────────────────────────────
async function createOffer(req, res) {
  const { id } = req.params;
  const { position, department, salary, start_date, reports_to, benefits } = req.body;
  const [result] = await pool.query(
    'INSERT INTO recruitment_offers (candidate_id,position,department,salary,start_date,reports_to,benefits,status) VALUES (?,?,?,?,?,?,?,?)',
    [id, position || '', department || '', salary || '', start_date || '', reports_to || '', benefits || '', 'sent']
  );
  await pool.query("UPDATE recruitment_candidates SET stage='offer' WHERE id=?", [id]);
  await pool.query("INSERT INTO recruitment_history (candidate_id,stage,note) VALUES (?,?,?)",
    [id, 'offer', 'Job offer generated and sent']);

  const [[c]] = await pool.query('SELECT * FROM recruitment_candidates WHERE id = ?', [id]);
  if (c) {
    try {
      const emailService = require('../../shared/services/email.service');
      await emailService.sendEmail(
        c.email,
        `Job Offer — ${position}`,
        `Dear ${c.name},<br><br>We are delighted to offer you the position of <strong>${position}</strong>.<br><br><strong>Start Date:</strong> ${start_date || 'TBD'}<br><strong>Department:</strong> ${department || '—'}<br><strong>Monthly Salary:</strong> EGP ${salary || '—'}<br><br>Please confirm your acceptance within 5 business days.`
      );
    } catch (e) { console.error('Offer email error:', e); }
  }
  logActivity(null, req.admin?.id || req.hr?.id || null, 'offer_created', `Created offer for candidate #${id}`);
  res.status(201).json({ id: result.insertId });
}

// ── Public: Apply ──────────────────────────────────────────────
async function publicApply(req, res) {
  const { name, email, phone, job_id, job_title, technical, cover, source, education_level, experience_years, skills, certifications } = req.body;
  if (!name || !email || !job_title) return res.status(400).json({ error: 'name, email, and job_title are required' });

  const [existing] = await pool.query('SELECT id FROM recruitment_candidates WHERE email=? AND job_title=?', [email, job_title]);
  if (existing.length > 0) return res.status(400).json({ error: 'You have already applied for this position' });

  const [result] = await pool.query(
    `INSERT INTO recruitment_candidates (name,email,phone,job_id,job_title,stage,technical,notes,source,education_level,experience_years,skills,certifications)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [name, email, phone || '', job_id || null, job_title, 'applied', technical ? 1 : 0, cover || '', source || 'Portal', education_level || null, experience_years || null, skills ? JSON.stringify(skills) : null, certifications ? JSON.stringify(certifications) : null]
  );
  await pool.query("INSERT INTO recruitment_history (candidate_id,stage,note) VALUES (?,?,?)",
    [result.insertId, 'applied', 'Application submitted via candidate portal']);

  try {
    const { autoScreen } = require('../../shared/services/screening.service');
    if (job_id) {
      const [jobs] = await pool.query('SELECT title_id FROM recruitment_jobs WHERE id = ?', [job_id]);
      if (jobs.length > 0 && jobs[0].title_id) {
        await autoScreen(result.insertId, jobs[0].title_id, job_id);
      }
    }
  } catch (e) { console.error('Auto-screening error:', e); }

  const ref = `APP-${new Date().getFullYear()}-${String(result.insertId).padStart(3, '0')}`;
  let emailSent = false;
  try {
    const emailService = require('../../shared/services/email.service');
    await emailService.sendEmail(
      email,
      `Application Received — ${job_title}`,
      `Dear ${name},<br><br>Your application for <strong>${job_title}</strong> has been received.<br><br><strong>Reference Number:</strong> ${ref}<br><br>Our HR team will review your profile and contact you within 3 business days.`
    );
    emailSent = true;
  } catch (e) { console.error('Confirmation email error:', e); }

  res.status(201).json({ id: result.insertId, ref, email_sent: emailSent });
}

// ── Public: Track ──────────────────────────────────────────────
async function publicTrack(req, res) {
  const { email } = req.params;
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
  const offset = (page - 1) * perPage;

  const [apps] = await pool.query(
    'SELECT * FROM recruitment_candidates WHERE email=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [email, perPage, offset]
  );

  if (apps.length > 0) {
    const ids = apps.map(a => a.id);
    const placeholders = ids.map(() => '?').join(',');
    const [historyRows] = await pool.query(
      `SELECT * FROM recruitment_history WHERE candidate_id IN (${placeholders}) ORDER BY created_at`,
      ids
    );
    const byCandidate = {};
    for (const h of historyRows) {
      if (!byCandidate[h.candidate_id]) byCandidate[h.candidate_id] = [];
      byCandidate[h.candidate_id].push(h);
    }
    for (const a of apps) {
      a.history = byCandidate[a.id] || [];
    }
  }

  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM recruitment_candidates WHERE email=?', [email]);
  res.json({
    data: apps,
    pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
  });
}

// ── Get active jobs (public) ───────────────────────────────────
async function getActiveJobs(req, res) {
  const [rows] = await pool.query(
    `SELECT j.id, j.title, j.department, j.type, j.technical, j.description, j.created_at,
       JSON_OBJECT(
         'min_education_level', dt.min_education_level,
         'min_experience_years', dt.min_experience_years,
         'required_skills', dt.required_skills,
         'required_certs', dt.required_certs,
         'preferred_skills', dt.preferred_skills
       ) AS min_requirements
     FROM recruitment_jobs j
     LEFT JOIN department_titles dt ON j.title_id = dt.id
     WHERE j.status = 'active'
     ORDER BY j.created_at DESC`
  );
  const result = rows.map(r => ({
    ...r,
    min_requirements: typeof r.min_requirements === 'string' ? JSON.parse(r.min_requirements) : r.min_requirements,
    min_requirements: r.min_requirements ? {
      ...r.min_requirements,
      required_skills: JSON.parse(r.min_requirements.required_skills || '[]'),
      required_certs: JSON.parse(r.min_requirements.required_certs || '[]'),
      preferred_skills: JSON.parse(r.min_requirements.preferred_skills || '[]'),
    } : null,
  }));
  res.json(result);
}

// ── Export CSV ─────────────────────────────────────────────────
async function exportCandidates(req, res) {
  const stage = req.query.stage;
  const search = (req.query.q || '').trim();
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 200, 500);
  const offset = (page - 1) * perPage;

  let sql = `SELECT c.*, (SELECT hh.note FROM recruitment_history hh WHERE hh.candidate_id = c.id ORDER BY hh.created_at DESC LIMIT 1) AS last_note FROM recruitment_candidates c WHERE 1=1`;
  const args = [];
  if (stage && stage !== 'all') { sql += ' AND c.stage = ?'; args.push(stage); }
  if (search) { sql += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.job_title LIKE ?)'; const t = `%${search}%`; args.push(t, t, t); }
  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  args.push(perPage, offset);

  const [rows] = await pool.query(sql, args);
  const csvRows = rows.map(r => ({
    Name: r.name, Email: r.email, Phone: r.phone || '', Position: r.job_title,
    Stage: r.stage, Days: r.days, Type: r.technical ? 'Technical' : 'General',
    'Comm%': r.score_comm || 0, 'Tech%': r.score_tech || 0, 'Fit%': r.score_fit || 0,
    CV: r.cv_filename || '', Source: r.source || '', Applied: (r.created_at || '').toString().slice(0, 10),
  }));

  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(csvRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
  const date = require('../../shared/utils/work-day.util').getTodayDateString();
  res.set('Content-Disposition', `attachment; filename=candidates_${date}.csv`);
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.send('\ufeff' + buf.toString());
}

// ── Hire candidate (move to hired + create employee) ──────────
async function hireCandidate(req, res) {
  const { id } = req.params;
  const { employee_id, start_date, department_id, title_id } = req.body;

  const [[candidate]] = await pool.query('SELECT * FROM recruitment_candidates WHERE id = ?', [id]);
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  // Validate headcount capacity before hiring
  if (department_id || title_id) {
    const capacity = await checkHeadcountCapacity({ department_id: department_id || undefined, title_id: title_id || undefined });
    if (!capacity.hasCapacity) {
      const reasons = [];
      if (capacity.deptOverLimit) reasons.push(`Department at capacity (${capacity.deptAvailable} remaining)`);
      if (capacity.titleOverLimit) reasons.push(`Title at capacity (${capacity.titleAvailable} remaining)`);
      return res.status(400).json({ error: `Cannot hire — headcount limit exceeded. ${reasons.join('; ')}.` });
    }
  }

  await pool.query("UPDATE recruitment_candidates SET stage='hired' WHERE id=?", [id]);
  await pool.query("INSERT INTO recruitment_history (candidate_id,stage,note,created_by) VALUES (?,?,?,?)",
    [id, 'hired', 'Candidate hired and converted to employee', req.admin?.username || 'HR']);

  if (employee_id) {
    const [empRows] = await pool.query('SELECT id FROM employees WHERE employee_id = ?', [String(employee_id)]);
    if (empRows.length > 0) {
      const eid = empRows[0].id;
      await pool.query(
        'UPDATE employees SET name=?, email=?, phone=?, department_id=?, title_id=? WHERE id=?',
        [candidate.name, candidate.email, candidate.phone || '', department_id || null, title_id || null, eid]
      );
      logActivity(eid, req.admin?.id || req.hr?.id || null, 'hired_from_recruitment', `Hired from recruitment: ${candidate.name}`);
    } else {
      return res.status(404).json({ error: 'Employee not found' });
    }
  } else {
    const [maxRow] = await pool.query('SELECT MAX(employee_id) AS max_id FROM employees');
    const nextEmployeeId = (maxRow[0].max_id || 0) + 1;
    const username = candidate.email.split('@')[0] + Math.floor(Math.random() * 1000);
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const [insertResult] = await pool.query(
      `INSERT INTO employees (employee_id, name, email, phone, username, password_hash, is_verified, department_id, title_id, can_wfh, employment_status)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 1, 'active')`,
      [nextEmployeeId, candidate.name, candidate.email, candidate.phone || '', username, password_hash, department_id || null, title_id || null]
    );
    const eid = insertResult.insertId;

    try {
      const [typeRows] = await pool.query('SELECT name, default_balance FROM leave_types WHERE default_balance IS NOT NULL');
      for (const t of typeRows) {
        await pool.query('INSERT IGNORE INTO leave_balances (employee_id, leave_type, balance) VALUES (?, ?, ?)', [eid, t.name, t.default_balance]);
      }
    } catch (e) { /* non-critical */ }

    logActivity(eid, req.admin?.id || req.hr?.id || null, 'hired_from_recruitment', `Created employee from recruitment: ${candidate.name}`);

    return res.json({
      message: 'Candidate hired and employee created',
      candidate_id: parseInt(id),
      employee_id: nextEmployeeId,
      temp_password: tempPassword,
    });
  }

  res.json({ message: 'Candidate hired', candidate_id: parseInt(id) });
}

// ── Offers ──────────────────────────────────────────────────────
async function listOffers(req, res) {
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
  const offset = (page - 1) * perPage;
  const status = req.query.status || '';

  let where = '';
  const params = [];
  if (status) { where = 'WHERE o.status = ?'; params.push(status); }

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM recruitment_offers o ${where}`, params
  );

  const [rows] = await pool.query(
    `SELECT o.*, c.name AS candidate_name, c.email AS candidate_email, c.job_title
     FROM recruitment_offers o
     JOIN recruitment_candidates c ON c.id = o.candidate_id
     ${where}
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  res.json({
    data: rows,
    pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
  });
}

// ── Interviews ─────────────────────────────────────────────────
async function listInterviews(req, res) {
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
  const offset = (page - 1) * perPage;
  const status = req.query.status || '';
  const candidateId = req.query.candidate_id || '';

  let where = [];
  const params = [];
  if (status) { where.push('i.status = ?'); params.push(status); }
  if (candidateId) { where.push('i.candidate_id = ?'); params.push(parseInt(candidateId)); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM recruitment_interviews i ${whereClause}`, params
  );

  const [rows] = await pool.query(
    `SELECT i.*, c.name AS candidate_name, c.email AS candidate_email, c.job_title
     FROM recruitment_interviews i
     JOIN recruitment_candidates c ON c.id = i.candidate_id
     ${whereClause}
     ORDER BY i.interview_date DESC
     LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  res.json({
    data: rows,
    pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
  });
}

async function createInterview(req, res) {
  const {
    candidate_id, interview_date, duration, mode, interviewer, location_or_link, notes,
    type, location_name, location_address, dress_code, what_to_bring, map_link,
    meeting_platform, meeting_link,
  } = req.body;
  if (!candidate_id || !interview_date) {
    return res.status(400).json({ error: 'candidate_id and interview_date are required' });
  }
  let generatedLink = meeting_link || '';
  if (type === 'online' && !generatedLink && (meeting_platform === 'Google Meet' || meeting_platform === 'Microsoft Teams')) {
    try {
      const { createMeetingLink } = require('../../shared/services/meeting.service');
      generatedLink = await createMeetingLink(meeting_platform, {
        interview_date, duration: duration || 60,
        job_title: req.body.job_title || '',
        notes: notes || '',
        interviewer,
      });
    } catch (e) { console.error('Meeting link generation error:', e.message); }
  }

  const [result] = await pool.query(
    `INSERT INTO recruitment_interviews
     (candidate_id, interview_date, duration, mode, interviewer, location_or_link, notes,
      type, location_name, location_address, dress_code, what_to_bring, map_link,
      meeting_platform, meeting_link)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      candidate_id, interview_date, duration || 60, mode || 'video', interviewer || '',
      location_or_link || '', notes || '',
      type || 'online', location_name || '', location_address || '', dress_code || '',
      what_to_bring || '', map_link || '', meeting_platform || '', generatedLink,
    ]
  );

  const [[candidate]] = await pool.query('SELECT name, email FROM recruitment_candidates WHERE id = ?', [candidate_id]);
  if (candidate) {
    try {
      const { sendInterviewInvitation } = require('../../shared/services/email.service');
      const interview = {
        interview_date, duration: duration || 60, type: type || 'online',
        location_name, location_address, dress_code, what_to_bring, map_link,
        meeting_link, interviewer, notes,
        job_title: req.body.job_title || '',
      };
      await sendInterviewInvitation(candidate.email, candidate.name, interview);
    } catch (e) { console.error('Interview email error:', e); }
  }

  res.status(201).json({ id: result.insertId });
}

async function updateInterview(req, res) {
  const { id } = req.params;
  const {
    interview_date, duration, mode, interviewer, location_or_link, status, notes,
    type, location_name, location_address, dress_code, what_to_bring, map_link,
    meeting_platform, meeting_link, candidate_status,
  } = req.body;
  const fields = [];
  const params = [];
  if (interview_date !== undefined) { fields.push('interview_date = ?'); params.push(interview_date); }
  if (duration !== undefined) { fields.push('duration = ?'); params.push(duration); }
  if (mode !== undefined) { fields.push('mode = ?'); params.push(mode); }
  if (interviewer !== undefined) { fields.push('interviewer = ?'); params.push(interviewer); }
  if (location_or_link !== undefined) { fields.push('location_or_link = ?'); params.push(location_or_link); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (notes !== undefined) { fields.push('notes = ?'); params.push(notes); }
  if (type !== undefined) { fields.push('type = ?'); params.push(type); }
  if (location_name !== undefined) { fields.push('location_name = ?'); params.push(location_name); }
  if (location_address !== undefined) { fields.push('location_address = ?'); params.push(location_address); }
  if (dress_code !== undefined) { fields.push('dress_code = ?'); params.push(dress_code); }
  if (what_to_bring !== undefined) { fields.push('what_to_bring = ?'); params.push(what_to_bring); }
  if (map_link !== undefined) { fields.push('map_link = ?'); params.push(map_link); }
  if (meeting_platform !== undefined) { fields.push('meeting_platform = ?'); params.push(meeting_platform); }
  if (meeting_link !== undefined) { fields.push('meeting_link = ?'); params.push(meeting_link); }
  if (candidate_status !== undefined) { fields.push('candidate_status = ?'); params.push(candidate_status); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  params.push(id);
  await pool.query(`UPDATE recruitment_interviews SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Interview updated' });
}

// ── Reports ────────────────────────────────────────────────────
async function getRecruitmentStats(req, res) {
  const [[stageCounts]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(stage='applied') AS applied,
       SUM(stage='phone_screen') AS phone_screen,
       SUM(stage='interview') AS interview,
       SUM(stage='assessment') AS assessment,
       SUM(stage='offer') AS offer,
       SUM(stage='hired') AS hired,
       SUM(stage='rejected') AS rejected
     FROM recruitment_candidates`
  );

  const [[offerStats]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status='sent') AS sent,
       SUM(status='accepted') AS accepted,
       SUM(status='rejected') AS rejected
     FROM recruitment_offers`
  );

  const [[jobStats]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status='active') AS active,
       SUM(status='closed') AS closed
     FROM recruitment_jobs`
  );

  const [monthlyApps] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
     FROM recruitment_candidates
     GROUP BY month
     ORDER BY month ASC
     LIMIT 12`
  );

  res.json({
    candidates: stageCounts,
    offers: offerStats,
    jobs: jobStats,
    monthly_applications: monthlyApps,
  });
}

async function updateOffer(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!['sent', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be sent, accepted, or rejected' });
  }
  await pool.query('UPDATE recruitment_offers SET status = ? WHERE id = ?', [status, id]);
  res.json({ message: 'Offer updated' });
}

// ── Public: Interview respond ───────────────────────────────────
async function listPublicInterviews(req, res) {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: 'Email is required' });
  const [rows] = await pool.query(
    `SELECT i.*, c.name AS candidate_name, c.job_title
     FROM recruitment_interviews i
     JOIN recruitment_candidates c ON c.id = i.candidate_id
     WHERE c.email = ?
     ORDER BY i.interview_date DESC`,
    [email]
  );
  res.json(rows);
}

async function respondToInterview(req, res) {
  const { interview_id, email, status } = req.body;
  if (!interview_id || !email || !['accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'interview_id, email, and status (accepted/declined) are required' });
  }
  const [[interview]] = await pool.query(
    `SELECT i.id, i.candidate_id FROM recruitment_interviews i
     JOIN recruitment_candidates c ON c.id = i.candidate_id
     WHERE i.id = ? AND c.email = ?`,
    [interview_id, email]
  );
  if (!interview) return res.status(404).json({ error: 'Interview not found' });

  await pool.query('UPDATE recruitment_interviews SET candidate_status = ? WHERE id = ?', [status, interview_id]);

  if (status === 'accepted') {
    await pool.query("UPDATE recruitment_candidates SET stage = 'interview' WHERE id = ?", [interview.candidate_id]);
    await pool.query("INSERT INTO recruitment_history (candidate_id,stage,note) VALUES (?,'interview','Candidate accepted interview invitation')", [interview.candidate_id]);
  } else {
    await pool.query("UPDATE recruitment_candidates SET stage = 'rejected' WHERE id = ?", [interview.candidate_id]);
    await pool.query("INSERT INTO recruitment_history (candidate_id,stage,note) VALUES (?,'rejected','Candidate declined interview invitation')", [interview.candidate_id]);
  }

  res.json({ message: `Interview ${status}` });
}

module.exports = {
  listJobs, createJob, updateJob, deleteJob,
  listCandidates, getCandidate, createCandidate, updateCandidate, deleteCandidate,
  moveCandidate, uploadCv, attachCv,
  getScorecards, addScorecard, createOffer,
  publicApply, publicTrack, getActiveJobs,
  exportCandidates, hireCandidate,
  listOffers, updateOffer,
  listInterviews, createInterview, updateInterview,
  getRecruitmentStats,
  listPublicInterviews, respondToInterview,
};

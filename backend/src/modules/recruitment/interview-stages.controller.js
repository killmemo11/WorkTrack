const pool = require('../../shared/config/database');
const { logActivity } = require('../../shared/services/activity.service');
const { publishEvent } = require('./engines/workflow.engine');
const logger = require('../../shared/utils/logger');

// ── Interview Stages CRUD ─────────────────────────────────────
async function listInterviewStages(req, res) {
  const page = parseInt(req.query.page) || 1;
  const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);
  const offset = (page - 1) * perPage;
  const { candidate_id, status, workflow_stage_id } = req.query;

  let where = []; const params = [];
  if (candidate_id) { where.push('is2.candidate_id = ?'); params.push(parseInt(candidate_id)); }
  if (status) { where.push('is2.status = ?'); params.push(status); }
  if (workflow_stage_id) { where.push('is2.workflow_stage_id = ?'); params.push(parseInt(workflow_stage_id)); }
  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM interview_stages is2 ${whereClause}`, params
  );

  const [rows] = await pool.query(
    `SELECT is2.*, c.name AS candidate_name, c.email AS candidate_email, c.job_title,
            ws.display_name AS stage_name
     FROM interview_stages is2
     JOIN recruitment_candidates c ON c.id = is2.candidate_id
     LEFT JOIN workflow_stages ws ON ws.id = is2.workflow_stage_id
     ${whereClause}
     ORDER BY is2.interview_date DESC
     LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  res.json({
    data: rows,
    pagination: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) },
  });
}

async function getInterviewStage(req, res) {
  const { id } = req.params;
  const [[stage]] = await pool.query(
    `SELECT is2.*, c.name AS candidate_name, c.email AS candidate_email, c.job_title,
            ws.display_name AS stage_name
     FROM interview_stages is2
     JOIN recruitment_candidates c ON c.id = is2.candidate_id
     LEFT JOIN workflow_stages ws ON ws.id = is2.workflow_stage_id
     WHERE is2.id = ?`, [id]
  );
  if (!stage) return res.status(404).json({ error: 'Interview stage not found' });
  res.json(stage);
}

async function createInterviewStage(req, res) {
  const {
    candidate_id, workflow_stage_id, interview_date, duration, mode, interviewer,
    location_or_link, type, location_name, location_address, dress_code, what_to_bring,
    map_link, meeting_platform, meeting_link, notes,
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
        notes: notes || '', interviewer,
      });
    } catch (e) { logger.error('Meeting link generation error:', e.message); }
  }

  const [result] = await pool.query(
    `INSERT INTO interview_stages
     (candidate_id, workflow_stage_id, interview_date, duration, mode, interviewer, location_or_link,
      type, location_name, location_address, dress_code, what_to_bring, map_link,
      meeting_platform, meeting_link, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [candidate_id, workflow_stage_id || null, interview_date, duration || 60, mode || 'video',
     interviewer || '', location_or_link || '', type || 'online', location_name || '',
     location_address || '', dress_code || '', what_to_bring || '', map_link || '',
     meeting_platform || '', generatedLink, notes || '']
  );

  await publishEvent(candidate_id, 'interview_scheduled', {
    interview_stage_id: result.insertId,
    interview_date, interviewer,
  }, req.admin?.id || req.hr?.id || 'HR');

  logActivity(null, req.admin?.id || req.hr?.id || null, 'interview_scheduled', `Scheduled interview for candidate #${candidate_id}`);
  res.status(201).json({ id: result.insertId });
}

async function updateInterviewStage(req, res) {
  const { id } = req.params;
  const allowed = [
    'workflow_stage_id', 'interview_date', 'duration', 'mode', 'interviewer',
    'location_or_link', 'status', 'type', 'location_name', 'location_address',
    'dress_code', 'what_to_bring', 'map_link', 'meeting_platform', 'meeting_link',
    'candidate_status', 'attendance', 'notes',
  ];
  const updates = []; const params = [];
  for (const col of allowed) {
    if (req.body[col] !== undefined) {
      updates.push(`${col} = ?`);
      params.push(req.body[col]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(id);

  await pool.query(`UPDATE interview_stages SET ${updates.join(', ')} WHERE id = ?`, params);

  const [[stage]] = await pool.query('SELECT * FROM interview_stages WHERE id = ?', [id]);
  res.json(stage);
}

async function deleteInterviewStage(req, res) {
  const { id } = req.params;
  const [[stage]] = await pool.query('SELECT candidate_id FROM interview_stages WHERE id = ?', [id]);
  if (!stage) return res.status(404).json({ error: 'Interview stage not found' });
  await pool.query('DELETE FROM interview_stages WHERE id = ?', [id]);
  await publishEvent(stage.candidate_id, 'interview_cancelled', { interview_stage_id: parseInt(id) }, req.admin?.id || req.hr?.id || 'HR');
  res.json({ deleted: parseInt(id) });
}

// ── Evaluations CRUD ──────────────────────────────────────────
async function listEvaluations(req, res) {
  const { interview_stage_id } = req.params;
  const [rows] = await pool.query(
    `SELECT ie.*, e.name AS evaluator_name
     FROM interview_evaluations ie
     LEFT JOIN employees e ON e.id = ie.evaluated_by_id
     WHERE ie.interview_stage_id = ?
     ORDER BY ie.evaluated_at DESC`,
    [interview_stage_id]
  );
  res.json(rows);
}

async function createEvaluation(req, res) {
  const { interview_stage_id } = req.params;
  const {
    decision, communication_score, technical_score, cultural_fit_score,
    overall_score, form_responses, notes,
  } = req.body;
  if (!interview_stage_id || !decision) {
    return res.status(400).json({ error: 'interview_stage_id and decision are required' });
  }

  const [[stage]] = await pool.query('SELECT candidate_id FROM interview_stages WHERE id = ?', [interview_stage_id]);
  if (!stage) return res.status(404).json({ error: 'Interview stage not found' });

  const [result] = await pool.query(
    `INSERT INTO interview_evaluations
     (interview_stage_id, candidate_id, evaluated_by, evaluated_by_id, decision,
      communication_score, technical_score, cultural_fit_score, overall_score,
      form_responses, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [parseInt(interview_stage_id), stage.candidate_id,
     req.admin?.name || req.hr?.name || 'HR',
     req.admin?.id || req.hr?.id || null,
     decision || 'hold',
     communication_score || 0, technical_score || 0, cultural_fit_score || 0,
     overall_score || 0,
     form_responses ? JSON.stringify(form_responses) : null, notes || '']
  );

  // Update candidate scores from evaluation averages
  const [[avg]] = await pool.query(
    `SELECT AVG(communication_score) ac, AVG(technical_score) at, AVG(cultural_fit_score) af
     FROM interview_evaluations WHERE candidate_id = ?`,
    [stage.candidate_id]
  );
  if (avg) {
    await pool.query(
      'UPDATE recruitment_candidates SET score_comm=?, score_tech=?, score_fit=? WHERE id=?',
      [Math.round(avg.ac || 0), Math.round(avg.at || 0), Math.round(avg.af || 0), stage.candidate_id]
    );
  }

  await publishEvent(stage.candidate_id, 'evaluation_submitted', {
    interview_stage_id: parseInt(interview_stage_id), decision,
  }, req.admin?.id || req.hr?.id || 'HR');

  logActivity(null, req.admin?.id || req.hr?.id || null, 'evaluation_submitted', `Evaluation for interview stage #${interview_stage_id}`);
  res.status(201).json({ id: result.insertId });
}

async function updateEvaluation(req, res) {
  const { id } = req.params;
  const allowed = ['decision', 'communication_score', 'technical_score', 'cultural_fit_score', 'overall_score', 'form_responses', 'notes'];
  const updates = []; const params = [];
  for (const col of allowed) {
    if (req.body[col] !== undefined) {
      updates.push(`${col} = ?`);
      params.push(col === 'form_responses' ? JSON.stringify(req.body[col]) : req.body[col]);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
  params.push(id);
  await pool.query(`UPDATE interview_evaluations SET ${updates.join(', ')} WHERE id = ?`, params);
  const [[ev]] = await pool.query('SELECT * FROM interview_evaluations WHERE id = ?', [id]);
  res.json(ev);
}

async function deleteEvaluation(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM interview_evaluations WHERE id = ?', [id]);
  res.json({ deleted: parseInt(id) });
}

// ── Data Migration ─────────────────────────────────────────────
async function migrateInterviews(req, res) {
  const [oldInterviews] = await pool.query('SELECT * FROM recruitment_interviews');
  const [scorecards] = await pool.query('SELECT * FROM recruitment_scorecards');
  let migrated = 0; let evaluationsMigrated = 0; let errors = [];

  for (const iv of oldInterviews) {
    try {
      // Map candidate_status from old (pending/accepted/declined) to new (pending/accepted/declined/rescheduled)
      const cs = iv.candidate_status || 'pending';
      const att = iv.status === 'completed' ? 'attended' : 'pending';
      await pool.query(
        `INSERT IGNORE INTO interview_stages
         (candidate_id, workflow_stage_id, interview_date, duration, mode, interviewer, location_or_link,
          status, type, location_name, location_address, dress_code, what_to_bring, map_link,
          meeting_platform, meeting_link, candidate_status, attendance, notes)
         VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [iv.candidate_id, iv.interview_date, iv.duration || 60, iv.mode || 'video',
         iv.interviewer || '', iv.location_or_link || '',
         iv.status || 'scheduled', iv.type || 'online', iv.location_name || '',
         iv.location_address || '', iv.dress_code || '', iv.what_to_bring || '',
         iv.map_link || '', iv.meeting_platform || '', iv.meeting_link || '',
         cs, att, iv.notes || '']
      );
      migrated++;
    } catch (e) { errors.push({ id: iv.id, error: e.message }); }
  }

  // Map scorecards to evaluations by matching candidate + interview date
  for (const sc of scorecards) {
    try {
      const [[stage]] = await pool.query(
        `SELECT id FROM interview_stages WHERE candidate_id = ? ORDER BY interview_date DESC LIMIT 1`,
        [sc.candidate_id]
      );
      if (!stage) continue;
      await pool.query(
        `INSERT IGNORE INTO interview_evaluations
         (interview_stage_id, candidate_id, evaluated_by, evaluated_by_id, decision,
          communication_score, technical_score, cultural_fit_score, overall_score, notes, evaluated_at)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
        [stage.id, sc.candidate_id, sc.interviewer || sc.interview || 'HR',
         sc.decision === 'pass' ? 'pass' : sc.decision === 'fail' ? 'reject' : 'hold',
         sc.comm || 0, sc.technical || 0, sc.fit || 0, sc.overall || 0,
         sc.notes || '', sc.created_at]
      );
      evaluationsMigrated++;
    } catch (e) { errors.push({ scorecard_id: sc.id, error: e.message }); }
  }

  res.json({ migrated, evaluations_migrated: evaluationsMigrated, errors: errors.length });
}

// ── Workflow State Migration ────────────────────────────────────
async function migrateCandidateWorkflows(req, res) {
  // Backfill candidate_workflow_state for all existing candidates missing it
  const [candidates] = await pool.query(
    `SELECT rc.id, rc.job_id, rc.stage, COALESCE(rj.workflow_template_id, (SELECT id FROM workflow_templates WHERE is_active = 1 ORDER BY id LIMIT 1)) AS template_id
     FROM recruitment_candidates rc
     LEFT JOIN recruitment_jobs rj ON rc.job_id = rj.id
     WHERE NOT EXISTS (SELECT 1 FROM candidate_workflow_state cws WHERE cws.candidate_id = rc.id)`
  );

  if (candidates.length === 0) {
    return res.json({ migrated: 0, message: 'All candidates already have workflow state' });
  }

  let migrated = 0; let errors = [];
  for (const c of candidates) {
    if (!c.template_id) { errors.push({ id: c.id, error: 'No workflow template available' }); continue; }
    try {
      // Find the stage matching the candidate's current stage, or use first stage
      const [stages] = await pool.query(
        'SELECT id, stage_key FROM workflow_stages WHERE template_id = ? ORDER BY stage_order',
        [c.template_id]
      );
      const match = stages.find(s => s.stage_key === c.stage);
      const stageId = match ? match.id : stages[0]?.id;
      if (!stageId) { errors.push({ id: c.id, error: 'No stages in workflow template' }); continue; }

      await pool.query(
        `INSERT INTO candidate_workflow_state (candidate_id, workflow_template_id, current_stage_id, stage_entered_at)
         VALUES (?, ?, ?, NOW())`,
        [c.id, c.template_id, stageId]
      );
      migrated++;
    } catch (e) { errors.push({ id: c.id, error: e.message }); }
  }

  res.json({ migrated, errors: errors.length });
}

module.exports = {
  listInterviewStages, getInterviewStage, createInterviewStage, updateInterviewStage, deleteInterviewStage,
  listEvaluations, createEvaluation, updateEvaluation, deleteEvaluation,
  migrateInterviews, migrateCandidateWorkflows,
};

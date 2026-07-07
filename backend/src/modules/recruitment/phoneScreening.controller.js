const pool = require('../../shared/config/database');

const PASS_THRESHOLD = 75;

// ── Get phone screening data for a candidate ──
async function getPhoneScreening(req, res) {
  const { id } = req.params;
  const [callLog] = await pool.query(
    'SELECT * FROM phone_screening_call_log WHERE candidate_id = ? ORDER BY attempted_at DESC',
    [id]
  );
  const [evaluations] = await pool.query(
    `SELECT e.*, t.name AS template_name
     FROM phone_screening_evaluations e
     LEFT JOIN phone_screening_templates t ON t.id = e.template_id
     WHERE e.candidate_id = ? ORDER BY e.created_at DESC`,
    [id]
  );
  const [templates] = await pool.query(
    'SELECT * FROM phone_screening_templates WHERE is_active = 1 ORDER BY is_default DESC, name ASC'
  );
  const [[candidate]] = await pool.query(
    'SELECT id, stage, name, email, phone FROM recruitment_candidates WHERE id = ?',
    [id]
  );

  let autoRejectStatus = { shouldReject: false, reason: null };
  const noAnswerAttempts = callLog.filter(a => a.outcome === 'no_answer');
  if (noAnswerAttempts.length > 0) {
    const firstAttempt = new Date(noAnswerAttempts[noAnswerAttempts.length - 1].attempted_at);
    const now = new Date();
    const hoursSinceFirstAttempt = (now - firstAttempt) / (1000 * 60 * 60);
    if (hoursSinceFirstAttempt >= 24) {
      autoRejectStatus = { shouldReject: true, reason: 'Unable to reach candidate after 24 hours of no answer' };
    }
  }

  // Get latest evaluation with answers for display
  let latestEvaluation = null;
  if (evaluations.length > 0) {
    const ev = evaluations[0];
    const [answers] = await pool.query(
      `SELECT a.*, q.question, q.weight, q.max_rating, q.category
       FROM phone_screening_evaluation_answers a
       JOIN phone_screening_questions q ON q.id = a.question_id
       WHERE a.evaluation_id = ?`,
      [ev.id]
    );
    latestEvaluation = {
      evaluationId: ev.id,
      totalScore: ev.total_score,
      maxScore: ev.max_score,
      percentage: ev.percentage,
      decision: ev.decision,
      passed: ev.decision === 'pass',
      message: ev.decision === 'pass'
        ? `Candidate passed with ${ev.percentage}%. You can now schedule the first interview.`
        : `Score ${ev.percentage}% is below the ${PASS_THRESHOLD}% threshold.`,
      notes: ev.notes,
      evaluated_by: ev.evaluated_by,
      created_at: ev.created_at,
      template_name: ev.template_name,
      answers,
    };
  }

  res.json({ candidate, callLog, evaluations, templates, autoRejectStatus, latestEvaluation });
}

// ── Log a call attempt ──
async function logCallAttempt(req, res) {
  const { id } = req.params;
  const { outcome, notes } = req.body;
  if (!outcome) return res.status(400).json({ error: 'outcome is required' });
  const validOutcomes = ['no_answer', 'reached', 'wrong_number', 'busy', 'voicemail'];
  if (!validOutcomes.includes(outcome)) {
    return res.status(400).json({ error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` });
  }
  const adminName = req.admin?.username || req.admin?.name || req.hr?.username || req.hr?.name || 'HR';
  await pool.query(
    'INSERT INTO phone_screening_call_log (candidate_id, attempted_by, attempted_at, outcome, notes) VALUES (?, ?, NOW(), ?, ?)',
    [id, adminName, outcome, notes || null]
  );

  if (outcome === 'wrong_number') {
    await pool.query(
      "INSERT INTO recruitment_history (candidate_id, stage, note, created_by) VALUES (?, 'phone', ?, ?)",
      [id, `Wrong number reported — ${notes || 'Phone number may be incorrect'}`, adminName]
    );
  }

  const [logs] = await pool.query(
    'SELECT * FROM phone_screening_call_log WHERE candidate_id = ? ORDER BY attempted_at DESC',
    [id]
  );

  let autoRejectStatus = { shouldReject: false, reason: null };
  const noAnswerAttempts = logs.filter(a => a.outcome === 'no_answer');
  if (noAnswerAttempts.length > 0) {
    const firstAttempt = new Date(noAnswerAttempts[noAnswerAttempts.length - 1].attempted_at);
    const now = new Date();
    const hoursSinceFirstAttempt = (now - firstAttempt) / (1000 * 60 * 60);
    if (hoursSinceFirstAttempt >= 24) {
      autoRejectStatus = { shouldReject: true, reason: 'Unable to reach candidate after 24 hours of no answer' };
    }
  }

  res.json({ callLog: logs, autoRejectStatus });
}

// ── Delete a call log entry ──
async function deleteCallLogEntry(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM phone_screening_call_log WHERE id = ?', [id]);
  res.json({ message: 'Call log deleted' });
}

// ── Evaluate phone screening ──
async function submitEvaluation(req, res) {
  const { id } = req.params;
  const { template_id, answers, notes, action } = req.body;
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'answers are required (array of { question_id, rating })' });
  }

  const [questions] = await pool.query(
    'SELECT * FROM phone_screening_questions WHERE template_id = ? ORDER BY sort_order ASC',
    [template_id]
  );
  if (questions.length === 0) {
    return res.status(400).json({ error: 'Template not found or has no questions' });
  }

  let totalScore = 0;
  let maxScore = 0;
  const answerRows = [];

  for (const a of answers) {
    const q = questions.find(q => q.id === a.question_id);
    if (!q) continue;
    const rating = Math.min(Math.max(parseInt(a.rating) || 0, 0), q.max_rating);
    totalScore += rating * q.weight;
    maxScore += q.max_rating * q.weight;
    answerRows.push({ question_id: q.id, rating, notes: a.notes || null });
  }

  if (maxScore === 0) return res.status(400).json({ error: 'Invalid evaluation data' });

  const percentage = Math.round((totalScore / maxScore) * 10000) / 100;
  const decision = percentage >= PASS_THRESHOLD ? 'pass' : 'fail';
  const adminName = req.admin?.username || req.admin?.name || req.hr?.username || req.hr?.name || 'HR';

  const [evalResult] = await pool.query(
    `INSERT INTO phone_screening_evaluations (candidate_id, template_id, evaluated_by, total_score, max_score, percentage, decision, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, template_id, adminName, totalScore, maxScore, percentage, decision, notes || null]
  );

  for (const row of answerRows) {
    await pool.query(
      'INSERT INTO phone_screening_evaluation_answers (evaluation_id, question_id, rating, notes) VALUES (?, ?, ?, ?)',
      [evalResult.insertId, row.question_id, row.rating, row.notes]
    );
  }

  await pool.query(
    "INSERT INTO recruitment_history (candidate_id, stage, note, created_by) VALUES (?, 'phone', ?, ?)",
    [id, `Phone screening completed — Score: ${percentage}% — Decision: ${decision}`, adminName]
  );

  const passed = percentage >= PASS_THRESHOLD;

  if (action === 'reject' && !passed) {
    await pool.query("UPDATE recruitment_candidates SET stage = 'rejected' WHERE id = ?", [id]);
    await pool.query(
      "INSERT INTO recruitment_history (candidate_id, stage, note, created_by) VALUES (?, 'rejected', ?, ?)",
      [id, 'Failed phone screening: score below threshold', adminName]
    );
  }

  if (action === 'proceed' && !passed) {
    await pool.query("UPDATE recruitment_candidates SET stage = 'first' WHERE id = ?", [id]);
    await pool.query(
      "INSERT INTO recruitment_history (candidate_id, stage, note, created_by) VALUES (?, 'first', ?)",
      [id, `Phone screening score ${percentage}% (below threshold) but proceed.`, adminName]
    );
  }

  res.json({
    evaluationId: evalResult.insertId,
    totalScore,
    maxScore,
    percentage,
    decision,
    passed,
    message: passed
      ? `Candidate passed with ${percentage}%. You can now schedule the first interview.`
      : `Score ${percentage}% is below the ${PASS_THRESHOLD}% threshold.`,
  });
}

// ── Auto-reject if 24h passed ──
async function checkAutoReject(req, res) {
  const { id } = req.params;
  const [callLog] = await pool.query(
    "SELECT * FROM phone_screening_call_log WHERE candidate_id = ? AND outcome = 'no_answer' ORDER BY attempted_at ASC",
    [id]
  );
  if (callLog.length === 0) return res.json({ rejected: false, reason: null });

  const firstAttempt = new Date(callLog[0].attempted_at);
  const now = new Date();
  const hoursSinceFirstAttempt = (now - firstAttempt) / (1000 * 60 * 60);

  if (hoursSinceFirstAttempt >= 24) {
    const adminName = req.admin?.username || req.admin?.name || req.hr?.username || req.hr?.name || 'system';
    await pool.query("UPDATE recruitment_candidates SET stage = 'rejected' WHERE id = ?", [id]);
    await pool.query(
      "INSERT INTO recruitment_history (candidate_id, stage, note, created_by) VALUES (?, 'rejected', ?, ?)",
      [id, 'Auto-rejected: unable to reach candidate after 24 hours of no answer', adminName]
    );
    return res.json({ rejected: true, reason: 'Unable to reach candidate after 24 hours of no answer' });
  }

  const lastAttempt = new Date(callLog[callLog.length - 1].attempted_at);
  const minutesSinceLastAttempt = (now - lastAttempt) / (1000 * 60);
  const nextCallAt = new Date(lastAttempt.getTime() + 30 * 60 * 1000);

  res.json({
    rejected: false,
    reason: null,
    attempts: callLog.length,
    firstAttemptAt: callLog[0].attempted_at,
    lastAttemptAt: callLog[callLog.length - 1].attempted_at,
    minutesSinceLastAttempt: Math.round(minutesSinceLastAttempt),
    nextCallAt: minutesSinceLastAttempt < 30 ? nextCallAt.toISOString() : null,
    canCallNow: minutesSinceLastAttempt >= 30,
  });
}

// ── Templates CRUD ──
async function listTemplates(req, res) {
  const [rows] = await pool.query(
    `SELECT t.*, (SELECT COUNT(*) FROM phone_screening_questions WHERE template_id = t.id) AS question_count
     FROM phone_screening_templates t ORDER BY t.is_default DESC, t.name ASC`
  );
  res.json(rows);
}

async function getTemplate(req, res) {
  const { id } = req.params;
  const [[template]] = await pool.query('SELECT * FROM phone_screening_templates WHERE id = ?', [id]);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const [questions] = await pool.query(
    'SELECT * FROM phone_screening_questions WHERE template_id = ? ORDER BY sort_order ASC',
    [id]
  );
  res.json({ ...template, questions });
}

async function createTemplate(req, res) {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const [result] = await pool.query(
    'INSERT INTO phone_screening_templates (name, description) VALUES (?, ?)',
    [name, description || null]
  );
  res.json({ id: result.insertId, name, description });
}

async function updateTemplate(req, res) {
  const { id } = req.params;
  const { name, description, is_active } = req.body;
  const fields = [];
  const params = [];
  if (name !== undefined) { fields.push('name = ?'); params.push(name); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  params.push(id);
  await pool.query(`UPDATE phone_screening_templates SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Template updated' });
}

async function deleteTemplate(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM phone_screening_templates WHERE id = ?', [id]);
  res.json({ message: 'Template deleted' });
}

async function addQuestion(req, res) {
  const { id } = req.params;
  const { question, weight, max_rating, category, sort_order } = req.body;
  if (!question) return res.status(400).json({ error: 'question is required' });
  const [result] = await pool.query(
    'INSERT INTO phone_screening_questions (template_id, question, weight, max_rating, category, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [id, question, weight || 1.0, max_rating || 5, category || 'general', sort_order || 0]
  );
  res.json({ id: result.insertId });
}

async function updateQuestion(req, res) {
  const { id } = req.params;
  const { question, weight, max_rating, category, sort_order } = req.body;
  const fields = [];
  const params = [];
  if (question !== undefined) { fields.push('question = ?'); params.push(question); }
  if (weight !== undefined) { fields.push('weight = ?'); params.push(weight); }
  if (max_rating !== undefined) { fields.push('max_rating = ?'); params.push(max_rating); }
  if (category !== undefined) { fields.push('category = ?'); params.push(category); }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  params.push(id);
  await pool.query(`UPDATE phone_screening_questions SET ${fields.join(', ')} WHERE id = ?`, params);
  res.json({ message: 'Question updated' });
}

async function deleteQuestion(req, res) {
  const { id } = req.params;
  await pool.query('DELETE FROM phone_screening_questions WHERE id = ?', [id]);
  res.json({ message: 'Question deleted' });
}

module.exports = {
  getPhoneScreening,
  logCallAttempt,
  submitEvaluation,
  checkAutoReject,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  deleteCallLogEntry,
};

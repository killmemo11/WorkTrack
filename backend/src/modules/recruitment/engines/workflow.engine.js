const pool = require('../../../shared/config/database');

async function getWorkflowForJob(jobId) {
  const [[job]] = await pool.query(
    'SELECT workflow_template_id FROM recruitment_jobs WHERE id = ?', [jobId]
  );
  if (!job || !job.workflow_template_id) return null;
  const [stages] = await pool.query(
    'SELECT * FROM workflow_stages WHERE template_id = ? ORDER BY stage_order',
    [job.workflow_template_id]
  );
  return { template_id: job.workflow_template_id, stages };
}

async function getCandidateState(candidateId) {
  const [[state]] = await pool.query(
    'SELECT * FROM candidate_workflow_state WHERE candidate_id = ?', [candidateId]
  );
  return state || null;
}

async function initCandidateState(candidateId, templateId) {
  const [stages] = await pool.query(
    'SELECT id FROM workflow_stages WHERE template_id = ? ORDER BY stage_order LIMIT 1',
    [templateId]
  );
  if (stages.length === 0) return null;
  const firstStageId = stages[0].id;
  // Read current template version for pinning
  const [[tpl]] = await pool.query(
    'SELECT COALESCE(version, 1) AS version FROM workflow_templates WHERE id = ?',
    [templateId]
  );
  const version = tpl?.version || 1;
  await pool.query(
    `INSERT INTO candidate_workflow_state (candidate_id, workflow_template_id, template_version, current_stage_id, stage_entered_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [candidateId, templateId, version, firstStageId]
  );
  return getCandidateState(candidateId);
}

async function transition(candidateId, toStageKey, options = {}) {
  const { note, createdBy, eventData } = options;
  const state = await getCandidateState(candidateId);
  if (!state) throw new Error(`No workflow state for candidate #${candidateId}`);

  const [stages] = await pool.query(
    'SELECT * FROM workflow_stages WHERE template_id = ? ORDER BY stage_order',
    [state.workflow_template_id]
  );
  const toStage = stages.find(s => s.stage_key === toStageKey);

  // Rejected is a universal terminal stage — allow it even if absent from workflow_stages
  if (toStageKey === 'rejected' && !toStage) {
    const adminName = createdBy || 'system';
    const prevStageId = state.current_stage_id;
    await pool.query(
      `UPDATE candidate_workflow_state SET previous_stage_id = ?, previous_stage_exited_at = NOW(),
       is_completed = 1 WHERE candidate_id = ?`,
      [prevStageId, candidateId]
    );
    await pool.query(
      'UPDATE recruitment_candidates SET stage = ? WHERE id = ?',
      ['rejected', candidateId]
    );
    await pool.query(
      'INSERT INTO recruitment_history (candidate_id, stage, note, created_by) VALUES (?, ?, ?, ?)',
      [candidateId, 'rejected', note || 'Candidate rejected', adminName]
    );
    await publishEvent(candidateId, 'stage_transition', {
      from_stage: stages.find(s => s.id === prevStageId)?.stage_key || null,
      to_stage: 'rejected',
      note: note || null,
      ...(eventData || {}),
    }, null, adminName);

    fireAsyncAutomation(candidateId, 'stage_transition', { to_stage: 'rejected' });

    return getCandidateState(candidateId);
  }

  if (!toStage) throw new Error(`Stage '${toStageKey}' not found in workflow`);

  const currentIdx = stages.findIndex(s => s.id === state.current_stage_id);
  const toIdx = stages.indexOf(toStage);
  if (toIdx <= currentIdx && toStageKey !== 'rejected') {
    throw new Error(`Cannot transition backwards from '${stages[currentIdx]?.stage_key}' to '${toStageKey}'`);
  }

  const adminName = createdBy || 'system';
  const prevStageId = state.current_stage_id;

  await pool.query(
    `UPDATE candidate_workflow_state
     SET previous_stage_id = ?, previous_stage_exited_at = NOW(),
         current_stage_id = ?, stage_entered_at = NOW(),
         is_completed = ?
     WHERE candidate_id = ?`,
    [prevStageId, toStage.id, toStage.stage_key === 'hired' ? 1 : 0, candidateId]
  );

  await pool.query(
    'UPDATE recruitment_candidates SET stage = ? WHERE id = ?',
    [toStageKey, candidateId]
  );

  await pool.query(
    'INSERT INTO recruitment_history (candidate_id, stage, note, created_by) VALUES (?, ?, ?, ?)',
    [candidateId, toStageKey, note || `Moved to ${toStage.display_name}`, adminName]
  );

  await publishEvent(candidateId, 'stage_transition', {
    from_stage: stages.find(s => s.id === prevStageId)?.stage_key || null,
    to_stage: toStageKey,
    to_stage_name: toStage.display_name,
    note: note || null,
    ...(eventData || {}),
  }, toStage.id, adminName);

  fireAsyncAutomation(candidateId, 'stage_transition', { to_stage: toStageKey, workflow_stage_id: toStage.id });

  return getCandidateState(candidateId);
}

function fireAsyncAutomation(candidateId, eventType, eventData) {
  setImmediate(async () => {
    try {
      const { processEvent } = require('./automation.engine');
      await processEvent({
        candidate_id: candidateId,
        event_type: eventType,
        event_data: eventData,
      });
    } catch (e) {
      console.error('Async automation error:', e);
    }
  });
}

async function publishEvent(candidateId, eventType, eventData, workflowStageId, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO workflow_events (candidate_id, event_type, event_data, workflow_stage_id, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [candidateId, eventType, JSON.stringify(eventData || {}), workflowStageId || null, createdBy || 'system']
  );
  return result.insertId;
}

module.exports = { getWorkflowForJob, getCandidateState, initCandidateState, transition, publishEvent };

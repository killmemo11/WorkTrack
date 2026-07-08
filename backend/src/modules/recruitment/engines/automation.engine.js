const pool = require('../../../shared/config/database');

function evaluateCondition(candidateData, field, operator, value) {
  const fieldValue = resolveField(candidateData, field);
  if (fieldValue === undefined || fieldValue === null) return false;
  switch (operator) {
    case '>': return Number(fieldValue) > Number(value);
    case '<': return Number(fieldValue) < Number(value);
    case '>=': return Number(fieldValue) >= Number(value);
    case '<=': return Number(fieldValue) <= Number(value);
    case '==': return String(fieldValue) === String(value);
    case '!=': return String(fieldValue) !== String(value);
    case 'in': return String(value).split(',').map(s => s.trim()).includes(String(fieldValue));
    case 'not_in': return !String(value).split(',').map(s => s.trim()).includes(String(fieldValue));
    case 'contains': return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    case 'is_empty': return !fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim());
    case 'always': return true;
    default: return false;
  }
}

function resolveField(data, fieldPath) {
  const parts = fieldPath.split('.');
  let current = data;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

async function processEvent(event) {
  const [rules] = await pool.query(
    'SELECT * FROM workflow_rules WHERE trigger_event = ? AND is_active = 1 ORDER BY priority',
    [event.event_type]
  );
  if (rules.length === 0) return [];

  const [[candidate]] = await pool.query(
    'SELECT * FROM recruitment_candidates WHERE id = ?', [event.candidate_id]
  );
  if (!candidate) return [];

  const candidateData = { candidate, evaluation: event.event_data || {} };

  const results = [];
  for (const rule of rules) {
    const params = typeof rule.action_params === 'string'
      ? JSON.parse(rule.action_params) : rule.action_params;

    const matched = evaluateCondition(candidateData, rule.condition_field, rule.condition_operator, rule.condition_value);
    if (!matched) continue;

    await executeAction(rule.action_type, params, event, candidate);
    results.push({ rule_id: rule.id, rule_name: rule.rule_name, action: rule.action_type, params });
  }
  return results;
}

async function executeAction(actionType, params, event, candidate) {
  switch (actionType) {
    case 'skip_stage': {
      const { stage_key } = params;
      if (stage_key) {
        const { transition } = require('./workflow.engine');
        const [nextStages] = await pool.query(
          `SELECT ws.id FROM workflow_stages ws
           JOIN candidate_workflow_state cws ON cws.workflow_template_id = ws.template_id
           WHERE cws.candidate_id = ? AND ws.stage_key > ? ORDER BY ws.stage_order LIMIT 1`,
          [event.candidate_id, stage_key]
        );
        if (nextStages.length > 0) {
          await transition(event.candidate_id, nextStages[0].stage_key, {
            note: `Auto-skipped ${stage_key} per business rule`,
            createdBy: 'automation',
            eventData: { skipped_stage: stage_key, rule: 'skip_stage' },
          });
        }
      }
      break;
    }
    case 'send_notification': {
      const notificationService = require('../../../shared/services/notification.service');
      if (params.admin_id) {
        await notificationService.createAdminNotification(
          params.admin_id, params.title || 'Action Required',
          params.message || '', params.type || 'info', params.link || null
        );
      }
      break;
    }
    case 'send_email': {
      const emailService = require('../../../shared/services/email.service');
      const { renderEmail } = require('./template.engine');
      if (params.template_key && candidate) {
        const result = await renderEmail(params.template_key, { candidate_name: candidate.name, job_title: candidate.job_title, ...params.context });
        await emailService.sendEmail(candidate.email, result.subject, result.html);
      }
      break;
    }
    case 'reject_candidate': {
      const { transition } = require('./workflow.engine');
      await transition(event.candidate_id, 'rejected', {
        note: params.reason || 'Auto-rejected per business rule',
        createdBy: 'automation',
        eventData: { rule: 'reject_candidate', reason: params.reason },
      });
      break;
    }
    default:
      break;
  }
}

module.exports = { processEvent };

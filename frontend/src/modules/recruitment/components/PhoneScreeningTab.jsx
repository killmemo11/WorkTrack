import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../../shared/components/Icon';
import hrApi from '../../../shared/api/hrApi';

const PASS_THRESHOLD = 75;

const OUTCOME_LABELS = {
  no_answer: 'No Answer',
  reached: 'Reached',
  wrong_number: 'Wrong Number',
  busy: 'Busy',
  voicemail: 'Voicemail',
};

const OUTCOME_COLORS = {
  no_answer: 'var(--warning)',
  reached: 'var(--success)',
  wrong_number: 'var(--error)',
  busy: 'var(--text-faint)',
  voicemail: 'var(--info)',
};

const OUTCOME_ICONS = {
  no_answer: 'lucide:phone-missed',
  reached: 'lucide:phone-call',
  wrong_number: 'lucide:alert-circle',
  busy: 'lucide:clock',
  voicemail: 'lucide:voicemail',
};

export default function PhoneScreeningTab({ candidateId, candidateStage, onStageChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogCall, setShowLogCall] = useState(false);
  const [logForm, setLogForm] = useState({ outcome: 'no_answer', notes: '' });
  const [logging, setLogging] = useState(false);
  const [showEval, setShowEval] = useState(false);
  const [evalForm, setEvalForm] = useState({ template_id: null, answers: {}, notes: '' });
  const [evalResult, setEvalResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = useCallback(async () => {
    if (!candidateId) return;
    try {
      setLoading(true);
      const res = await hrApi.get(`/recruitment/candidates/${candidateId}/phone-screening`);
      setData(res.data);
      if (res.data.templates?.length && !evalForm.template_id) {
        setEvalForm(f => ({ ...f, template_id: res.data.templates[0].id }));
      }
    } catch { } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogCall = async () => {
    if (!logForm.outcome) return;
    try {
      setLogging(true);
      const res = await hrApi.post(`/recruitment/candidates/${candidateId}/phone-screening/log`, logForm);
      setData(d => ({ ...d, callLog: res.data.callLog, autoRejectStatus: res.data.autoRejectStatus }));
      setShowLogCall(false);
      setLogForm({ outcome: 'no_answer', notes: '' });
      if (logForm.outcome === 'reached') setShowEval(true);
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to log call');
    } finally {
      setLogging(false);
    }
  };

  const handleEvaluate = async (action) => {
    try {
      setEvaluating(true);
      const answers = Object.entries(evalForm.answers).map(([qId, rating]) => ({
        question_id: parseInt(qId), rating,
      }));
      const res = await hrApi.post(`/recruitment/candidates/${candidateId}/phone-screening/evaluate`, {
        template_id: evalForm.template_id,
        answers,
        notes: evalForm.notes,
        action: action || null,
      });
      setEvalResult(res.data);
      if (action === 'reject' || action === 'proceed') {
        if (onStageChange) onStageChange();
      }
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed to submit evaluation');
    } finally {
      setEvaluating(false);
    }
  };

  const handleAutoReject = async () => {
    try {
      const res = await hrApi.get(`/recruitment/candidates/${candidateId}/phone-screening/auto-reject`);
      if (res.data.rejected) {
        setActionMsg('Candidate auto-rejected (unable to reach after 24h)');
        if (onStageChange) onStageChange();
        fetchData();
      }
    } catch { }
  };

  const getReminderStatus = () => {
    if (!data?.callLog?.length) return { type: 'call_now', message: 'No call attempts yet. Call the candidate now.' };
    const lastLog = data.callLog[0];
    if (lastLog.outcome !== 'no_answer') return null;
    const lastTime = new Date(lastLog.attempted_at).getTime();
    const now = Date.now();
    const minsSince = (now - lastTime) / 60000;
    if (minsSince < 30) {
      const remaining = Math.ceil(30 - minsSince);
      const nextCall = new Date(lastTime + 30 * 60000);
      return {
        type: 'wait',
        message: `Last no answer ${Math.round(minsSince)} min ago. Try again after ${nextCall.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${remaining} min)`,
        nextCallAt: nextCall,
      };
    }
    return { type: 'call_ready', message: 'Overdue — call the candidate now!' };
  };

  if (!candidateId || candidateStage !== 'phone') {
    return (
      <div className="glass-empty">
        <Icon icon="lucide:phone-off" />
        <h3>Phone screening is only available in the Phone stage</h3>
      </div>
    );
  }

  if (loading) {
    return <div className="glass-empty"><Icon icon="lucide:loader" /><p>Loading phone screening...</p></div>;
  }

  const reminder = getReminderStatus();
  const noAnswerCount = data?.callLog?.filter(l => l.outcome === 'no_answer')?.length || 0;
  const lastLog = data?.callLog?.[0];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {actionMsg && (
        <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <Icon icon="lucide:info" style={{ color: 'var(--brand-primary)' }} />
          {actionMsg}
          <button onClick={() => setActionMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Auto-reject warning */}
      {data?.autoRejectStatus?.shouldReject && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon icon="lucide:alert-triangle" style={{ color: 'var(--error)', fontSize: '1.2rem' }} />
            <strong style={{ color: 'var(--error)' }}>24-hour timeout reached</strong>
          </div>
          <p style={{ fontSize: '0.85rem', margin: '0 0 8px', color: 'var(--text-secondary)' }}>
            First no-attempt call was more than 24 hours ago. The candidate will be rejected automatically.
          </p>
          <button className="glass-btn glass-btn-sm glass-btn-danger" onClick={handleAutoReject}>
            <Icon icon="lucide:x-circle" /> Execute Auto-Reject
          </button>
        </div>
      )}

      {/* Call reminder */}
      {reminder && !data?.autoRejectStatus?.shouldReject && (
        <div style={{
          background: reminder.type === 'call_ready' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
          border: `1px solid ${reminder.type === 'call_ready' ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: 8, padding: '8px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
        }}>
          <Icon icon={reminder.type === 'call_ready' ? 'lucide:bell-ring' : 'lucide:clock'} style={{
            color: reminder.type === 'call_ready' ? 'var(--success)' : 'var(--warning)', fontSize: '1.1rem',
          }} />
          <span style={{ color: reminder.type === 'call_ready' ? 'var(--success)' : 'var(--warning)' }}>{reminder.message}</span>
        </div>
      )}

      {/* Evaluation Result */}
      {evalResult && (
        <div style={{
          background: evalResult.passed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
          border: `1px solid ${evalResult.passed ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: evalResult.passed ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon icon={evalResult.passed ? 'lucide:check-circle' : 'lucide:alert-circle'}
                style={{ fontSize: '1.5rem', color: evalResult.passed ? 'var(--success)' : 'var(--warning)' }} />
            </div>
            <div>
              <strong style={{ fontSize: '1.1rem', color: evalResult.passed ? 'var(--success)' : 'var(--warning)' }}>
                {evalResult.passed ? 'Passed' : 'Below Threshold'}
              </strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{evalResult.message}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: evalResult.passed ? 'var(--success)' : 'var(--warning)' }}>
                {evalResult.percentage}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>Score</div>
            </div>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, marginBottom: 12 }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.5s ease',
              width: `${Math.min(evalResult.percentage, 100)}%`,
              background: evalResult.passed
                ? 'linear-gradient(90deg, var(--success), #4ade80)'
                : 'linear-gradient(90deg, var(--warning), #fbbf24)',
            }} />
          </div>

          {evalResult.passed && (
            <button className="glass-btn glass-btn-success" onClick={() => {/* Schedule interview — use existing interview modal */ }}>
              <Icon icon="lucide:calendar-plus" /> Schedule First Interview
            </button>
          )}
          {!evalResult.passed && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="glass-btn glass-btn-danger" onClick={() => handleEvaluate('reject')} disabled={evaluating}>
                <Icon icon="lucide:x-circle" /> Reject Candidate
              </button>
              <button className="glass-btn" onClick={() => handleEvaluate('proceed')} disabled={evaluating}>
                <Icon icon="lucide:arrow-right" /> Proceed Anyway
              </button>
            </div>
          )}
        </div>
      )}

      {/* Call Log */}
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon icon="lucide:phone" /> Call Log
            {noAnswerCount > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', fontWeight: 400 }}>
                ({noAnswerCount} no answer)
              </span>
            )}
          </h4>
          <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => setShowLogCall(true)}>
            <Icon icon="lucide:phone-call" /> Log Call
          </button>
        </div>
        {data?.callLog?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.callLog.map((log, i) => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                background: i === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
                fontSize: '0.85rem',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${OUTCOME_COLORS[log.outcome]}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon icon={OUTCOME_ICONS[log.outcome]} style={{ color: OUTCOME_COLORS[log.outcome], fontSize: '0.8rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                      background: `${OUTCOME_COLORS[log.outcome]}20`,
                      color: OUTCOME_COLORS[log.outcome],
                    }}>
                      {OUTCOME_LABELS[log.outcome]}
                    </span>
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                      by {log.attempted_by}
                    </span>
                  </div>
                  {log.notes && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 2 }}>{log.notes}</div>}
                </div>
                <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                  {new Date(log.attempted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-faint)' }}>
            <Icon icon="lucide:phone-off" style={{ fontSize: '1.5rem', marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No call attempts yet</p>
          </div>
        )}
      </div>

      {/* Evaluation Form */}
      {showEval && !evalResult && data?.templates?.length > 0 && (
        <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon icon="lucide:clipboard-check" /> Phone Evaluation
          </h4>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Template</label>
            <select className="glass-select" value={evalForm.template_id || ''}
              onChange={e => setEvalForm(f => ({ ...f, template_id: parseInt(e.target.value) }))}>
              {data.templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {evalForm.template_id && (() => {
            const tmpl = data.templates.find(t => t.id === evalForm.template_id);
            if (!tmpl?.questions) return <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>Loading questions...</p>;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tmpl.questions.map((q, i) => (
                  <div key={q.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 4 }}>
                      <span>{i + 1}. {q.question}</span>
                      <span style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>weight: {q.weight}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: q.max_rating }, (_, r) => r + 1).map(r => (
                        <button key={r} onClick={() => setEvalForm(f => ({ ...f, answers: { ...f.answers, [q.id]: r } }))}
                          style={{
                            flex: 1, padding: '6px 0', border: '1px solid', borderRadius: 6, cursor: 'pointer',
                            background: (evalForm.answers[q.id] || 0) >= r
                              ? `rgba(99,102,241,${r / q.max_rating + 0.3})`
                              : 'rgba(255,255,255,0.04)',
                            borderColor: (evalForm.answers[q.id] || 0) >= r
                              ? 'rgba(99,102,241,0.5)'
                              : 'var(--border-glass)',
                            color: (evalForm.answers[q.id] || 0) >= r ? '#fff' : 'var(--text-faint)',
                            transition: 'all 0.15s',
                          }}>
                          {r}
                        </button>
                      ))}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', display: 'flex', alignItems: 'center', marginLeft: 4 }}>
                        {evalForm.answers[q.id] ? `${evalForm.answers[q.id]}/${q.max_rating}` : '-'}
                      </span>
                    </div>
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Notes</label>
                  <textarea className="glass-input" rows={2} value={evalForm.notes}
                    onChange={e => setEvalForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="glass-btn glass-btn-sm" onClick={() => { setShowEval(false); setEvalResult(null); }}>
                    Cancel
                  </button>
                  <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => handleEvaluate()}
                    disabled={evaluating || Object.keys(evalForm.answers).length === 0}>
                    {evaluating ? 'Submitting...' : 'Submit Evaluation'}
                  </button>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Log Call Modal */}
      <AnimatePresence>
        {showLogCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowLogCall(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card" style={{ padding: 24, maxWidth: 420, width: '90%' }}
              onClick={e => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon icon="lucide:phone-call" /> Log Call Attempt
              </h4>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Outcome</label>
                <select className="glass-select" value={logForm.outcome}
                  onChange={e => setLogForm(f => ({ ...f, outcome: e.target.value }))}>
                  {Object.entries(OUTCOME_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>Notes</label>
                <textarea className="glass-input" rows={2} value={logForm.notes}
                  onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: '100%', resize: 'vertical' }}
                  placeholder={logForm.outcome === 'wrong_number' ? 'Enter correct number if available' : 'Optional notes...'} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="glass-btn glass-btn-sm" onClick={() => setShowLogCall(false)}>Cancel</button>
                <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={handleLogCall} disabled={logging}>
                  {logging ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const stagger = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardAnim = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};
const stepperAnim = {
  initial: { scale: 0 },
  animate: (i) => ({ scale: 1, transition: { type: 'spring', stiffness: 400, damping: 15, delay: i * 0.06 } }),
};

const REJECTION_REASONS = {
  education_level: 'Your education level does not meet the minimum requirements for this position',
  experience_years: 'Your years of experience do not meet the minimum requirements for this position',
  required_skills: 'Some required skills are missing from your profile',
  required_certs: 'Some required certifications are missing from your profile',
  expected_salary: 'Your salary expectations exceed the budget for this position',
};

export default function PublicTrack() {
  const [email, setEmail] = useState('');
  const [apps, setApps] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      const res = await axios.get(`/api/track/${encodeURIComponent(email)}`);
      setApps(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'No applications found for this email');
      setApps(null);
    } finally {
      setLoading(false);
    }
  };

  const stageBadge = (stage) => {
    const map = {
      applied: 'neutral', screening: 'info', phone: 'info',
      first: 'primary', second: 'warning', third: 'danger',
      interview: 'primary', assessment: 'warning',
      shortlist: 'info', offer: 'success', hired: 'success', rejected: 'danger',
    };
    const icons = {
      applied: 'lucide:file-text', screening: 'lucide:scan-search', phone: 'lucide:phone',
      first: 'lucide:user-check', second: 'lucide:user-check', third: 'lucide:user-check',
      interview: 'lucide:video', assessment: 'lucide:clipboard-check',
      shortlist: 'lucide:list', offer: 'lucide:gift',
      hired: 'lucide:party-popper', rejected: 'lucide:x-circle',
    };
    return (
      <span className={`glass-badge glass-badge-${map[stage] || 'neutral'}`}>
        <Icon icon={icons[stage] || 'lucide:help-circle'} style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon>
        {stage}
      </span>
    );
  };

  const STEPS = ['applied', 'screening', 'interview', 'offer', 'hired'];
  const stepIcons = {
    applied: 'lucide:file-text', screening: 'lucide:scan-search',
    interview: 'lucide:video', offer: 'lucide:gift', hired: 'lucide:party-popper',
  };
  const stepLabels = {
    applied: 'Applied', screening: 'Screening', interview: 'Interview', offer: 'Offer', hired: 'Hired',
  };

  const getStepStatus = (currentStage, stepIndex) => {
    const stageRank = { applied: 0, phone: 1, first: 2, second: 3, third: 4, offer: 5, hired: 6, rejected: -1 };
    const simplifiedRank = { applied: 0, phone: 1, first: 1, second: 1, third: 1, offer: 2, hired: 3, rejected: -1 };
    const rank = simplifiedRank[currentStage];
    if (rank === undefined) return 'pending';
    if (currentStage === 'rejected') return stepIndex <= rank ? 'rejected' : 'pending';
    if (stepIndex < rank) return 'completed';
    if (stepIndex === rank) return 'active';
    return 'pending';
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 20px' }}>
      {/* Careers Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }} className="fade-in-up">
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers')}>
          <Icon icon="lucide:briefcase"></Icon> Jobs
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/apply')}>
          <Icon icon="lucide:send"></Icon> Apply
        </button>
        <button className="glass-btn glass-btn-primary">
          <Icon icon="lucide:search"></Icon> Track
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/interviews')}>
          <Icon icon="lucide:video"></Icon> Interviews
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }} className="fade-in-up">
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
        }}>
          <Icon icon="lucide:search" style={{ fontSize: '1.4rem', color: '#fff' }}></Icon>
        </div>
        <h1 style={{ color: 'var(--text-primary)' }}>Track Your Application</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>Enter the email you used to apply</p>
      </div>

      <div className="glass-card fade-in-up delay-1" style={{ marginTop: 24 }}>
        <div className="glass-card-body">
          {error && (
            <div className="glass-alert glass-alert-danger" role="alert">
              <Icon icon="lucide:alert-circle"></Icon> {error}
            </div>
          )}

          <form onSubmit={handleTrack} style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Icon icon="lucide:mail" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}></Icon>
              <input
                type="email"
                className="glass-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ paddingLeft: 38 }}
              />
            </div>
            <button type="submit" className="glass-btn glass-btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Searching...</> : <><Icon icon="lucide:search"></Icon> Track</>}
            </button>
          </form>
        </div>
      </div>

      {apps && apps.data.length === 0 && (
        <div className="glass-card fade-in-up" style={{ marginTop: 16 }}>
          <div className="glass-card-body" style={{ textAlign: 'center', padding: 32 }}>
            <Icon icon="lucide:inbox" style={{ fontSize: '1.6rem', color: 'var(--text-faint)' }}></Icon>
            <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>No applications found for this email.</p>
          </div>
        </div>
      )}

      {apps && apps.data.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <Icon icon="lucide:folder-open" style={{ color: 'var(--brand-primary)' }}></Icon>
            Your Applications ({apps.data.length})
          </h3>
          <motion.div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }} variants={stagger} initial="initial" animate="animate">
            {apps.data.map(app => (
              <motion.div key={app.id} variants={cardAnim}
                whileHover={{ y: -3, borderColor: 'rgba(99,102,241,0.2)', transition: { duration: 0.2 } }}
                className="glass-panel"
                style={{ borderRadius: 'var(--radius-lg)', padding: 20, border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                      <Icon icon="lucide:briefcase" style={{ color: 'var(--brand-primary)' }}></Icon>
                      {app.job_title}
                    </h4>
                    <p style={{ margin: '4px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      <Icon icon="lucide:calendar" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon>
                      Applied: {new Date(app.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {app.job_id ? ` \u00b7 Job #${app.job_id}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {stageBadge(app.stage)}
                  </div>
                </div>

                {/* Stepper */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
                    {STEPS.map((step, i) => {
                      const status = getStepStatus(app.stage, i);
                      const isCompleted = status === 'completed';
                      const isActive = status === 'active';
                      const isRejected = status === 'rejected';
                      return (
                        <motion.div key={step} custom={i} variants={stepperAnim}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                          <motion.div
                            animate={isActive ? { scale: [1, 1.15, 1], borderColor: ['rgba(99,102,241,0.3)', 'rgba(99,102,241,0.6)', 'rgba(99,102,241,0.3)'] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                            style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: isCompleted ? 'var(--success)' : isActive ? 'var(--brand-primary)' : isRejected ? 'var(--error)' : 'rgba(255,255,255,0.06)',
                              border: isCompleted || isActive ? 'none' : '1px solid var(--border-glass)',
                              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              zIndex: 1, marginBottom: 6,
                            }}>
                            <Icon icon={ isCompleted ? 'lucide:check' : isRejected ? 'lucide:x' : stepIcons[step] } style={{ fontSize: '0.75rem' }}></Icon>
                          </motion.div>
                          <span style={{ fontSize: '0.65rem', color: isActive ? 'var(--brand-primary)' : isCompleted ? 'var(--success)' : isRejected ? 'var(--error)' : 'var(--text-faint)', textAlign: 'center' }}>
                            {stepLabels[step]}
                          </span>
                          {i < STEPS.length - 1 && (
                            <div style={{
                              position: 'absolute', top: 14, left: '50%', width: '100%', height: 2,
                              background: isCompleted ? 'var(--success)' : 'rgba(255,255,255,0.06)',
                              zIndex: 0,
                            }} />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Screening + Re-apply */}
                {app.screening && app.screening.overall_status === 'rejected' && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Icon icon="lucide:x-circle" style={{ color: 'var(--error)', fontSize: '1.1rem', marginTop: 2, flexShrink: 0 }}></Icon>
                      <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                          Unfortunately, your application did not meet all the requirements for this position.
                        </p>
                        {app.screening.requirement_results && (
                          <div style={{ marginTop: 8 }}>
                            {app.screening.requirement_results
                              .filter(r => r.status === 'rejected')
                              .map((r, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: '0.82rem' }}>
                                  <Icon icon="lucide:alert-circle" style={{ color: 'var(--error)', fontSize: '0.75rem', flexShrink: 0 }}></Icon>
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    {REJECTION_REASONS[r.requirement] || `Requirement not met: ${r.requirement}`}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                        <Icon icon="lucide:clock" style={{ color: 'var(--warning)', fontSize: '1rem' }}></Icon>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Re-apply Eligibility</span>
                      </div>
                      <p style={{ marginTop: 6, fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                        You may re-apply for this or similar positions after <strong style={{ color: 'var(--text-primary)' }}>3 months</strong> from your application date.
                      </p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Re-apply eligible from: <strong>{(() => {
                          const d = new Date(app.created_at);
                          d.setMonth(d.getMonth() + 3);
                          return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                        })()}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {app.screening && app.screening.overall_status && app.screening.overall_status !== 'rejected' && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <Icon icon="lucide:check-circle" style={{ color: 'var(--success)', fontSize: '1.1rem', marginTop: 2, flexShrink: 0 }}></Icon>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                        Your application has passed initial screening.<br />
                        You are now in the <strong style={{ color: 'var(--text-primary)' }}>phone interview</strong> stage.
                      </p>
                    </div>
                  </div>
                )}

                {/* History */}
                {app.history && app.history.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon icon="lucide:clock" style={{ fontSize: '0.8rem' }}></Icon> Activity
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {app.history.map(h => (
                        <div key={h.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-faint)', whiteSpace: 'nowrap', fontFamily: 'var(--mono)' }}>
                            {new Date(h.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                          <span className={`glass-badge glass-badge-neutral`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{h.stage}</span>
                          <span style={{ color: 'var(--text-dim)' }}>{h.note || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const EDU_LABEL = { high_school: 'High School', diploma: 'Diploma', associate: 'Associate Degree', bachelor: "Bachelor's", master: "Master's", phd: 'PhD' };
const EXP_LABEL = { '0-1': 'Less than 1 year', '1-2': '1–2 years', '2-3': '2–3 years', '3-5': '3–5 years', '5-7': '5–7 years', '7-10': '7–10 years', '10-15': '10–15 years', '15-20': '15–20 years', '20+': 'More than 20 years' };

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
    const stepName = STEPS[stepIndex];
    const currentIndex = STEPS.indexOf(currentStage);
    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    if (currentStage === 'rejected') return stepIndex <= STEPS.indexOf(currentStage) ? 'rejected' : 'pending';
    return 'pending';
  };

  const screeningLabel = (status) => {
    if (status === 'most_recommended') return { text: 'Most Recommended', color: 'success', icon: 'lucide:star' };
    if (status === 'recommended') return { text: 'Recommended', color: 'info', icon: 'lucide:thumbs-up' };
    return { text: 'Not Met', color: 'neutral', icon: 'lucide:minus' };
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

      {apps && apps.length === 0 && (
        <div className="glass-card fade-in-up" style={{ marginTop: 16 }}>
          <div className="glass-card-body" style={{ textAlign: 'center', padding: 32 }}>
            <Icon icon="lucide:inbox" style={{ fontSize: '1.6rem', color: 'var(--text-faint)' }}></Icon>
            <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>No applications found for this email.</p>
          </div>
        </div>
      )}

      {apps && apps.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
            <Icon icon="lucide:folder-open" style={{ color: 'var(--brand-primary)' }}></Icon>
            Your Applications ({apps.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {apps.data.map(app => (
              <div key={app.id} className="glass-panel card-hover fade-in-up" style={{ borderRadius: 'var(--radius-lg)', padding: 20, border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)' }}>
                      <Icon icon="lucide:briefcase" style={{ color: 'var(--brand-primary)' }}></Icon>
                      {app.job_title}
                    </h4>
                    <p style={{ margin: '4px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      <Icon icon="lucide:calendar" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon>
                      Applied: {new Date(app.created_at).toLocaleDateString()}
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
                        <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isCompleted ? 'var(--success)' : isActive ? 'var(--brand-primary)' : isRejected ? 'var(--error)' : 'rgba(255,255,255,0.06)',
                            border: isCompleted || isActive ? 'none' : '1px solid var(--border-glass)',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1, marginBottom: 6,
                          }}>
                            <Icon icon={ isCompleted ? 'lucide:check' : isRejected ? 'lucide:x' : stepIcons[step] } style={{ fontSize: '0.75rem' }}></Icon>
                          </div>
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Screening Results */}
                {app.screening && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Icon icon="lucide:scan-search" style={{ color: 'var(--brand-primary)', fontSize: '1rem' }}></Icon>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Screening Result</span>
                      <span className={`glass-badge glass-badge-${screeningLabel(app.screening.overall_status).color}`}>
                        <Icon icon={screeningLabel(app.screening.overall_status).icon} style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon>
                        {screeningLabel(app.screening.overall_status).text}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 8 }}>
                      Requirements met: {app.screening.requirements_met} / {app.screening.requirements_total}
                    </div>
                    {app.screening.requirement_results && (
                      <div style={{ fontSize: '0.8rem' }}>
                        {app.screening.requirement_results.map((r, i) => {
                          const labelMap = { education_level: 'Education', experience_years: 'Experience', required_skills: 'Skills', required_certs: 'Certifications' };
                          const isMet = r.status !== 'rejected';
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <Icon icon={isMet ? 'lucide:check' : 'lucide:x'} style={{ color: isMet ? 'var(--success)' : 'var(--error)', fontSize: '0.7rem' }}></Icon>
                              <span style={{ color: 'var(--text-muted)' }}>{labelMap[r.requirement] || r.requirement}:</span>
                              <span style={{ color: isMet ? 'var(--success)' : 'var(--error)', fontWeight: 500 }}>
                                {r.requirement === 'education_level' ? EDU_LABEL[r.provided] || r.provided
                                  : r.requirement === 'experience_years' ? EXP_LABEL[r.provided] || r.provided
                                  : r.provided}
                              </span>
                              {!isMet && r.expected && (
                                <span style={{ color: 'var(--text-faint)' }}>
                                  (required: {r.requirement === 'education_level' ? EDU_LABEL[r.expected] || r.expected
                                    : r.requirement === 'experience_years' ? EXP_LABEL[r.expected] || r.expected
                                    : r.expected})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Candidate Details */}
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  <span><Icon icon="lucide:mail" style={{ marginRight: 4, fontSize: '0.65rem' }}></Icon>{app.email}</span>
                  {app.phone && <span><Icon icon="lucide:phone" style={{ marginRight: 4, fontSize: '0.65rem' }}></Icon>{app.phone}</span>}
                  <span><Icon icon="lucide:user" style={{ marginRight: 4, fontSize: '0.65rem' }}></Icon>{app.name}</span>
                </div>

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
                            {new Date(h.created_at).toLocaleDateString()}
                          </span>
                          <span className={`glass-badge glass-badge-neutral`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>{h.stage}</span>
                          <span style={{ color: 'var(--text-dim)' }}>{h.note || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
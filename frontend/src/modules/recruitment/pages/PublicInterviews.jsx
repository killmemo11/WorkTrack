import { useState } from 'react';
import Icon from '../../../shared/components/Icon';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PublicInterviews() {
  const [email, setEmail] = useState('');
  const [interviews, setInterviews] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [responding, setResponding] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const navigate = useNavigate();

  const loadInterviews = async (e) => {
    if (e) e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      const res = await axios.get(`/api/interviews/${encodeURIComponent(email)}`);
      setInterviews(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load interviews');
      setInterviews(null);
    } finally {
      setLoading(false);
    }
  };

  const respond = async (interviewId, status) => {
    setResponding(interviewId);
    try {
      await axios.put('/api/interviews/respond', { interview_id: interviewId, email, status });
      await loadInterviews();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to respond');
    }
    setResponding(null);
  };

  const openMeeting = (iv) => {
    if (iv.meeting_link && !iv.meeting_link.includes('meet.jit.si')) {
      window.open(iv.meeting_link, '_blank');
      return;
    }
    setMeeting(iv);
  };

  const closeMeeting = () => {
    setMeeting(null);
  };

  const isPast = (date) => new Date(date) < new Date();

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
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/track')}>
          <Icon icon="lucide:search"></Icon> Track
        </button>
        <button className="glass-btn glass-btn-primary">
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
          <Icon icon="lucide:video" style={{ fontSize: '1.4rem', color: '#fff' }}></Icon>
        </div>
        <h1 style={{ color: 'var(--text-primary)' }}>My Interviews</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>View and manage your interview invitations</p>
      </div>

      <div className="glass-card fade-in-up delay-1" style={{ marginTop: 24 }}>
        <div className="glass-card-body">
          {error && (
            <div className="glass-alert glass-alert-danger" role="alert">
              <Icon icon="lucide:alert-circle"></Icon> {error}
            </div>
          )}

          <form onSubmit={loadInterviews} style={{ display: 'flex', gap: 12 }}>
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
              {loading ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }}></div> Searching...</> : <><Icon icon="lucide:search"></Icon> Find Interviews</>}
            </button>
          </form>
        </div>
      </div>

      {interviews && interviews.length === 0 && (
        <div className="glass-card fade-in-up" style={{ marginTop: 16 }}>
          <div className="glass-card-body" style={{ textAlign: 'center', padding: 32 }}>
            <Icon icon="lucide:calendar-x" style={{ fontSize: '1.6rem', color: 'var(--text-faint)' }}></Icon>
            <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>No interviews found for this email.</p>
          </div>
        </div>
      )}

      {interviews && interviews.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {interviews.map(iv => {
            const dt = new Date(iv.interview_date);
            const past = isPast(iv.interview_date);
            const cs = iv.candidate_status || 'pending';

            return (
              <div key={iv.id} className="glass-panel card-hover fade-in-up" style={{ borderRadius: 'var(--radius-lg)', padding: 20, border: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: iv.type === 'online' ? 'rgba(99,102,241,0.12)' : 'rgba(245,158,11,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon icon={iv.type === 'online' ? 'lucide:monitor' : 'lucide:building'} style={{ color: iv.type === 'online' ? 'var(--brand-primary)' : 'var(--warning)' }}></Icon>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{iv.job_title || 'Interview'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {dt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' \u00b7 '}
                        {dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {' \u00b7 '}
                        {iv.duration} min
                      </div>
                    </div>
                  </div>
                  <div>
                    {cs === 'accepted' && <span className="glass-badge glass-badge-success"><Icon icon="lucide:check" style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon> Accepted</span>}
                    {cs === 'declined' && <span className="glass-badge glass-badge-danger"><Icon icon="lucide:x" style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon> Declined</span>}
                    {cs === 'pending' && <span className="glass-badge glass-badge-warning"><Icon icon="lucide:clock" style={{ marginRight: 2, fontSize: '0.65rem' }}></Icon> Pending</span>}
                  </div>
                </div>

                {/* Details */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  {iv.type === 'online' ? (
                    <p><Icon icon="lucide:monitor" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon> Online{iv.meeting_platform ? ` \u2014 ${iv.meeting_platform}` : ''}</p>
                  ) : (
                    <>
                      {iv.location_name && <p><Icon icon="lucide:map-pin" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon> {iv.location_name}</p>}
                      {iv.location_address && <p style={{ color: 'var(--text-faint)', marginLeft: 16 }}>{iv.location_address}</p>}
                      {iv.dress_code && <p><Icon icon="lucide:shirt" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon> Dress code: {iv.dress_code}</p>}
                      {iv.what_to_bring && <p><Icon icon="lucide:backpack" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon> Bring: {iv.what_to_bring}</p>}
                      {iv.map_link && <p><a href={iv.map_link} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)' }}><Icon icon="lucide:map" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon> View on Map</a></p>}
                    </>
                  )}
                  {iv.interviewer && <p><Icon icon="lucide:user" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon> Interviewer: {iv.interviewer}</p>}
                  {iv.notes && <p><Icon icon="lucide:file-text" style={{ marginRight: 4, fontSize: '0.7rem' }}></Icon> {iv.notes}</p>}
                </div>

                {/* Actions */}
                {cs === 'pending' && !past && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                    <button className="glass-btn glass-btn-sm glass-btn-success" disabled={responding === iv.id}
                      onClick={() => respond(iv.id, 'accepted')}>
                      {responding === iv.id ? '...' : <><Icon icon="lucide:check"></Icon> Accept</>}
                    </button>
                    <button className="glass-btn glass-btn-sm glass-btn-danger" disabled={responding === iv.id}
                      onClick={() => respond(iv.id, 'declined')}>
                      {responding === iv.id ? '...' : <><Icon icon="lucide:x"></Icon> Decline</>}
                    </button>
                    {iv.type === 'online' && iv.meeting_link && (
                      <button className="glass-btn glass-btn-sm glass-btn-primary" onClick={() => openMeeting(iv)} style={{ marginLeft: 'auto' }}>
                        <Icon icon="lucide:video"></Icon> Join Meeting
                      </button>
                    )}
                  </div>
                )}
                {cs === 'accepted' && iv.type === 'online' && iv.meeting_link && !past && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)' }}>
                    <button className="glass-btn glass-btn-primary" onClick={() => openMeeting(iv)}>
                      <Icon icon="lucide:video"></Icon> Join Meeting
                    </button>
                  </div>
                )}
                {cs === 'accepted' && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--success)' }}><Icon icon="lucide:check-circle"></Icon> You accepted this interview</div>}
                {cs === 'declined' && <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--error)' }}><Icon icon="lucide:x-circle"></Icon> You declined this interview</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Meeting Room Modal */}
      {meeting && (
        <div className="glass-modal-overlay" onClick={closeMeeting}>
          <div className="glass-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, width: '90%' }}>
            <div className="glass-modal-header">
              <h3 className="glass-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon icon="lucide:video" style={{ color: 'var(--success)' }}></Icon>
                Meeting — {meeting.job_title || 'Interview'}
              </h3>
              <button className="glass-modal-close" onClick={closeMeeting}><Icon icon="lucide:x" /></button>
            </div>
            <div style={{ height: 480, background: '#1a1a2e', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', overflow: 'hidden' }}>
              <iframe
                src={(meeting.meeting_link || `https://meet.jit.si/wfh-interview-${Date.now()}`) + '#userInfo.displayName="Candidate"'}
                allow="camera; microphone; fullscreen; display-capture"
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Meeting Room"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
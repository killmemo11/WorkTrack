// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
import Icon from '../../../shared/components/Icon';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MasterSelect from '../../../shared/components/MasterSelect';

const EDU_LEVELS = [
  { value: '', label: '— Select —' },
  { value: 'high_school', label: 'High School' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'associate', label: 'Associate Degree' },
  { value: 'bachelor', label: 'Bachelor\'s Degree' },
  { value: 'master', label: 'Master\'s Degree' },
  { value: 'phd', label: 'PhD / Doctorate' },
];

const EXP_OPTIONS = [
  { value: '', label: '— Select —', rank: 0 },
  { value: '0-1', label: 'Less than 1 year', rank: 1 },
  { value: '1-2', label: '1–2 years', rank: 2 },
  { value: '2-3', label: '2–3 years', rank: 3 },
  { value: '3-5', label: '3–5 years', rank: 4 },
  { value: '5-7', label: '5–7 years', rank: 5 },
  { value: '7-10', label: '7–10 years', rank: 6 },
  { value: '10-15', label: '10–15 years', rank: 7 },
  { value: '15-20', label: '15–20 years', rank: 8 },
  { value: '20+', label: 'More than 20 years', rank: 9 },
];

export default function PublicApply() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job');
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [jobTitle, setJobTitle] = useState('');
  const [technical, setTechnical] = useState(false);
  const [jobMinReqs, setJobMinReqs] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', cover: '' });
  const [educationLevel, setEducationLevel] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [skills, setSkills] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/jobs/active')
      .then(res => {
        setJobs(res.data);
        if (jobId) {
          const match = res.data.find(j => String(j.id) === jobId);
          if (match) {
            setJobTitle(match.title);
            setTechnical(!!match.technical);
            setSelectedJobId(jobId);
            setJobMinReqs(match.min_requirements || null);
          }
        }
      })
      .catch(() => {})
      .finally(() => setJobsLoading(false));
  }, [jobId]);

  const handleJobChange = (e) => {
    const id = e.target.value;
    setSelectedJobId(id);
    const match = jobs.find(j => String(j.id) === id);
    setJobTitle(match ? match.title : '');
    setTechnical(match ? !!match.technical : false);
    setJobMinReqs(match?.min_requirements || null);
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jobTitle) return setError('Please select a position');
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/apply', {
        ...form,
        job_id: selectedJobId || null,
        job_title: jobTitle,
        technical,
        source: 'Portal',
        education_level: educationLevel || null,
        experience_years: experienceYears || null,
        skills: skills.length > 0 ? skills : null,
        certifications: certifications.length > 0 ? certifications : null,
      });
      setSuccess(res.data);
      setForm({ name: '', email: '', phone: '', cover: '' });
      setEducationLevel('');
      setExperienceYears('');
      setSkills([]);
      setCertifications([]);
      setSelectedJobId('');
      setJobTitle('');
      setTechnical(false);
      setJobMinReqs(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
        <div className="glass-card fade-in-up"><div className="glass-card-body" style={{ padding: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
          }}>
            <Icon icon="lucide:check-circle" style={{ fontSize: '2rem', color: 'var(--success)' }}></Icon>
          </div>
          <h2 style={{ color: 'var(--text-primary)' }}>Application Submitted!</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>
            Thank you for applying to <strong style={{ color: 'var(--brand-primary)' }}>{jobTitle}</strong>.
          </p>
          <p>Your reference number is <strong className="glass-badge glass-badge-success">{success.ref}</strong></p>
          {success.email_sent && <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}><Icon icon="lucide:mail" style={{ marginRight: 4 }}></Icon>A confirmation email has been sent to {form.email}.</p>}
          <button className="glass-btn glass-btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate('/careers')}>
            <Icon icon="lucide:arrow-left"></Icon> Back to Jobs
          </button>
        </div></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }} className="fade-in-up">
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--brand-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
        }}>
          <Icon icon="lucide:send" style={{ fontSize: '1.4rem', color: '#fff' }}></Icon>
        </div>
        <h1 style={{ textAlign: 'center', color: 'var(--text-primary)' }}>Apply for a Position</h1>
      </div>

      {/* Careers Nav */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, justifyContent: 'center' }} className="fade-in-up">
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers')}>
          <Icon icon="lucide:briefcase"></Icon> Jobs
        </button>
        <button className="glass-btn glass-btn-primary">
          <Icon icon="lucide:send"></Icon> Apply
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/track')}>
          <Icon icon="lucide:search"></Icon> Track
        </button>
        <button className="glass-btn glass-btn-ghost" onClick={() => navigate('/careers/interviews')}>
          <Icon icon="lucide:video"></Icon> Interviews
        </button>
      </div>

      <div className="glass-card fade-in-up delay-1" style={{ marginTop: 24 }}>
        <div className="glass-card-body" style={{ padding: 32 }}>
          {error && (
            <div className="glass-alert glass-alert-danger" role="alert">
              <Icon icon="lucide:alert-circle"></Icon> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="glass-form-group">
              <label className="glass-label">Position *</label>
              {jobsLoading ? (
                <div className="glass-input" style={{ color: 'var(--text-faint)' }}>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }}></div>
                  Loading positions...
                </div>
              ) : (
                <select className="glass-select" value={selectedJobId} onChange={handleJobChange} required>
                  <option value="">— Select a position —</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="glass-form-group">
              <label className="glass-label">Full Name *</label>
              <input name="name" className="glass-input" value={form.name} onChange={handleChange} required />
            </div>

            <div className="glass-form-group">
              <label className="glass-label">Email *</label>
              <input name="email" type="email" className="glass-input" value={form.email} onChange={handleChange} required />
            </div>

            <div className="glass-form-group">
              <label className="glass-label">Phone</label>
              <input name="phone" type="tel" className="glass-input" value={form.phone} onChange={handleChange} />
            </div>

            <div className="glass-card" style={{ background: 'rgba(24,24,27,0.4)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon icon="lucide:award"></Icon> Qualifications
              </div>

              <div className="glass-form-group">
                <label className="glass-label">Education Level</label>
                <select className="glass-select" value={educationLevel} onChange={e => setEducationLevel(e.target.value)}>
                  {EDU_LEVELS.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                </select>
              </div>

              <div className="glass-form-group">
                <label className="glass-label">Years of Experience</label>
                <select className="glass-select" value={experienceYears} onChange={e => setExperienceYears(e.target.value)}>
                  {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="glass-form-group">
                <label className="glass-label">Skills</label>
                <MasterSelect type="skills" value={skills} onChange={setSkills} placeholder="Search and select your skills..." usePublicApi />
              </div>

              <div className="glass-form-group" style={{ margin: 0 }}>
                <label className="glass-label">Certifications</label>
                <MasterSelect type="certs" value={certifications} onChange={setCertifications} placeholder="Search and select your certifications..." usePublicApi />
              </div>
            </div>

            <div className="glass-form-group">
              <label className="glass-label">Cover Note</label>
              <textarea name="cover" className="glass-textarea" rows={4} value={form.cover} onChange={handleChange} />
            </div>

            <button type="submit" className="glass-btn glass-btn-primary glass-btn-lg glass-btn-full" disabled={loading || jobsLoading} style={{ marginTop: 8 }}>
              {loading ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Submitting...</> : <><Icon icon="lucide:send"></Icon> Submit Application</>}
            </button>
          </form>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <a href="/careers" style={{ color: 'var(--brand-primary)', textDecoration: 'none' }}>
          <Icon icon="lucide:arrow-left" style={{ marginRight: 4 }}></Icon> Back to all jobs
        </a>
      </p>
    </div>
  );
}

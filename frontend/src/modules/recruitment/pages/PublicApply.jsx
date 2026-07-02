// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useState, useEffect } from 'react';
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
        experience_years: experienceYears ? parseInt(experienceYears, 10) : null,
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
        <div className="card"><div className="card-body" style={{ padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
          <h2>Application Submitted!</h2>
          <p style={{ color: '#666', marginTop: 8 }}>
            Thank you for applying to <strong>{jobTitle}</strong>.
          </p>
          <p>Your reference number is <strong>{success.ref}</strong></p>
          {success.email_sent && <p style={{ color: '#666', fontSize: '0.9rem' }}>A confirmation email has been sent to {form.email}.</p>}
          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/careers')}>Back to Jobs</button>
        </div></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ textAlign: 'center', color: '#1a1a2e' }}>Apply for a Position</h1>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-body" style={{ padding: 32 }}>
          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Position *</label>
              {jobsLoading ? (
                <div className="form-control" style={{ color: '#999' }}>Loading positions...</div>
              ) : (
                <select className="form-control" value={selectedJobId} onChange={handleJobChange} required style={{ width: '100%' }}>
                  <option value="">— Select a position —</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <input name="name" className="form-control" value={form.name} onChange={handleChange} required style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input name="email" type="email" className="form-control" value={form.email} onChange={handleChange} required style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label>Phone</label>
              <input name="phone" type="tel" className="form-control" value={form.phone} onChange={handleChange} style={{ width: '100%' }} />
            </div>

            {/* ── Qualification Fields ── */}
            {selectedJobId && jobMinReqs && (
              <div style={{ padding: '12px 14px', background: '#fff8e1', borderRadius: 8, marginBottom: 16, fontSize: 13, border: '1px solid #ffe082' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🎯</span> This position requires:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {jobMinReqs.min_education_level && <span style={{ background: '#fff', padding: '2px 8px', borderRadius: 6, border: '1px solid #ffe082' }}>🎓 {EDU_LEVELS.find(e => e.value === jobMinReqs.min_education_level)?.label || jobMinReqs.min_education_level}</span>}
                  {jobMinReqs.min_experience_years != null && <span style={{ background: '#fff', padding: '2px 8px', borderRadius: 6, border: '1px solid #ffe082' }}>📅 {jobMinReqs.min_experience_years}+ years</span>}
                  {(jobMinReqs.required_skills || []).map(s => <span key={s} style={{ background: '#e3f2fd', padding: '2px 8px', borderRadius: 6 }}>⚙️ {s}</span>)}
                  {(jobMinReqs.required_certs || []).map(c => <span key={c} style={{ background: '#fce4ec', padding: '2px 8px', borderRadius: 6 }}>📜 {c}</span>)}
                </div>
              </div>
            )}

            <div style={{ background: '#f8f9fc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: '#1a1a2e' }}>Qualifications</div>

              <div className="form-group">
                <label>Education Level</label>
                <select className="form-control" value={educationLevel} onChange={e => setEducationLevel(e.target.value)} style={{ width: '100%' }}>
                  {EDU_LEVELS.map(el => <option key={el.value} value={el.value}>{el.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Years of Experience</label>
                <select className="form-control" value={experienceYears} onChange={e => setExperienceYears(e.target.value)} style={{ width: '100%' }}>
                  {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Skills</label>
                <MasterSelect type="skills" value={skills} onChange={setSkills} placeholder="Search and select your skills..." />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Certifications</label>
                <MasterSelect type="certs" value={certifications} onChange={setCertifications} placeholder="Search and select your certifications..." />
              </div>
            </div>

            <div className="form-group">
              <label>Cover Note</label>
              <textarea name="cover" className="form-control" rows={4} value={form.cover} onChange={handleChange} style={{ width: '100%', resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || jobsLoading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <a href="/careers" style={{ color: '#4a6cf7' }}>&larr; Back to all jobs</a>
      </p>
    </div>
  );
}
